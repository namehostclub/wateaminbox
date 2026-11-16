import React, { useState } from "react";
import type { LinkPreviewMetadata } from "@wateaminbox/shared";
import { ExternalLink, Globe, Loader2, X } from "lucide-react";

interface LinkPreviewCardProps {
  preview: LinkPreviewMetadata;
  variant?: "composer" | "bubble";
  isLoading?: boolean;
  onDismiss?: () => void;
  isOwn?: boolean;
}

export const LinkPreviewCard: React.FC<LinkPreviewCardProps> = ({
  preview,
  variant = "bubble",
  isLoading = false,
  onDismiss,
  isOwn = false,
}) => {
  const [imageError, setImageError] = useState(false);

  if (isLoading) {
    return (
      <div className="flex animate-in fade-in-0 duration-150 items-center gap-3 rounded-xl border border-black/[0.08] bg-white p-2.5 shadow-sm dark:border-white/[0.08] dark:bg-dark-elevated">
        <div className="flex size-14 shrink-0 animate-pulse items-center justify-center rounded-lg bg-black/[0.06] dark:bg-white/[0.08]">
          <Loader2 className="size-5 animate-spin text-[#8696a0]" />
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="h-4 w-3/4 animate-pulse rounded bg-black/[0.08] dark:bg-white/[0.1]" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-black/[0.05] dark:bg-white/[0.06]" />
          <div className="h-2.5 w-1/3 animate-pulse rounded bg-black/[0.04] dark:bg-white/[0.05]" />
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="grid size-7 shrink-0 place-items-center rounded-full text-[#8696a0] transition-colors hover:bg-black/[0.05] hover:text-[#54656f] dark:hover:bg-white/[0.08] dark:hover:text-[#e9edef]"
            aria-label="Dismiss link preview"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
    );
  }

  const hasImage = Boolean(preview.imageUrl && !imageError);

  if (variant === "composer") {
    return (
      <div className="group relative flex animate-in fade-in-0 duration-150 items-start gap-3 overflow-hidden rounded-xl border border-black/[0.08] bg-white p-2.5 shadow-sm transition-all dark:border-white/[0.08] dark:bg-dark-elevated">
        {/* Left: Thumbnail / Logo */}
        <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-black/[0.06] bg-[#f0f2f5] shadow-sm dark:border-white/[0.06] dark:bg-dark-secondary">
          {hasImage ? (
            <img
              src={preview.imageUrl}
              alt={preview.title || preview.domain}
              className="size-full object-cover"
              onError={() => setImageError(true)}
              loading="lazy"
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-black/[0.03] text-[#8696a0] dark:bg-white/[0.04]">
              <Globe className="size-7 stroke-[1.5]" />
            </div>
          )}
        </div>

        {/* Center: Info */}
        <div className="min-w-0 flex-1 pr-6">
          <h4 className="line-clamp-1 text-sm font-semibold text-[#111b21] dark:text-[#e9edef]">
            {preview.title || preview.domain}
          </h4>
          {preview.description && (
            <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-[#667781] dark:text-[#8696a0]">
              {preview.description}
            </p>
          )}
          <p className="mt-1 text-[11px] font-normal text-[#8696a0] dark:text-dark-text-tertiary">
            {preview.domain}
          </p>
        </div>

        {/* Right: Dismiss (X) */}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="absolute right-2 top-2 grid size-7 place-items-center rounded-full text-[#8696a0] transition-colors hover:bg-black/[0.08] hover:text-[#54656f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00a884]/40 dark:hover:bg-white/[0.1] dark:hover:text-[#e9edef]"
            aria-label="Dismiss link preview"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
    );
  }

  // Variant: "bubble" (inside chat message thread)
  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`group block overflow-hidden rounded-xl border transition-all ${
        isOwn
          ? "border-emerald-600/15 bg-emerald-700/[0.07] hover:bg-emerald-700/[0.12] dark:border-emerald-400/20 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30"
          : "border-black/[0.06] bg-black/[0.03] hover:bg-black/[0.06] dark:border-white/[0.08] dark:bg-white/[0.05] dark:hover:bg-white/[0.08]"
      }`}
    >
      <div className="flex items-center gap-3 p-2.5">
        {/* Left: Thumbnail / Logo */}
        <div className="relative size-14 shrink-0 overflow-hidden rounded-lg border border-black/[0.06] bg-white shadow-xs dark:border-white/[0.06] dark:bg-dark-elevated">
          {hasImage ? (
            <img
              src={preview.imageUrl}
              alt={preview.title || preview.domain}
              className="size-full object-cover"
              onError={() => setImageError(true)}
              loading="lazy"
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-black/[0.03] text-[#8696a0] dark:bg-white/[0.04]">
              <Globe className="size-6 stroke-[1.5]" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <h4 className="line-clamp-1 text-sm font-semibold text-[#111b21] group-hover:text-[#008069] dark:text-[#e9edef] dark:group-hover:text-emerald-300">
              {preview.title || preview.domain}
            </h4>
            <ExternalLink className="size-3 shrink-0 text-[#8696a0] opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
          {preview.description && (
            <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-[#667781] dark:text-[#8696a0]">
              {preview.description}
            </p>
          )}
          <p className="mt-1 text-[11px] font-normal text-[#8696a0] dark:text-dark-text-tertiary">
            {preview.domain}
          </p>
        </div>
      </div>
    </a>
  );
};

