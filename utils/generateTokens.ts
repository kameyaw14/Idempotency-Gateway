// utils/generateTokens.ts
import jwt from "jsonwebtoken";
import { env } from "../utils/env.js";

export const generateAccessToken = (userId: string): string => {
  return jwt.sign({ id: userId }, env.JWT_SECRET!, {
    expiresIn: "7d",
  });
};
