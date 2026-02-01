import { Router } from "express";
import { z } from "zod";
import prisma from "../prisma";
import { requireAuth } from "../middleware/requireAuth";
import { createNotification } from "../notifications";

const router = Router();

const PostSchema = z.object({
  content: z.string().min(1).max(5000)
});

const CommentSchema = z.object({
  content: z.string().min(1).max(1000)
});

// Create a post
router.post("/posts", requireAuth, async (req, res) => {
  try {
    const parsed = PostSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input", details: parsed.error });
    }

    const { content } = parsed.data;
    const userId = (req as any).user.sub;

    const post = await prisma.post.create({
      data: {
        content,
        userId
      },
      include: {
        user: {
          select: { id: true, email: true, name: true }
        },
        comments: true,
        likes: true,
        media: true
      }
    });

    return res.json(post);
  } catch (error) {
    return res.status(500).json({ error: "Failed to create post" });
  }
});

// Get feed (all posts with comments and likes)
router.get("/posts", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.sub;
    const takeRaw = Number(req.query.take);
    const skipRaw = Number(req.query.skip);
    const take = Number.isFinite(takeRaw) ? Math.min(Math.max(takeRaw, 1), 50) : 20;
    const skip = Number.isFinite(skipRaw) && skipRaw > 0 ? skipRaw : 0;

    const following: { followingId: string }[] = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true }
    });

    const userIds = Array.from(
      new Set([userId, ...following.map((f: { followingId: string }) => f.followingId)])
    );

    const posts = await prisma.post.findMany({
      where: { userId: { in: userIds } },
      include: {
        user: {
          select: { id: true, email: true, name: true }
        },
        media: true,
        comments: {
          include: {
            user: {
              select: { id: true, email: true, name: true }
            }
          },
          orderBy: { createdAt: "desc" }
        },
        likes: {
          where: { userId },
          select: { id: true }
        },
        _count: {
          select: { likes: true, comments: true }
        }
      },
      orderBy: { createdAt: "desc" },
      take,
      skip
    });

    const items = posts.map((post: (typeof posts)[number]) => {
      const likeCount = post._count.likes;
      const commentCount = post._count.comments;
      const likedByMe = post.likes.length > 0;
      const { _count, likes, ...rest } = post;
      return {
        ...rest,
        likeCount,
        commentCount,
        likedByMe
      };
    });

    return res.json({ items, take, skip });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch posts" });
  }
});

// Get single post
router.get("/posts/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "Missing post id" });
    }

    const userId = (req as any).user.sub;
    const following: { followingId: string }[] = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true }
    });
    const userIds = Array.from(
      new Set([userId, ...following.map((f: { followingId: string }) => f.followingId)])
    );

    const post = await prisma.post.findFirst({
      where: { id, userId: { in: userIds } },
      include: {
        user: {
          select: { id: true, email: true, name: true }
        },
        media: true,
        comments: {
          include: {
            user: {
              select: { id: true, email: true, name: true }
            }
          },
          orderBy: { createdAt: "desc" }
        },
        likes: {
          where: { userId },
          select: { id: true }
        },
        _count: {
          select: { likes: true, comments: true }
        }
      }
    });

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const { _count, likes, ...postData } = post;
    return res.json({
      ...postData,
      likeCount: _count.likes,
      commentCount: _count.comments,
      likedByMe: likes.length > 0
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch post" });
  }
});

// Like a post
router.post("/posts/:id/like", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "Missing post id" });
    }
    const userId = (req as any).user.sub;

    // Check if post exists
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Check if already liked
    const existingLike = await prisma.like.findUnique({
      where: { userId_postId: { userId, postId: id } }
    });

    if (existingLike) {
      return res.status(400).json({ error: "Already liked this post" });
    }

    const like = await prisma.like.create({
      data: {
        userId,
        postId: id
      }
    });

    // Create notification for post owner
    await createNotification(
      post.userId,
      "like",
      "Someone liked your post",
      userId,
      id
    );

    return res.json({ message: "Post liked", like });
  } catch (error) {
    return res.status(500).json({ error: "Failed to like post" });
  }
});

// Unlike a post
router.delete("/posts/:id/like", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "Missing post id" });
    }
    const userId = (req as any).user.sub;

    const like = await prisma.like.delete({
      where: { userId_postId: { userId, postId: id } }
    });

    return res.json({ message: "Post unliked", like });
  } catch (error) {
    return res.status(500).json({ error: "Failed to unlike post" });
  }
});

// Add comment to post
router.post("/posts/:id/comments", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "Missing post id" });
    }
    const parsed = CommentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input", details: parsed.error });
    }

    const { content } = parsed.data;
    const userId = (req as any).user.sub;

    // Check if post exists
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        userId,
        postId: id
      },
      include: {
        user: {
          select: { id: true, email: true, name: true }
        }
      }
    });

    // Create notification for post owner
    await createNotification(
      post.userId,
      "comment",
      "Someone commented on your post",
      userId,
      id,
      comment.id
    );

    return res.json(comment);
  } catch (error) {
    return res.status(500).json({ error: "Failed to create comment" });
  }
});

// Get comments for a post
router.get("/posts/:id/comments", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "Missing post id" });
    }

    const comments = await prisma.comment.findMany({
      where: { postId: id },
      include: {
        user: {
          select: { id: true, email: true, name: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return res.json(comments);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch comments" });
  }
});

// Delete comment
router.delete("/comments/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "Missing comment id" });
    }
    const userId = (req as any).user.sub;

    const comment = await prisma.comment.findUnique({ where: { id } });
    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    if (comment.userId !== userId) {
      return res.status(403).json({ error: "Cannot delete someone else's comment" });
    }

    await prisma.comment.delete({ where: { id } });

    return res.json({ message: "Comment deleted" });
  } catch (error) {
    return res.status(500).json({ error: "Failed to delete comment" });
  }
});

// Delete post
router.delete("/posts/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "Missing post id" });
    }
    const userId = (req as any).user.sub;

    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (post.userId !== userId) {
      return res.status(403).json({ error: "Cannot delete someone else's post" });
    }

    await prisma.post.delete({ where: { id } });

    return res.json({ message: "Post deleted" });
  } catch (error) {
    return res.status(500).json({ error: "Failed to delete post" });
  }
});

export default router;
