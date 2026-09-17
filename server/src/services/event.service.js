import Event from "../model/event.model.js";

/**
 * Bulk-insert analytics events coming from the BROWSER.
 *
 * Events carrying a `dedupeKey` (today: `purchase`) are upserted with
 * $setOnInsert rather than inserted, because the server writes the same logical
 * event from the Razorpay webhook. Whoever gets there first creates the row;
 * the client never overwrites a row the server already wrote, since the server
 * copy is the authoritative one (resolved userId, full line items, real paid
 * amount). Without this, revenue would be counted twice for every prepaid order.
 *
 * `ordered: false` so a single malformed doc never aborts the whole batch.
 */
export async function storeEvents(events) {
  if (!Array.isArray(events) || events.length === 0) {
    return { inserted: 0 };
  }

  const plain = events.filter((e) => !e.dedupeKey);
  const keyed = events.filter((e) => e.dedupeKey);

  let inserted = 0;

  if (plain.length) {
    const docs = await Event.insertMany(plain, { ordered: false });
    inserted += docs.length;
  }

  if (keyed.length) {
    const res = await Event.bulkWrite(
      keyed.map((e) => ({
        updateOne: {
          filter: { dedupeKey: e.dedupeKey },
          update: { $setOnInsert: e },
          upsert: true,
        },
      })),
      { ordered: false },
    );
    inserted += res.upsertedCount || 0;
  }

  return { inserted };
}

/**
 * Write an event the SERVER is authoritative for (the webhook-side `purchase`).
 *
 * Unlike storeEvents this uses $set, so it overwrites a thinner row the browser
 * may have already written for the same dedupeKey — the server knows the real
 * captured amount, the resolved userId (including guest accounts created during
 * the webhook) and the full item list, none of which the browser reliably has.
 * Idempotent: replaying the same webhook rewrites one row instead of adding one.
 */
export async function storeAuthoritativeEvent(event) {
  if (!event?.dedupeKey) {
    throw new Error("storeAuthoritativeEvent requires a dedupeKey");
  }
  await Event.updateOne(
    { dedupeKey: event.dedupeKey },
    { $set: event },
    { upsert: true },
  );
  return { ok: true };
}

export default { storeEvents, storeAuthoritativeEvent };
