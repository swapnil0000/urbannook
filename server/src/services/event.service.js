import Event from "../model/event.model.js";

/**
 * Bulk-insert analytics events.
 * `ordered: false` so a single malformed doc never aborts the whole batch.
 */
export async function storeEvents(events) {
  if (!Array.isArray(events) || events.length === 0) {
    return { inserted: 0 };
  }
  const docs = await Event.insertMany(events, { ordered: false });
  return { inserted: docs.length };
}

export default { storeEvents };
