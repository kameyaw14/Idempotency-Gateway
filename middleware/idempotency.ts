import { Request, Response, NextFunction } from "express";
import { createHash } from "node:crypto";
import { paymentService } from "../services/paymentService.js";
import { RequestWithId } from "./requestId.js";
import { logAudit } from "../utils/auditLogger.js";

export const idempotencyMiddleware = async (
  req: RequestWithId,
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
    await logAudit({
      requestId: req.requestId!,
      userId: (req as any).user?.id || null,
      eventType: "IDEMPOTENCY_CHECK",
      idempotencyKey,
      requestHash,
      outcome: "success",
      details: { action: "starting_idempotency_check" },
    });

    const result = await paymentService.checkIdempotency(
      idempotencyKey,
      requestHash,
      req.body,
    );

    if (result.cached) {
      await logAudit({
        requestId: req.requestId!,
        userId: (req as any).user?.id || null,
        eventType: "CACHE_HIT",
        idempotencyKey,
        requestHash,
        outcome: "cached",
        details: { message: "Returning cached response" },
      });

      res.set("X-Cache-Hit", "true");
      return res.status(result.status!).json(result.body);
    }

    if (result.conflict) {
      await logAudit({
        requestId: req.requestId!,
        userId: (req as any).user?.id || null,
        eventType: "CONFLICT_REJECTED",
        idempotencyKey,
        requestHash,
        outcome: "conflict",
        details: { message: "Different request body for same key" },
      });

      console.warn(
        `⚠️  Idempotency conflict detected for key: ${idempotencyKey}`,
      );
      return res.status(409).json({
        success: false,
        message: "Idempotency key already used for a different request body.",
      });
    }

    if (result.inFlight && result.promise) {
      await logAudit({
        requestId: req.requestId!,
        userId: (req as any).user?.id || null,
        eventType: "IN_FLIGHT_WAIT",
        idempotencyKey,
        requestHash,
        outcome: "in_flight",
        details: { message: "Waiting for in-flight request to complete" },
      });

      (req as any).idempotencyPromise = result.promise;
      next();
      return;
    }

    await logAudit({
      requestId: req.requestId!,
      userId: (req as any).user?.id || null,
      eventType: "PAYMENT_PROCESSING_STARTED",
      idempotencyKey,
      requestHash,
      outcome: "success",
      details: { amount: req.body.amount, currency: req.body.currency },
    });

    (req as any).idempotencyKey = idempotencyKey;
    (req as any).requestHash = requestHash;

    next();
  } catch (error) {
    await logAudit({
      requestId: req.requestId || "unknown",
      userId: (req as any).user?.id || null,
      eventType: "PAYMENT_ERROR",
      idempotencyKey,
      outcome: "error",
      details: { error: "Idempotency middleware failed" },
    });

    console.error("Idempotency middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
