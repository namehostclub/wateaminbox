import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/hooks/analytics";
import { cn } from "@/lib/utils";

/**
 * All supported accent colors for stat cards
 */
export type StatCardColor =
  | "green"
  | "blue"
  | "orange"
  | "yellow"
  | "purple"
  | "slate"
  | "default";

const colorClasses: Record<StatCardColor, string> = {
  green:
    "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50",
  blue: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40",
  orange:
    "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40",
  yellow:
    "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/40",
  purple:
    "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40",
  slate:
    "text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-dark-tertiary",
  default:
    "text-emerald-700 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/40",
};

const waveGradients: Record<StatCardColor, { from: string; to: string }> = {
  green: { from: "#34d399", to: "#059669" },
  blue: { from: "#60a5fa", to: "#2563eb" },
  orange: { from: "#fbbf24", to: "#d97706" },
  yellow: { from: "#facc15", to: "#ca8a04" },
  purple: { from: "#c084fc", to: "#7c3aed" },
  slate: { from: "#94a3b8", to: "#475569" },
  default: { from: "#34d399", to: "#059669" },
};

/**
 * Props for the overview variant (icon above label, with border and wave effect)
 */
export interface StatCardOverviewProps {
  variant?: "overview";
  icon: ReactNode;
  label: string;
  value?: number;
  formattedValue?: string;
  subtitle?: string;
  isLoading: boolean;
  color?: StatCardColor;
}

/**
 * Props for the compact variant (icon inline with label, no border)
 */
export interface StatCardCompactProps {
  variant: "compact";
  icon: ReactNode;
  label: string;
  value: number;
  suffix?: string;
  detail?: string;
  color: Exclude<StatCardColor, "default">;
}

export type StatCardProps = StatCardOverviewProps | StatCardCompactProps;

/**
 * Unified stat card component supporting two variants:
 *
 * - `overview` (default): Icon above label, white background with border, loading state
 *   Used in DashboardStats for overview metrics
 *
 * - `compact`: Icon inline with label, gray background, optional suffix and detail
 *   Used in EngagementSection and ResolutionSection for metric grids
 */
export function StatCard(props: StatCardProps) {
  if (props.variant === "compact") {
    return <CompactStatCard {...props} />;
  }

  return <OverviewStatCard {...props} />;
}

/**
 * Overview variant - icon above label, with border, soft squircle badge, and decorative wave
 */
function OverviewStatCard({
  icon,
  label,
  value,
  formattedValue,
  subtitle,
  isLoading,
  color = "default",
}: StatCardOverviewProps) {
  const gradient = waveGradients[color] || waveGradients.default;
  const gradientId = `wave-grad-${color}-${label.replace(/\s+/g, "-").toLowerCase()}`;

  const displayValue =
    formattedValue !== undefined
      ? formattedValue
      : value !== undefined
      ? formatNumber(value)
      : "-";

  return (
    <div className="group relative flex min-h-[148px] flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-dark-border dark:bg-dark-secondary dark:hover:border-slate-700">
      {/* Decorative Wave at the Bottom */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-11 w-full overflow-hidden">
        <svg
          viewBox="0 0 200 45"
          preserveAspectRatio="none"
          className="h-full w-full opacity-35 transition-opacity duration-200 group-hover:opacity-50 dark:opacity-20 dark:group-hover:opacity-35"
        >
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={gradient.from} stopOpacity="0.15" />
              <stop offset="100%" stopColor={gradient.to} stopOpacity="0.55" />
            </linearGradient>
          </defs>
          <path
            d="M 0,28 C 45,12 75,38 115,22 C 155,7 180,30 200,18 L 200,45 L 0,45 Z"
            fill={`url(#${gradientId})`}
          />
        </svg>
      </div>

      <div>
        {/* Soft Pastel Squircle Icon Badge */}
        <div
          className={cn(
            "mb-3.5 flex h-10 w-10 items-center justify-center rounded-2xl transition-transform duration-200 group-hover:scale-105",
            colorClasses[color],
          )}
        >
          {icon}
        </div>

        {/* Uppercase Category Label */}
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-dark-text-secondary">
          {label}
        </p>
      </div>

      {/* Main Metric Value & Optional Subtitle */}
      <div className="relative z-10 mt-1">
        {isLoading ? (
          <Skeleton className="h-8 w-20 rounded-md" />
        ) : (
          <div>
            <p className="text-2xl font-extrabold tracking-tight text-slate-800 dark:text-white sm:text-3xl tabular-nums">
              {displayValue}
            </p>
            {subtitle && (
              <p className="mt-0.5 text-[11px] font-medium text-slate-400 dark:text-dark-text-secondary">
                {subtitle}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Compact variant - icon inline with label, no border
 */
function CompactStatCard({
  icon,
  label,
  value,
  suffix,
  detail,
  color,
}: StatCardCompactProps) {
  return (
    <div className="rounded-xl border border-[#e3e9e5] bg-[#fafcfb] p-4 dark:border-dark-border dark:bg-dark-tertiary/60">
      <div className="mb-3 flex items-center gap-2.5">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            colorClasses[color],
          )}
        >
          {icon}
        </div>
        <span className="text-xs font-medium text-[#65736d] dark:text-dark-text-secondary">
          {label}
        </span>
      </div>
      <p className="text-2xl font-semibold tracking-[-0.02em] text-[#203b32] tabular-nums dark:text-dark-text-primary">
        {formatNumber(value)}
        {suffix}
      </p>
      {detail && (
        <p className="mt-1 text-[11px] text-[#87928c] dark:text-dark-text-secondary">
          {detail}
        </p>
      )}
    </div>
  );
}
