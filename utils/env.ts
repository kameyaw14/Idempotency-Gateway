//utils/env.ts
import dotenv from "dotenv";

dotenv.config();

export const env = {
  // Basic
  SYSTEM_NAME: process.env.SYSTEM_NAME?.trim(),
  PORT: Number(process.env.PORT) || 3100,
  NODE_ENV: process.env.NODE_ENV?.trim() || "development",
  MODE: process.env.MODE?.trim() || "development",

  // URLs
  SERVER_URL: process.env.SERVER_URL?.trim(),
  CLIENT_URL: process.env.CLIENT_URL?.trim(),

  //jwt
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
} as const;
