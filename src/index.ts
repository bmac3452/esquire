import "dotenv/config";
import { createServer } from "http";
import { Server } from "socket.io";
import app from "./app";
import { verifyToken } from "./middleware/requireAuth";
import { setSocketIO } from "./notifications";
import prisma from "./prisma";

const PORT = Number(process.env.PORT) || 4000;

// Run migrations on startup if DATABASE_URL is set
async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    console.warn('⚠️  DATABASE_URL not set, skipping migrations');
    return;
  }
  try {
    console.log('Running database migrations...');
    await prisma.$executeRawUnsafe('SELECT 1');
    console.log('✅ Database connected, running migrations...');
    const { execSync } = require('child_process');
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    console.log('✅ Migrations completed');
  } catch (err) {
    console.warn('⚠️  Migration failed (continuing anyway):', err instanceof Error ? err.message : err);
  }
}

runMigrations().finally(() => {
  const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true
  }
});

// Socket.io authentication middleware
io.use((socket: any, next: any) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error("Authentication error"));
  }
  
  try {
    const decoded = verifyToken(token);
    socket.userId = decoded.sub;
    next();
  } catch (error) {
    next(new Error("Authentication error"));
  }
});

// Socket.io connection handler
io.on("connection", (socket: any) => {
  const userId = socket.userId;
  console.log(`User connected: ${userId}`);

  // Join user's personal room for notifications
  socket.join(`user:${userId}`);

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${userId}`);
  });
});

// Export io for use in other modules
export { io };

// Set socket.io instance for notifications
setSocketIO(io);

httpServer.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
});

