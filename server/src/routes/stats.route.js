import { Router } from "express";
import Order from "../model/order.model.js";

const statsRouter = Router();

// Public endpoint - no auth required
statsRouter.get("/stats/public", async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments({
      status: { $in: ["delivered", "shipped", "confirmed", "processing"] },
    });
    return res.status(200).json({
      success: true,
      data: { totalOrders },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch stats",
    });
  }
});

export default statsRouter;
