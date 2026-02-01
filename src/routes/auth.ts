import { Router } from "express";
import { z } from "zod";
import { hashPassword, verifyPassword } from "../utils/password";
import { signToken } from "../utils/jwt";
import prisma from "../prisma";

const router = Router();

const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  state: z.string().length(2),
  educationLevel: z.enum([
    "GRADE_4_6",
    "GRADE_7_8",
    "GRADE_9_10",
    "GRADE_11_12_GED",
    "COLLEGE_PLUS"
  ])
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});



router.post("/signup", async (req, res) => {
  const parsed = SignupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(parsed.error);
  }

  const { email, password, state, educationLevel } = parsed.data;

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return res.status(409).json({ error: "Email already exists" });
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      state: state,
      educationLevel
    },
    select: {
      id: true,
      email: true,
      state: true,
      educationLevel: true
    }
  });

  const token = signToken({ sub: user.id });
  return res.json({ token, user });
});

router.post("/login", async (req, res) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(parsed.error);
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = signToken({ sub: user.id });
  return res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      state: user.state,
      educationLevel: user.educationLevel
    }
  });
});

export default router;
