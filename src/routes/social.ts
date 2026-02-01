import { Router } from "express";
import prisma from "../prisma";
import { requireAuth } from "../middleware/requireAuth";
import { createNotification } from "../notifications";

const router = Router();

// Follow a user
router.post("/follow/:userId", requireAuth, async (req, res) => {
  try {
    const { userId: targetUserId } = req.params;
    if (!targetUserId) {
      return res.status(400).json({ error: "Missing user id" });
    }

    const userId = (req as any).user.sub;
    if (userId === targetUserId) {
      return res.status(400).json({ error: "Cannot follow yourself" });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const existing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: userId, followingId: targetUserId } }
    });

    if (existing) {
      return res.status(400).json({ error: "Already following" });
    }

    const follow = await prisma.follow.create({
      data: { followerId: userId, followingId: targetUserId }
    });

    // Create notification for the user being followed
    await createNotification(
      targetUserId,
      "follow",
      "Someone started following you",
      userId
    );

    return res.json({ message: "Followed", follow });
  } catch {
    return res.status(500).json({ error: "Failed to follow user" });
  }
});

// Unfollow a user
router.delete("/follow/:userId", requireAuth, async (req, res) => {
  try {
    const { userId: targetUserId } = req.params;
    if (!targetUserId) {
      return res.status(400).json({ error: "Missing user id" });
    }

    const userId = (req as any).user.sub;

    await prisma.follow.delete({
      where: { followerId_followingId: { followerId: userId, followingId: targetUserId } }
    });

    return res.json({ message: "Unfollowed" });
  } catch {
    return res.status(500).json({ error: "Failed to unfollow user" });
  }
});

// List who I follow
router.get("/following", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.sub;

    const following: { following: { id: string; email: string; name: string | null } }[] = await prisma.follow.findMany({
      where: { followerId: userId },
      include: {
        following: {
          select: { id: true, email: true, name: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return res.json(following.map((f: { following: { id: string; email: string; name: string | null } }) => f.following));
  } catch {
    return res.status(500).json({ error: "Failed to fetch following" });
  }
});

// List my followers
router.get("/followers", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.sub;

    const followers: { follower: { id: string; email: string; name: string | null } }[] = await prisma.follow.findMany({
      where: { followingId: userId },
      include: {
        follower: {
          select: { id: true, email: true, name: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return res.json(followers.map((f: { follower: { id: string; email: string; name: string | null } }) => f.follower));
  } catch {
    return res.status(500).json({ error: "Failed to fetch followers" });
  }
});

export default router;
