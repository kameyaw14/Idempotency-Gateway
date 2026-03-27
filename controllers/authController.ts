import { Request, Response } from "express";
import { z } from "zod";
import { authService } from "../services/authService.js";
import { loginSchema, registerSchema } from "../zodSchemas/authSchema.js";
import { MeResponse } from "../types/types.js";
import { AuthenticatedRequest } from "../middleware/verifyToken.js";

export const authController = {
  async register(req: Request, res: Response) {
    try {
      const validatedData = registerSchema.parse(req.body);
      const result = await authService.register(validatedData);

      return res.status(result.success ? 201 : 400).json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: error.issues.map((issue) => ({
            field: issue.path[0] || "unknown",
            message: issue.message,
          })),
        });
      }
      return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  },

  async login(req: Request, res: Response) {
    try {
      const validatedData = loginSchema.parse(req.body);
      const result = await authService.login(validatedData);

      return res.status(result.success ? 200 : 401).json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: error.issues.map((issue) => ({
            field: issue.path[0] || "unknown",
            message: issue.message,
          })),
        });
      }
      return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  },

  async me(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized. Please log in again.",
        });
      }

      const fullUser = authService.getUserById(req.user.id);
      if (!fullUser) {
        return res.status(404).json({
          success: false,
          message: "User not found.",
        });
      }

      const meResponse: MeResponse = {
        success: true,
        message: "User profile retrieved successfully.",
        user: {
          id: fullUser.id,
          name: fullUser.name,
          email: fullUser.email,
          createdAt: fullUser.createdAt.toISOString(),
        },
      };

      return res.status(200).json(meResponse);
    } catch (error) {
      console.error("Error in /me:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  },
};
