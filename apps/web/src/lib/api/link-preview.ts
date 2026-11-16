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
    const rawUrl = url.trim();
    if (!rawUrl) return null;

    const normalizedUrl = /^https?:\/\//i.test(rawUrl)
      ? rawUrl
      : `https://${rawUrl}`;
    const encoded = encodeURIComponent(normalizedUrl);

    const response = await fetchWithAuth<
      LinkPreviewMetadata | ApiResponse<LinkPreviewMetadata>
    >(`/link-preview?url=${encoded}`);

    if (!response) return null;

    // handleResponse in client.ts unwraps { data: T } automatically if only 'data' exists,
    // but handle both unwrapped and wrapped formats safely.
    if (
      "data" in response &&
      response.data &&
      typeof response.data === "object"
    ) {
      return response.data as LinkPreviewMetadata;
    }

    if ("url" in response || "domain" in response) {
      return response as LinkPreviewMetadata;
    }

    return null;
  } catch (error) {
    console.warn("fetchLinkPreview error:", error);
    return null;
  }
}


