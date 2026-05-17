import { Router, Request, Response } from "express";
import prisma from "../prisma";
import { authenticate, AuthRequest } from "../middleware/authenticate";
import {
  noteSchema,
  shareSchema,
  paginationSchema,
  searchQuerySchema,
} from "../validators/schemas";

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

const router = Router();

// All notes routes require authentication
router.use(authenticate);

// ── GET /notes ───────────────────────────────────────────────────────────────
// Returns all notes owned by or shared with the authenticated user.
// Supports optional pagination via ?page=&limit=
router.get("/", async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthRequest;

  const pagination = paginationSchema.safeParse(req.query);
  if (!pagination.success) {
    res.status(400).json({ message: pagination.error.issues[0].message });
    return;
  }

  const { page, limit } = pagination.data;
  const skip = (page - 1) * limit;

  const [notes, total] = await Promise.all([
    prisma.note.findMany({
      where: {
        OR: [{ ownerId: userId }, { shares: { some: { userId } } }],
      },
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        ownerId: true,
      },
    }),
    prisma.note.count({
      where: {
        OR: [{ ownerId: userId }, { shares: { some: { userId } } }],
      },
    }),
  ]);

  res.status(200).json({
    data: notes,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
});

// ── GET /notes/search ────────────────────────────────────────────────────────
// Full-text search across notes accessible to the authenticated user.
// Must be registered before /:id to avoid the param swallowing "search".
router.get("/search", async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthRequest;

  const parsed = searchQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0].message });
    return;
  }

  const { q, page, limit } = parsed.data;
  const skip = (page - 1) * limit;

  const [notes, total] = await Promise.all([
    prisma.note.findMany({
      where: {
        AND: [
          { OR: [{ ownerId: userId }, { shares: { some: { userId } } }] },
          {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { content: { contains: q, mode: "insensitive" } },
            ],
          },
        ],
      },
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        ownerId: true,
      },
    }),
    prisma.note.count({
      where: {
        AND: [
          { OR: [{ ownerId: userId }, { shares: { some: { userId } } }] },
          {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { content: { contains: q, mode: "insensitive" } },
            ],
          },
        ],
      },
    }),
  ]);

  res.status(200).json({
    data: notes,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
});

// ── GET /notes/:id ───────────────────────────────────────────────────────────
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthRequest;
  const { id } = req.params;

  const note = await prisma.note.findFirst({
    where: {
      id,
      OR: [{ ownerId: userId }, { shares: { some: { userId } } }],
    },
    select: {
      id: true,
      title: true,
      content: true,
      createdAt: true,
      updatedAt: true,
      ownerId: true,
    },
  });

  if (!note) {
    res.status(404).json({ message: "Note not found" });
    return;
  }

  res.status(200).json(note);
});

// ── POST /notes ──────────────────────────────────────────────────────────────
router.post("/", async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthRequest;

  const parsed = noteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0].message });
    return;
  }

  const note = await prisma.note.create({
    data: { ...parsed.data, ownerId: userId },
    select: {
      id: true,
      title: true,
      content: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  res.status(201).json(note);
});

// ── PUT /notes/:id ───────────────────────────────────────────────────────────
// Only the owner can update a note. A history snapshot is saved before update.
router.put("/:id", async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthRequest;
  const { id } = req.params;

  const parsed = noteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0].message });
    return;
  }

  const existing = await prisma.note.findFirst({
    where: { id, ownerId: userId },
  });

  if (!existing) {
    res.status(404).json({ message: "Note not found or you are not the owner" });
    return;
  }

  // Snapshot the current state before overwriting (revision history feature)
  const updated = await prisma.$transaction(async (tx: Tx) => {
    await tx.noteHistory.create({
      data: {
        noteId: existing.id,
        title: existing.title,
        content: existing.content,
      },
    });

    return tx.note.update({
      where: { id },
      data: parsed.data,
      select: {
        id: true,
        title: true,
        content: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  });

  res.status(200).json(updated);
});

// ── DELETE /notes/:id ────────────────────────────────────────────────────────
// Only the owner can delete a note.
router.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthRequest;
  const { id } = req.params;

  const existing = await prisma.note.findFirst({
    where: { id, ownerId: userId },
  });

  if (!existing) {
    res.status(404).json({ message: "Note not found or you are not the owner" });
    return;
  }

  await prisma.note.delete({ where: { id } });
  res.status(204).send();
});

// ── POST /notes/:id/share ────────────────────────────────────────────────────
router.post("/:id/share", async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthRequest;
  const { id } = req.params;

  const parsed = shareSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0].message });
    return;
  }

  const { share_with_email } = parsed.data;

  const note = await prisma.note.findFirst({ where: { id, ownerId: userId } });
  if (!note) {
    res.status(404).json({ message: "Note not found or you are not the owner" });
    return;
  }

  const targetUser = await prisma.user.findUnique({
    where: { email: share_with_email },
  });
  if (!targetUser) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  if (targetUser.id === userId) {
    res.status(400).json({ message: "You cannot share a note with yourself" });
    return;
  }

  // Upsert so re-sharing is idempotent
  await prisma.noteShare.upsert({
    where: { noteId_userId: { noteId: id, userId: targetUser.id } },
    create: { noteId: id, userId: targetUser.id },
    update: {},
  });

  res.status(200).json({ message: "Note shared successfully" });
});

// ── GET /notes/:id/history ───────────────────────────────────────────────────
// Returns all past snapshots for a note (owner only).
router.get("/:id/history", async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthRequest;
  const { id } = req.params;

  const note = await prisma.note.findFirst({ where: { id, ownerId: userId } });
  if (!note) {
    res.status(404).json({ message: "Note not found or you are not the owner" });
    return;
  }

  const history = await prisma.noteHistory.findMany({
    where: { noteId: id },
    orderBy: { savedAt: "desc" },
    select: { id: true, title: true, content: true, savedAt: true },
  });

  res.status(200).json(history);
});

// ── POST /notes/:id/history/:historyId/restore ───────────────────────────────
// Restores a past snapshot as the current note (owner only).
router.post(
  "/:id/history/:historyId/restore",
  async (req: Request, res: Response): Promise<void> => {
    const { userId } = req as AuthRequest;
    const { id, historyId } = req.params;

    const note = await prisma.note.findFirst({ where: { id, ownerId: userId } });
    if (!note) {
      res.status(404).json({ message: "Note not found or you are not the owner" });
      return;
    }

    const snapshot = await prisma.noteHistory.findFirst({
      where: { id: historyId, noteId: id },
    });
    if (!snapshot) {
      res.status(404).json({ message: "History snapshot not found" });
      return;
    }

    const restored = await prisma.$transaction(async (tx: Tx) => {
      // Save current state before restoring
      await tx.noteHistory.create({
        data: { noteId: id, title: note.title, content: note.content },
      });

      return tx.note.update({
        where: { id },
        data: { title: snapshot.title, content: snapshot.content },
        select: {
          id: true,
          title: true,
          content: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    res.status(200).json(restored);
  }
);

export default router;
