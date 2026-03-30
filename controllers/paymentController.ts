// controllers/paymentController.ts
import { Request, Response } from "express";
import { z } from "zod";
import { paymentService } from "../services/paymentService.js";
import { AuthenticatedRequest } from "../middleware/verifyToken.js";
import { PaymentSuccessResponse } from "../types/types.js";
import { processPaymentSchema } from "../zodSchemas/paymentShema.js";

export const paymentController = {
  async processPayment(req: AuthenticatedRequest, res: Response) {
    try {
      const idempotencyKey = req.headers["idempotency-key"] as
        | string
        | undefined;

      if (
        !idempotencyKey ||
        typeof idempotencyKey !== "string" ||
        idempotencyKey.trim().length === 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Idempotency-Key header is required for this endpoint.",
        });
      }

      const validatedData = processPaymentSchema.parse(req.body);

      const idempotencyPromise = (req as any).idempotencyPromise;
      let result;

      if (idempotencyPromise) {
        result = await idempotencyPromise;
        res.set("X-Processing", "true"); // Only on waited responses (as recommended)
      } else {
        result = await paymentService.processPayment(
          idempotencyKey,
          validatedData,
        );
      }

      if (result.cacheHit) {
        res.set("X-Cache-Hit", "true");
      }

      return res.status(result.statusCode).json(result.body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: error.issues.map((issue) => ({
            field: issue.path[0] || "unknown",
            message: issue.message,
          })),
        });
      }

      console.error("Error in processPayment:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  },
};
