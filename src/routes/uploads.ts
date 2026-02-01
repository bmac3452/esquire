import { Router } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import prisma from "../prisma";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Unsupported file type"));
    }
    cb(null, true);
  }
});

// Upload media to a post
router.post("/posts/:id", requireAuth, upload.single("file"), async (req, res) => {
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
      return res.status(403).json({ error: "Cannot upload to someone else's post" });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const url = `/uploads/${file.filename}`;

    const media = await prisma.postMedia.create({
      data: {
        url,
        filename: file.filename,
        mimeType: file.mimetype,
        size: file.size,
        userId,
        postId: id
      }
    });

    return res.json({ media });
  } catch (error) {
    return res.status(500).json({ error: "Failed to upload" });
  }
});

export default router;
