// routes/paymentRoutes.ts
import { Router } from "express";
import { paymentController } from "../controllers/paymentController.js";
import { authMiddleware } from "../middleware/verifyToken.js";
import { idempotencyMiddleware } from "../middleware/idempotency.js";
import { requestIdMiddleware } from "../middleware/requestId.js";
import { persistence } from "../utils/persistence.js";

const paymentRouter = Router();

paymentRouter.post(
  "/process-payment",
  requestIdMiddleware,
  authMiddleware,
  idempotencyMiddleware,
  paymentController.processPayment,
);

paymentRouter.get(
  "/audit",
  requestIdMiddleware,
  authMiddleware,
  async (req: any, res: any) => {
    try {
      const { key, userId } = req.query as { key?: string; userId?: string };

      const allAudits = await persistence.loadAudits();

      let filtered = allAudits;

      if (key) {
        filtered = filtered.filter((log: any) => log.idempotencyKey === key);
      }
      if (userId) {
        filtered = filtered.filter((log: any) => log.userId === userId);
      }

      return res.status(200).json({
        success: true,
        message: "Audit logs retrieved successfully.",
        count: filtered.length,
        audits: filtered,
        requestId: req.requestId,
      });
    } catch (error) {
      console.error("Audit endpoint error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  },
);

export default paymentRouter;
