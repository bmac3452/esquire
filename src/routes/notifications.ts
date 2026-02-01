import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import prisma from "../prisma";

const router = Router();

// Get user notifications
router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.sub;
    const { limit = 20, offset = 0 } = req.query;

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: Number(limit),
      skip: Number(offset)
    });

    const unreadCount = await prisma.notification.count({
      where: { userId, read: false }
    });

    res.json({ notifications, unreadCount });
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({ error: "Failed to get notifications" });
  }
});

// Mark notification as read
router.patch("/:id/read", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.sub;
    const { id } = req.params;

    const notification = await prisma.notification.findFirst({
      where: { id, userId }
    });

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { read: true }
    });

    res.json({ notification: updated });
  } catch (error) {
    console.error("Mark read error:", error);
    res.status(500).json({ error: "Failed to mark notification as read" });
  }
});

// Mark all notifications as read
router.post("/read-all", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.sub;

    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true }
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Mark all read error:", error);
    res.status(500).json({ error: "Failed to mark all as read" });
  }
});

// Delete notification
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.sub;
    const { id } = req.params;

    const notification = await prisma.notification.findFirst({
      where: { id, userId }
    });

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    await prisma.notification.delete({
      where: { id }
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Delete notification error:", error);
    res.status(500).json({ error: "Failed to delete notification" });
  }
});

export default router;
