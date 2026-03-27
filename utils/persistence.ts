import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { SerializedUsers, StoredPayment } from "../types/types.js";

const DATA_DIR = join(process.cwd(), "data");

const USERS_FILE = join(DATA_DIR, "users.json");
const PAYMENTS_FILE = join(DATA_DIR, "payments.json");

export const persistence = {
  async ensureDataDir() {
    try {
      await mkdir(DATA_DIR, { recursive: true });
    } catch (err) {
      console.log("Folder already exists.");
    }
  },

  async loadUsers(): Promise<SerializedUsers> {
    try {
      const data = await readFile(USERS_FILE, "utf8");
      return JSON.parse(data) as SerializedUsers;
    } catch (err: any) {
      if (err.code === "ENOENT") {
        return [];
      }
      console.error("Failed to load users from disk:", err);
      return [];
    }
  },

  async saveUsers(users: SerializedUsers): Promise<void> {
    try {
      await writeFile(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
      console.log(`✅ Users saved to disk (${users.length} users)`);
    } catch (err) {
      console.error("Failed to save users to disk:", err);
    }
  },

  async loadPayments(): Promise<StoredPayment[]> {
    try {
      const data = await readFile(PAYMENTS_FILE, "utf8");
      return JSON.parse(data) as StoredPayment[];
    } catch (err: any) {
      if (err.code === "ENOENT") {
        return [];
      }
      console.error("Failed to load payments from disk:", err);
      return [];
    }
  },

  async savePayments(payments: StoredPayment[]): Promise<void> {
    try {
      await writeFile(PAYMENTS_FILE, JSON.stringify(payments, null, 2), "utf8");
      console.log(`✅ Payments saved to disk (${payments.length} records)`);
    } catch (err) {
      console.error("Failed to save payments to disk:", err);
    }
  },
};
