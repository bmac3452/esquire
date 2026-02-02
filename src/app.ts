

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import compression from "compression";
import morgan from "morgan";
import authRouter from "./routes/auth";
import clientsRouter from "./routes/clients";
import casesRouter from "./routes/cases";
import feedRouter from "./routes/feed";
import socialRouter from "./routes/social";
import uploadsRouter from "./routes/uploads";
import searchRouter from "./routes/search";
import notificationsRouter from "./routes/notifications";
import legalRouter from "./routes/legal";
import { requireAuth } from "./middleware/requireAuth";
import prisma from "./prisma";

const app = express();

const isProd = process.env.NODE_ENV === "production";
const corsOrigin = process.env.CORS_ORIGIN || "*";

if (isProd) {
  app.set("trust proxy", 1);
}

app.disable("x-powered-by");

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_MAX) || 200,
    standardHeaders: true,
    legacyHeaders: false
  })
);
app.use(compression());
app.use(morgan(isProd ? "combined" : "dev"));

app.use(
  cors({
    origin: corsOrigin === "*" ? true : corsOrigin.split(",").map((o) => o.trim()),
    credentials: corsOrigin !== "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);
app.use(express.json({ limit: "1mb" }));
app.use("/uploads", express.static("uploads"));

// Mount authentication routes
app.use("/auth", authRouter);

// Mount clients routes
app.use("/clients", clientsRouter);

// Mount case notes routes
app.use("/cases", casesRouter);

// Mount feed routes
app.use("/feed", feedRouter);

// Mount social routes
app.use("/social", socialRouter);

// Mount uploads routes
app.use("/uploads", uploadsRouter);

// Mount search routes
app.use("/search", searchRouter);

// Mount notifications routes
app.use("/notifications", notificationsRouter);

// Mount legal analysis routes
app.use("/legal", requireAuth, legalRouter);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/db-test", async (_req, res) => {
  try {
    await prisma.$connect();
    await prisma.$disconnect();
    res.json({ db: "connected" });
  } catch (error) {
    res.status(500).json({ db: "error", error: error instanceof Error ? error.message : error });
  }
});

// Example protected route
app.get("/me", requireAuth, async (req, res) => {
  // req.user is set by requireAuth middleware
  const userId = (req as any).user.sub;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, createdAt: true, updatedAt: true }
  });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user });
});

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  const message = err instanceof Error ? err.message : String(err);
  res.status(500).json({ 
    error: "Internal server error",
    ...(process.env.NODE_ENV === "development" && { details: message })
  });
});

export default app;
