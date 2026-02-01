import prisma from "./prisma";

type NotificationType = "like" | "comment" | "follow" | "mention";

let io: any = null;

export function setSocketIO(socketIO: any) {
  io = socketIO;
}

export async function createNotification(
  userId: string,
  type: NotificationType,
  content: string,
  actorId?: string,
  postId?: string,
  commentId?: string
) {
  try {
    // Don't notify yourself
    if (userId === actorId) return;

    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        content,
        actorId,
        postId,
        commentId
      }
    });

    // Emit real-time notification via WebSocket
    if (io) {
      io.to(`user:${userId}`).emit("notification", notification);
    }

    return notification;
  } catch (error) {
    console.error("Create notification error:", error);
  }
}
