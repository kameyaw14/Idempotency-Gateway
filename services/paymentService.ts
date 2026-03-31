// services/paymentService.ts
import { createHash, randomBytes } from "node:crypto";

import {
  PaymentSuccessResponse,
  IdempotencyRecord,
  StoredPayment,
  IdempotencyCheckResult,
} from "../types/types.js";
import { ProcessPaymentRequest } from "../zodSchemas/paymentShema.js";
import { persistence } from "../utils/persistence.js";
import { logAudit } from "../utils/auditLogger.js";

const payments = new Map<string, IdempotencyRecord>();

const inFlight = new Map<string, Promise<any>>();

function createRequestHash(body: ProcessPaymentRequest): string {
  const bodyStr = JSON.stringify(body);
  return createHash("sha256").update(bodyStr).digest("hex");
}

export const paymentService = {
  async init() {
    await persistence.ensureDataDir();
    const stored = await persistence.loadPayments();

    payments.clear();
    stored.forEach((item: StoredPayment) => {
      payments.set(item.idempotencyKey, {
        statusCode: item.statusCode,
        body: item.body,
        requestHash: item.requestHash,
        originalBody: item.originalBody,
        timestamp: new Date(item.timestamp),
      });
    });

    console.log(`✅ Loaded ${payments.size} payment records from disk`);
  },

  async checkIdempotency(
    idempotencyKey: string,
    requestHash: string,
    originalBody: any,
  ): Promise<IdempotencyCheckResult> {
    const key = idempotencyKey.trim();
    const existing = payments.get(key);

    if (existing) {
      if (existing.requestHash === requestHash) {
        console.log(`♻️  Cache hit for idempotency key: ${key}`);
        return {
          cached: true,
          conflict: false,
          status: existing.statusCode,
          body: existing.body,
        };
      } else {
        // User Story 3: Same key but different body → conflict!
        console.warn(`⚠️  Idempotency conflict detected for key: ${key}`);
        return { cached: false, conflict: true };
      }
    }

    const pendingPromise = inFlight.get(key);
    if (pendingPromise) {
      console.log(`⏳ In-flight request waiting for key: ${key}`);
      return {
        cached: false,
        conflict: false,
        inFlight: true,
        promise: pendingPromise,
      };
    }

    return { cached: false, conflict: false };
  },

  async processPayment(
    idempotencyKey: string,
    body: ProcessPaymentRequest,
    requestId: string,
    userId: string | null,
  ): Promise<{
    statusCode: number;
    body: PaymentSuccessResponse | any;
    cacheHit: boolean;
  }> {
    const key = idempotencyKey.trim();

    const existing = payments.get(key);
    if (existing) {
      if (existing.requestHash !== createRequestHash(body)) {
        throw new Error("Idempotency conflict detected in processPayment");
      }
      console.log(`♻️  Cache hit for idempotency key: ${key}`);

      await logAudit({
        requestId,
        userId,
        eventType: "CACHE_HIT",
        idempotencyKey: key,
        requestHash: existing.requestHash,
        outcome: "cached",
        details: { message: "Cache hit in processPayment" },
      });

      return {
        statusCode: existing.statusCode,
        body: existing.body as PaymentSuccessResponse,
        cacheHit: true,
      };
    }

    const processingPromise = (async () => {
      console.log(
        `🔄 Processing new payment for key: ${key} (amount: ${body.amount} ${body.currency})`,
      );

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const transactionId = `txn_1${randomBytes(8).toString("hex")}`;

      const responseBody: PaymentSuccessResponse = {
        success: true,
        message: `Charged ${body.amount} ${body.currency}`,
        transactionId,
        amount: body.amount,
        currency: body.currency,
      };

      const record: IdempotencyRecord = {
        statusCode: 201,
        body: responseBody,
        requestHash: createRequestHash(body),
        originalBody: body,
        timestamp: new Date(),
      };

      payments.set(key, record);

      const storedPayments = Array.from(payments.entries()).map(([k, v]) => ({
        idempotencyKey: k,
        requestHash: v.requestHash,
        statusCode: v.statusCode,
        body: v.body,
        originalBody: v.originalBody,
        timestamp: v.timestamp.toISOString(),
      }));

      await persistence.savePayments(storedPayments);

      //  Clean up in-flight map once done
      inFlight.delete(key);

      await logAudit({
        requestId,
        userId,
        eventType: "PAYMENT_SUCCESS",
        idempotencyKey: key,
        requestHash: record.requestHash,
        outcome: "success",
        details: {
          amount: body.amount,
          currency: body.currency,
          transactionId,
          processingTimeMs: 2000,
        },
      });

      return { statusCode: 201, body: responseBody, cacheHit: false };
    })();

    inFlight.set(key, processingPromise);

    return processingPromise;
  },
};
