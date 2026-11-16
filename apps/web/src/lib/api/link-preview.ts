import type { LinkPreviewMetadata } from "@wateaminbox/shared";
import { fetchWithAuth } from "./client.js";
import type { ApiResponse } from "./types.js";

/**
 * Fetches rich OpenGraph / Twitter metadata for a given URL via the SSRF-protected backend endpoint.
 */
export async function fetchLinkPreview(
  url: string,
): Promise<LinkPreviewMetadata | null> {
  try {
    const encoded = encodeURIComponent(url.trim());
    const response = await fetchWithAuth<ApiResponse<LinkPreviewMetadata>>(
      `/link-preview?url=${encoded}`,
    );
    return response?.data ?? null;
  } catch {
    return null;
  }
}

