// middleware/requestId.ts
import { Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";

export interface RequestWithId extends Request {
  requestId?: string;
}

export const requestIdMiddleware = (
  req: RequestWithId,
  res: Response,
  next: NextFunction,
) => {
  req.requestId = randomUUID();

  res.setHeader("X-Request-ID", req.requestId);

  next();
};
