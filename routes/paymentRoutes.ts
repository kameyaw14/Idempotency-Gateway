// routes/paymentRoutes.ts
import { Router } from "express";
import { paymentController } from "../controllers/paymentController.js";
import { authMiddleware } from "../middleware/verifyToken.js";
import { idempotencyMiddleware } from "../middleware/idempotency.js";

const paymentRouter = Router();

paymentRouter.post(
  "/process-payment",
  authMiddleware,
  idempotencyMiddleware,
  paymentController.processPayment,
);

export default paymentRouter;
