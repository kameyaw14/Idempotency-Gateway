//config/checkEnv.ts

import { env } from "../utils/env.js";

const requiredVars = [
  "SYSTEM_NAME",
  "PORT",
  "NODE_ENV",
  "MODE",
  "SERVER_URL",
  "CLIENT_URL",
  "JWT_SECRET",
  "JWT_REFRESH_SECRET",
];

export function checkRequiredEnv() {
  const missing = [];

  for (const key of requiredVars) {
    if (!env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.error(
      "🚨🚨 MISSING ENVIRONMENT VARIABLES, SERVER CANNOT START 🚨🚨",
    );
    console.error("❌Missing:", missing.join(", "));
    console.error("❌Fix your .env file and restart, bro!");
    process.exit(1);
  }

  console.log("✅ All required env variables are present, let's ride bro!");
}
