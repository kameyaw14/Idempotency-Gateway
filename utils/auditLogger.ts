// utils/auditLogger.ts
import pino from "pino";
import { randomUUID } from "node:crypto";
import { persistence } from "./persistence.js";
import { AuditLogEntry } from "../types/types.js";

const auditLogger = pino({
  level: process.env.MODE === "development" ? "debug" : "info",
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
  transport:
    process.env.MODE === "development"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
});

async function appendToAuditFile(entry: AuditLogEntry): Promise<void> {
  try {
    const currentLogs = await persistence.loadAudits();
    currentLogs.push(entry);
    await persistence.saveAudits(currentLogs);
  } catch (err) {
    console.error("Failed to save audit log to disk:", err);
  }
}

export const logAudit = async (
  entry: Omit<AuditLogEntry, "id" | "timestamp">,
): Promise<void> => {
  const fullEntry: AuditLogEntry = {
    id: `audit_${Date.now()}_${randomUUID().slice(0, 8)}`,
    timestamp: new Date().toISOString(),
    ...entry,
  };

  auditLogger.info(fullEntry);

  await appendToAuditFile(fullEntry);
};
