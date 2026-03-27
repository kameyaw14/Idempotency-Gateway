import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../utils/env.js";
import { authService } from "../services/authService.js";

const JWT_SECRET = env.JWT_SECRET!;

export interface AuthenticatedRequest extends Request {
  user?: { id: string; email: string; createdAt: any; name: any };
}

export const authMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ success: false, message: "Access token required." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
    };
    const user = authService.getUserById(decoded.id);

    if (!user) {
      console.log(
        "⚠️ Token valid but user not found in store. ID:",
        decoded.id,
      );
      return res
        .status(401)
        .json({ success: false, message: "Invalid token." });
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    };
    next();
  } catch (error) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired token." });
  }
};
