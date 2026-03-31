export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt: Date;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: Omit<User, "password">;
}

export interface MeResponse {
  success: boolean;
  message: string;
  user: {
    id: string;
    name: string;
    email: string;
    createdAt: string;
  };
}

export type SerializedUsers = Array<{
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt: string;
}>;

export interface StoredPayment {
  idempotencyKey: string;
  requestHash: string;
  statusCode: number;
  body: any;
  originalBody: any;
  timestamp: string;
}

export interface IdempotencyCheckResult {
  cached: boolean;
  conflict: boolean;
  inFlight?: boolean;
  promise?: Promise<any>;
  status?: number;
  body?: any;
}

export interface ProcessPaymentRequestBody {
  amount: number;
  currency: string;
}

export interface PaymentSuccessResponse {
  success: boolean;
  message: string;
  transactionId: string;
  amount: number;
  currency: string;
}

export interface IdempotencyRecord {
  statusCode: number;
  body: any;
  requestHash: string;
  originalBody: any;
  timestamp: Date;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  requestId: string;
  userId: string | null;
  eventType:
    | "PAYMENT_PROCESSING_STARTED"
    | "CACHE_HIT"
    | "CONFLICT_REJECTED"
    | "IN_FLIGHT_WAIT"
    | "PAYMENT_SUCCESS"
    | "PAYMENT_ERROR"
    | "IDEMPOTENCY_CHECK";
  idempotencyKey?: string;
  requestHash?: string;
  outcome: "success" | "cached" | "conflict" | "in_flight" | "error";
  details?: Record<string, any>;
}
