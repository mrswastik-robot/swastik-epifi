import { Router, Request, Response } from "express";
import { openapiSpec } from "../lib/openapi";

const router = Router();

router.get("/about", (_req: Request, res: Response) => {
  res.status(200).json({
    name: "Your Name",
    email: "your@email.com",
    "my features": {
      "Note Revision History":
        "Every time a note is updated, the previous version is automatically snapshotted. " +
        "Use GET /notes/:id/history to browse past versions and " +
        "POST /notes/:id/history/:historyId/restore to rewind to any snapshot. " +
        "I chose this because it mirrors real-world collaborative tools like Notion and Google Docs, " +
        "demonstrates transactional DB writes, and adds genuine user value without complex infrastructure.",
    },
  });
});

router.get("/openapi.json", (_req: Request, res: Response) => {
  res.status(200).json(openapiSpec);
});

export default router;
