// routes/authRoutes.ts
import { Router } from "express";
import { authController } from "../controllers/authController.js";
import rateLimit from "express-rate-limit";
import { authMiddleware } from "../middleware/verifyToken.js";

const authRouter = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Too many auth attempts. Please try again later.",
  },
  standardHeaders: true,
});

// authRouter.use(authLimiter);

authRouter.post("/register", authController.register);
authRouter.post("/login", authController.login);
authRouter.get("/me", authMiddleware, authController.me);

export default authRouter;
