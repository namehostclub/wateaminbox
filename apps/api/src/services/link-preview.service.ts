import dns from "node:dns/promises";
import type { LinkPreviewMetadata } from "@wateaminbox/shared";

interface CacheEntry {
  data: LinkPreviewMetadata;
  expiresAt: number;
}

const PREVIEW_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_CACHE_ENTRIES = 1000;
const MAX_BODY_BYTES = 131072; // 128KB max read
const FETCH_TIMEOUT_MS = 3500;

/**
 * Checks whether an IP address belongs to loopback, private RFC1918,
 * link-local (cloud metadata), carrier-grade NAT, or other non-routable ranges.
 */
export function isDisallowedIp(rawIp: string): boolean {
  let ip = rawIp.trim();
  if (ip.startsWith("::ffff:")) {
    ip = ip.substring(7);
  }

  // IPv4 checks
  const ipv4Parts = ip.split(".").map(Number);
  if (
    ipv4Parts.length === 4 &&
    ipv4Parts.every((p) => !isNaN(p) && p >= 0 && p <= 255)
  ) {
    const [a, b] = ipv4Parts;
    // 0.0.0.0/8 (Current network)
    if (a === 0) return true;
    // 10.0.0.0/8 (Private network)
    if (a === 10) return true;
    // 127.0.0.0/8 (Loopback)
    if (a === 127) return true;
    // 169.254.0.0/16 (Link local / AWS/GCP metadata 169.254.169.254)
    if (a === 169 && b === 254) return true;
    // 172.16.0.0/12 (Private network: 172.16.0.0 – 172.31.255.255)
    if (a === 172 && b >= 16 && b <= 31) return true;
    // 192.168.0.0/16 (Private network)
    if (a === 192 && b === 168) return true;
    // 100.64.0.0/10 (Carrier-grade NAT: 100.64.0.0 – 100.127.255.255)
    if (a === 100 && b >= 64 && b <= 127) return true;
    // 224.0.0.0/4 (Multicast and reserved)
    if (a >= 224) return true;
    return false;
  }

  // IPv6 checks
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "0:0:0:0:0:0:0:1") return true;
  if (lower === "::" || lower === "0:0:0:0:0:0:0:0") return true;
  if (
    lower.startsWith("fe80:") ||
    lower.startsWith("fe8") ||
    lower.startsWith("fe9") ||
    lower.startsWith("fea") ||
    lower.startsWith("feb")
  ) {
    return true;
  }
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true;

  return false;
}

/**
 * Validates the URL to protect against SSRF before making any outbound request.
 */
export async function assertSafeUrl(targetUrl: URL): Promise<void> {
  const protocol = targetUrl.protocol.toLowerCase();
  if (protocol !== "http:" && protocol !== "https:") {
    throw new Error("Invalid URL protocol. Only HTTP and HTTPS are allowed.");
  }

  const hostname = targetUrl.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".lan") ||
    hostname === "0.0.0.0" ||
    hostname === "::1"
  ) {
    throw new Error("Target hostname is restricted.");
  }

  // Direct IP in hostname check
  if (isDisallowedIp(hostname)) {
    throw new Error("Target IP address is restricted.");
  }

  // Resolve hostname via DNS
  try {
    const addresses = await dns.lookup(hostname, { all: true });
    if (!addresses || addresses.length === 0) {
      throw new Error("Could not resolve host IP address.");
    }
    for (const record of addresses) {
      if (isDisallowedIp(record.address)) {
        throw new Error(
          `Target hostname resolves to a restricted IP (${record.address}).`,
        );
      }
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("restricted")) {
      throw err;
    }
    throw new Error("DNS resolution failed for target host.");
  }
}

/**
 * Fetches and parses OpenGraph and HTML meta tags from a URL.
 */
