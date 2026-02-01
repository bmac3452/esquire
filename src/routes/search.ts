import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import prisma from "../prisma";

const router = Router();

// Search users by email or name
router.get("/users", requireAuth, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || typeof q !== "string") {
      return res.status(400).json({ error: "Search query required" });
    }

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: q, mode: "insensitive" } },
          { name: { contains: q, mode: "insensitive" } }
        ]
      },
      select: {
        id: true,
        email: true,
        name: true,
        state: true,
        educationLevel: true,
        _count: {
          select: {
            posts: true,
            followers: true,
            following: true
          }
        }
      },
      take: 20
    });

    res.json({ users });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ error: "Failed to search users" });
  }
});

// Search posts by content
router.get("/posts", requireAuth, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || typeof q !== "string") {
      return res.status(400).json({ error: "Search query required" });
    }

    const posts = await prisma.post.findMany({
      where: {
        content: { contains: q, mode: "insensitive" }
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true
          }
        },
        media: true
      },
      orderBy: { createdAt: "desc" },
      take: 20
    });

    res.json({ posts });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ error: "Failed to search posts" });
  }
});

export default router;
