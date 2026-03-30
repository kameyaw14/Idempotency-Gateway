import { Request, Response, NextFunction } from "express";
import { createHash } from "node:crypto";
import { paymentService } from "../services/paymentService.js";

export const idempotencyMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const idempotencyKey = (req.headers["idempotency-key"] as string)?.trim();

  if (!idempotencyKey) {
    return res.status(400).json({
      success: false,
      message: "Idempotency-Key header is required for this endpoint.",
    });
  }

  if (idempotencyKey.length < 8 || idempotencyKey.length > 128) {
    return res.status(400).json({
      success: false,
      message: "Invalid Idempotency-Key format.",
    });
  }

  const bodyStr = JSON.stringify(req.body);
  const requestHash = createHash("sha256").update(bodyStr).digest("hex");

  try {
    const result = await paymentService.checkIdempotency(
      idempotencyKey,
      requestHash,
      req.body,
    );

    if (result.cached) {
      res.set("X-Cache-Hit", "true");
      return res.status(result.status!).json(result.body);
    }

    if (result.conflict) {
      console.warn(
        `⚠️  Idempotency conflict detected for key: ${idempotencyKey}`,
      );
      return res.status(409).json({
        success: false,
        message: "Idempotency key already used for a different request body.",
      });
    }

    if (result.inFlight && result.promise) {
      (req as any).idempotencyPromise = result.promise;
      next();
      return;
    }

    (req as any).idempotencyKey = idempotencyKey;
    (req as any).requestHash = requestHash;

    next();
  } catch (error) {
    console.error("Idempotency middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
