import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  User,
} from "../types/types.js";
import { env } from "../utils/env.js";
import { generateAccessToken } from "../utils/generateTokens.js";
import { persistence } from "../utils/persistence.js";

const users = new Map<string, User>(); // In-memory store: key = email

function mapToSerialized(): any[] {
  return Array.from(users.values()).map((user) => ({
    ...user,
    createdAt: user.createdAt.toISOString(),
  }));
}

function serializedToMap(serialized: any[]) {
  users.clear();
  serialized.forEach((item) => {
    users.set(item.email, {
      ...item,
      createdAt: new Date(item.createdAt),
    });
  });
}

export const authService = {
  async init() {
    await persistence.ensureDataDir();
    const serialized = await persistence.loadUsers();
    serializedToMap(serialized);
    console.log(`✅ Loaded ${users.size} users from disk`);
  },

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const lowerEmail = data.email.toLowerCase().trim();

    if (users.has(lowerEmail)) {
      return {
        success: false,
        message: "User with this email already exists.",
      };
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(data.password, salt);

    const newUser: User = {
      id: `user_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      name: data.name.trim(),
      email: lowerEmail,
      password: hashedPassword,
      createdAt: new Date(),
    };

    users.set(lowerEmail, newUser);

    await persistence.saveUsers(mapToSerialized());

    return {
      success: true,
      message: "Account created successfully. You can now log in.",
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        createdAt: newUser.createdAt,
      },
    };
  },

  async login(data: LoginRequest): Promise<AuthResponse> {
    const user = users.get(data.email.toLowerCase().trim());
    if (!user) {
      return { success: false, message: "Invalid credentials." };
    }

    const isMatch = await bcrypt.compare(data.password, user.password);
    if (!isMatch) {
      return { success: false, message: "Invalid credentials." };
    }

    const token = generateAccessToken(user.id);

    return {
      success: true,
      message: "Login successful.",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
    };
  },

  getUserById(id: string): User | undefined {
    if (!id) return undefined;
    return Array.from(users.values()).find((u) => u.id === id);
  },
};
