// routes/paymentRoutes.ts
import { Router } from "express";
import { paymentController } from "../controllers/paymentController.js";
import { authMiddleware } from "../middleware/verifyToken.js";

const paymentRouter = Router();

paymentRouter.post(
  "/process-payment",authMiddleware,paymentController.processPayment);

export default paymentRouter;
