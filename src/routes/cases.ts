import { Router } from "express";
import { z } from "zod";
import prisma from "../prisma";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

// Apply auth middleware to all routes
router.use(requireAuth);

const CreateCaseNoteSchema = z.object({
  content: z.string().min(1),
});

const UpdateCaseNoteSchema = CreateCaseNoteSchema.partial();

// GET all case notes for the authenticated user
router.get("/", async (req, res) => {
  try {
    const userId = (req as any).user.sub;
    const caseNotes = await prisma.caseNote.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    res.json({ caseNotes });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : error });
  }
});

// GET a specific case note by ID
router.get("/:id", async (req, res) => {
  try {
    const userId = (req as any).user.sub;
    const { id } = req.params;
    const caseNote = await prisma.caseNote.findFirst({
      where: { id, userId },
    });
    if (!caseNote) return res.status(404).json({ error: "Case note not found" });
    res.json({ caseNote });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : error });
  }
});

// POST create a new case note
router.post("/", async (req, res) => {
  try {
    const userId = (req as any).user.sub;
    const parsed = CreateCaseNoteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error });
    }

    const caseNote = await prisma.caseNote.create({
      data: {
        ...parsed.data,
        userId,
      },
    });
    res.status(201).json({ caseNote });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : error });
  }
});

// PUT update a case note
router.put("/:id", async (req, res) => {
  try {
    const userId = (req as any).user.sub;
    const { id } = req.params;
    const parsed = UpdateCaseNoteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error });
    }

    const existingNote = await prisma.caseNote.findFirst({
      where: { id, userId },
    });
    if (!existingNote) return res.status(404).json({ error: "Case note not found" });

    const caseNote = await prisma.caseNote.update({
      where: { id },
      data: parsed.data,
    });
    res.json({ caseNote });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : error });
  }
});

// DELETE a case note
router.delete("/:id", async (req, res) => {
  try {
    const userId = (req as any).user.sub;
    const { id } = req.params;

    const existingNote = await prisma.caseNote.findFirst({
      where: { id, userId },
    });
    if (!existingNote) return res.status(404).json({ error: "Case note not found" });

    await prisma.caseNote.delete({
      where: { id },
    });
    res.json({ message: "Case note deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : error });
  }
});

export default router;
