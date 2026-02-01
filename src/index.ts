import "dotenv/config";
import { createServer } from "http";
import { Server } from "socket.io";
import app from "./app";
import { verifyToken } from "./middleware/requireAuth";
import { setSocketIO } from "./notifications";
import prisma from "./prisma";

const PORT = Number(process.env.PORT) || 4000;

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

// Start server immediately (migrations already applied)
httpServer.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});