export async function getLinkPreview(
  rawUrl: string,
): Promise<LinkPreviewMetadata> {
  let targetUrl: URL;
  try {
    let normalized = rawUrl.trim();
    if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
      normalized = `https://${normalized}`;
    }
    targetUrl = new URL(normalized);
  } catch {
    throw new Error("Invalid URL format.");
  }

  const normalizedHref = targetUrl.href;
  const now = Date.now();

  // Check cache
  const cached = PREVIEW_CACHE.get(normalizedHref);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  // SSRF guard
  await assertSafeUrl(targetUrl);

  // Fetch page with bot User-Agent (widely supported by Twitter/FB/Slack previews)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(targetUrl.href, {
      method: "GET",
      headers: {
        "User-Agent":
          "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.html)",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: controller.signal,
      redirect: "follow",
    });
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Link preview fetch timed out.");
    }
    throw new Error("Failed to connect to target URL.");
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new Error(`Target returned HTTP ${response.status}`);
  }

  const contentType = (response.headers.get("content-type") || "").toLowerCase();
  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
    const domain = targetUrl.hostname.replace(/^www\./i, "");
    const result: LinkPreviewMetadata = {
      url: targetUrl.href,
      domain,
      title: domain,
    };
    return result;
  }

  // Stream up to MAX_BODY_BYTES
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  const reader = response.body?.getReader();
  if (reader) {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          totalBytes += value.length;
          if (totalBytes >= MAX_BODY_BYTES) {
            await reader.cancel();
            break;
          }
        }
      }
    } catch {
      // Stream cancellation or network termination is acceptable
    }
  }

  const merged = new Uint8Array(Math.min(totalBytes, MAX_BODY_BYTES));
  let offset = 0;
  for (const chunk of chunks) {
    const toCopy = Math.min(chunk.length, merged.length - offset);
    merged.set(chunk.subarray(0, toCopy), offset);
    offset += toCopy;
    if (offset >= merged.length) break;
  }
  const html = new TextDecoder("utf-8").decode(merged);

  // Extract meta tags via Bun native HTMLRewriter
  let ogTitle = "";
  let metaTitle = "";
  let ogDesc = "";
  let metaDesc = "";
  let twitterDesc = "";
  let ogImage = "";
  let icon = "";
  let siteName = "";

  const rewriter = new HTMLRewriter()
    .on("title", {
      text(t) {
        metaTitle += t.text;
      },
    })
    .on("meta", {
      element(el) {
        const prop = (el.getAttribute("property") || "").toLowerCase();
        const name = (el.getAttribute("name") || "").toLowerCase();
        const content = el.getAttribute("content") || "";

        if (
          (prop === "og:title" || name === "twitter:title") &&
          !ogTitle &&
          content
        ) {
          ogTitle = content.trim();
        }
        if (prop === "og:description" && !ogDesc && content) {
          ogDesc = content.trim();
        }
        if (name === "description" && !metaDesc && content) {
          metaDesc = content.trim();
        }
        if (name === "twitter:description" && !twitterDesc && content) {
          twitterDesc = content.trim();
        }
        if (
          (prop === "og:image" ||
            prop === "og:image:url" ||
            name === "twitter:image" ||
            name === "twitter:image:src") &&
          !ogImage &&
          content
        ) {
          ogImage = content.trim();
        }
        if (
          (prop === "og:site_name" || name === "application-name") &&
          !siteName &&
          content
        ) {
          siteName = content.trim();
        }
      },
    })
    .on("link", {
      element(el) {
        const rel = (el.getAttribute("rel") || "").toLowerCase();
        const href = el.getAttribute("href") || "";
        if (
          (rel.includes("apple-touch-icon") || rel.includes("icon")) &&
          !icon &&
          href
        ) {
          icon = href.trim();
        }
      },
    });

  const parsedResponse = rewriter.transform(new Response(html));
  await parsedResponse.text();

  const domain = targetUrl.hostname.replace(/^www\./i, "");
  const title = ogTitle || metaTitle.trim() || domain;
  const description = ogDesc || metaDesc || twitterDesc || undefined;

  let imageUrl: string | undefined;
  const candidateImage = ogImage || icon;
  if (candidateImage) {
    try {
      const resolved = new URL(candidateImage, targetUrl.href);
      if (resolved.protocol === "http:" || resolved.protocol === "https:") {
        imageUrl = resolved.href;
      }
    } catch {
      // Ignore unresolvable image URLs
    }
  }

  const result: LinkPreviewMetadata = {
    url: targetUrl.href,
    title,
    description: description ? description.slice(0, 300) : undefined,
    imageUrl,
    siteName: siteName || undefined,
    domain,
  };

  // Manage cache capacity
  if (PREVIEW_CACHE.size >= MAX_CACHE_ENTRIES) {
    const firstKey = PREVIEW_CACHE.keys().next().value;
    if (firstKey) PREVIEW_CACHE.delete(firstKey);
  }
  PREVIEW_CACHE.set(normalizedHref, {
    data: result,
    expiresAt: now + CACHE_TTL_MS,
  });

  return result;
}

/** Clear preview cache (useful for testing) */
export function clearPreviewCache(): void {
  PREVIEW_CACHE.clear();
}

