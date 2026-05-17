import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(express.json());

// ── Health check ────────────────────────────────────────────────────────────
app.get("/", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

// ── Routes ───────────────────────────────────────────────────────────────────
import authRouter from "./routes/auth";
import notesRouter from "./routes/notes";
import metaRouter from "./routes/meta";

app.use("/", authRouter);
app.use("/notes", notesRouter);
app.use("/", metaRouter);

// ── Global error handler ─────────────────────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
