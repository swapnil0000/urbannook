// We are using this cron job for keeping our order db collection safe and clean wrt to the statuses of the
// order which could be majorly CREATED , PAID , FAILED but we don't orders to be in created till the solar ecillpse
// so we are making sure either it should lie in b/w PAID or FAILED

import cron from "node-cron";
import Order from "../model/order.model.js";

const startOrderCleanupJob = () => {
  cron.schedule("0 * * * *", async () => {
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);

    try {
      const zombieOrders = await Order.find({
        status: { $in: ["CREATED", "PROCESSING"] },
        // ============================================================================
        // WHY ARE WE USING $lt (Less Than) INSTEAD OF $gt (Greater Than)?
        // Dates in MongoDB/JS are stored as numerical timestamps (milliseconds).
        // An older date is numerically SMALLER than a newer date.
        // Example: 1:00 PM is smaller than 1:30 PM.
        // Since we want to find orders that were created BEFORE our 30-min threshold,
        // their creation timestamp must be STRICTLY LESS THAN ($lt) 'thirtyMinsAgo'.
        // If we used $gt, it would target brand new orders made within the last 30 mins!
        // ============================================================================
        createdAt: { $lt: thirtyMinsAgo },
      })
        .select("orderId")
        .limit(20)
        .lean();
      if (zombieOrders.length === 0) {
        console.log(
          `[CRON] ${new Date().toLocaleString()}: No zombie orders found.`,
        );
        return;
      }

      // 2. Unki IDs ka ek array banao
      const orderIdsToFail = zombieOrders.map((order) => order.orderId);

      // 3. Ab un sabko ek saath update karo
      const result = await Order.updateMany(
        { orderId: { $in: orderIdsToFail } },
        {
          $set: {
            status: "FAILED",
            "payment.errorCode": "PAYMENT_TIMEOUT",
            "payment.errorDescription":
              "Order auto-cancelled after 30 mins of inactivity.",
          },
          $push: {
            statusHistory: {
              status: "FAILED",
              note: "System auto-cleanup: Payment window expired.",
              timestamp: new Date(),
            },
          },
        },
      );

      // 4. Ab aapke paas IDs bhi hain aur result bhi
      console.log(
        `[CRON] Success: Moved ${result.modifiedCount} orders to FAILED and Affected Order IDs: ${orderIdsToFail}`,
      );
    } catch (error) {
      console.error("[CRON ERROR]:", error);
    }
  });
};

export default startOrderCleanupJob;
