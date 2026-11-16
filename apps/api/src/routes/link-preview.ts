import { Hono } from "hono";
import { badRequest } from "../lib/errors.js";
import { successData } from "../lib/response.js";
import { authMiddleware } from "../middleware/auth.js";
import { tenantMiddleware } from "../middleware/tenant.js";
import { getLinkPreview } from "../services/link-preview.service.js";

export const linkPreviewRoutes = new Hono();

// Require authenticated session and tenant context
linkPreviewRoutes.use("/*", authMiddleware);
linkPreviewRoutes.use("/*", tenantMiddleware());

linkPreviewRoutes.get("/", async (c) => {
  const url = c.req.query("url");
  if (!url || typeof url !== "string" || !url.trim()) {
    return badRequest(c, "Missing or invalid 'url' query parameter");
  }

  try {
    const preview = await getLinkPreview(url.trim());
    return successData(c, preview);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch link preview";
    return badRequest(c, message);
  }
});

