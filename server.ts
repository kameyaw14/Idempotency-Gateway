//server.ts
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { checkRequiredEnv } from "./config/checkEnv.js";
import { env } from "./utils/env.js";
import authRouter from "./routes/authRoutes.js";
import { authService } from "./services/authService.js";
import paymentRouter from "./routes/paymentRoutes.js";
import { paymentService } from "./services/paymentService.js";
import { requestIdMiddleware } from "./middleware/requestId.js";
import { persistence } from "./utils/persistence.js";

checkRequiredEnv();

const app = express();
let server;
dotenv.config();

const PORT = env.PORT;

const corsOptions = {
  origin: (origin: any, callback: any) => {
    const allowedOrigins = [env.CLIENT_URL].filter(Boolean);
    console.log("CORS request origin:", origin);
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log("CORS rejected origin:", origin);
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: false, // not using cookies
  optionsSuccessStatus: 200,
};

app.use(requestIdMiddleware);
app.use(helmet());

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

const httpServer = http.createServer(app);

app.use(cors(corsOptions));

app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/payments", paymentRouter);

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: `${env.SYSTEM_NAME} server running!!`,
    environment: env.MODE || "development",
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Endpoint does not exist.",
  });
});

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  console.error(err.stack);

  // Handle rate limit errors
  if (err.statusCode === 429) {
    return res.status(429).json({
      success: false,
      message: "Too many requests. Please try again later.",
    });
  }

  if (err.message.includes("CORS")) {
    return res.status(403).json({
      success: false,
      message: err.message,
      allowedOrigins:
        corsOptions.origin instanceof Function
          ? ["Dynamic check"]
          : corsOptions.origin,
    });
  }

  res.status(500).json({
    success: false,
    message: env.MODE === "development" ? err.message : "Internal server error",
  });
});

const startServer = async () => {
  try {
    httpServer.listen(PORT, () => {
      console.log(`Server running in ${env.MODE || "development"} mode`);
      console.log(`Server is running on http://localhost:${PORT}`);
      console.log(`Allowed client URL: ${env.CLIENT_URL}`);
    });
    await authService.init();
    await paymentService.init();
    await persistence.ensureDataDir();
    console.log("✅ Audit logging system initialized (data/audit.json ready)");
  } catch (error) {
    console.error("❌Failed to start server", error);
    process.exit(1);
  }
};

startServer();

process.on("unhandledRejection", (err) => {
  console.error("❌Unhandled Rejection:", err);
  httpServer.close(() => process.exit(1));
});

process.on("uncaughtException", (err) => {
  console.error("❌Uncaught Exception:", err);
  process.exit(1);
});
