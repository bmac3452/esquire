import { Router } from "express";
import { z } from "zod";
import prisma from "../prisma";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

// Apply auth middleware to all routes
router.use(requireAuth);

const CreateClientSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

const UpdateClientSchema = CreateClientSchema.partial();

// GET all clients for the authenticated user
router.get("/", async (req, res) => {
  try {
    const userId = (req as any).user.sub;
    const clients = await prisma.client.findMany({
      where: { userId },
    });
    res.json({ clients });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : error });
  }
});

// GET a specific client by ID
router.get("/:id", async (req, res) => {
  try {
    const userId = (req as any).user.sub;
    const { id } = req.params;
    const client = await prisma.client.findFirst({
      where: { id, userId },
    });
    if (!client) return res.status(404).json({ error: "Client not found" });
    res.json({ client });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : error });
  }
});

// POST create a new client
router.post("/", async (req, res) => {
  try {
    const userId = (req as any).user.sub;
    const parsed = CreateClientSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error });
    }

    const client = await prisma.client.create({
      data: {
        ...parsed.data,
        userId,
      },
    });
    res.status(201).json({ client });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : error });
  }
});

// PUT update a client
router.put("/:id", async (req, res) => {
  try {
    const userId = (req as any).user.sub;
    const { id } = req.params;
    const parsed = UpdateClientSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error });
    }

    const existingClient = await prisma.client.findFirst({
      where: { id, userId },
    });
    if (!existingClient) return res.status(404).json({ error: "Client not found" });

    const client = await prisma.client.update({
      where: { id },
      data: parsed.data,
    });
    res.json({ client });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : error });
  }
});

// DELETE a client
router.delete("/:id", async (req, res) => {
  try {
    const userId = (req as any).user.sub;
    const { id } = req.params;

    const existingClient = await prisma.client.findFirst({
      where: { id, userId },
    });
    if (!existingClient) return res.status(404).json({ error: "Client not found" });

    await prisma.client.delete({
      where: { id },
    });
    res.json({ message: "Client deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : error });
  }
});

export default router;
