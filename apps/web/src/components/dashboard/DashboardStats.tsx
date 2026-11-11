import {
  Clock,
  Database,
  Inbox,
  MessageSquare,
  Send,
  UserCheck,
  Users,
} from "lucide-react";
import { formatBytes } from "@/hooks/analytics";
import { StatCard } from "./StatCard";
import { useTranslation } from "react-i18next";

export interface DashboardStatsData {
  totalMessages?: number;
  totalContacts?: number;
  activeUsers?: number;
  messagesSentToday?: number;
  messagesReceivedToday?: number;
  unreadConversations?: number;
  storageBytes?: number;
  storageLimitBytes?: number;
  storageUsagePercent?: number;
  storageMediaFiles?: number;
}

export interface DashboardStatsProps {
  data: DashboardStatsData | undefined;
  isLoading: boolean;
  isError?: boolean;
}

/**
 * Overview stat cards for the dashboard
 * Shows total messages, contacts, active team, sent/received today, unread count, and storage usage
 */
export function DashboardStats({
  data,
  isLoading,
  isError = false,
}: DashboardStatsProps) {
  const { t } = useTranslation();

  if (isError) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-red-200 bg-red-50 px-4 py-5 text-center text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
      >
        {t(
          "dashboard.statsLoadFailed",
          "We couldn’t load the operational overview. Please try again shortly.",
        )}
      </div>
    );
  }

  const storageLimit = data?.storageLimitBytes || 5 * 1024 * 1024 * 1024; // 5 GB default
  const storageBytes = data?.storageBytes || 0;
  const storagePercent =
    data?.storageUsagePercent !== undefined
      ? data.storageUsagePercent
      : Math.min(100, Math.round((storageBytes / storageLimit) * 100));

  const storageDisplay =
    data?.storageUsagePercent !== undefined
      ? `${data.storageUsagePercent}%`
      : storageBytes > 0 && storagePercent === 0
      ? "<1%"
      : `${storagePercent}%`;

  const storageSubtitle = `${formatBytes(storageBytes)} / ${formatBytes(storageLimit)}`;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 xl:grid-cols-7">
      <StatCard
        icon={<MessageSquare className="h-5 w-5" />}
        label={t("dashboard.totalMessages", "Total Messages")}
        value={data?.totalMessages}
        isLoading={isLoading}
        color="default"
      />
      <StatCard
        icon={<Users className="h-5 w-5" />}
        label={t("dashboard.totalContacts", "Total Contacts")}
        value={data?.totalContacts}
        isLoading={isLoading}
        color="slate"
      />
      <StatCard
        icon={<UserCheck className="h-5 w-5" />}
        label={t("dashboard.teamMembers", "Team Members")}
        value={data?.activeUsers}
        isLoading={isLoading}
        color="purple"
      />
      <StatCard
        icon={<Send className="h-5 w-5" />}
        label={t("dashboard.sentToday", "Sent Today")}
        value={data?.messagesSentToday}
        isLoading={isLoading}
        color="green"
      />
      <StatCard
        icon={<Inbox className="h-5 w-5" />}
        label={t("dashboard.receivedToday", "Received Today")}
        value={data?.messagesReceivedToday}
        isLoading={isLoading}
        color="blue"
      />
      <StatCard
        icon={<Clock className="h-5 w-5" />}
        label={t("dashboard.unread", "Unread")}
        value={data?.unreadConversations}
        isLoading={isLoading}
        color="orange"
      />
      <StatCard
        icon={<Database className="h-5 w-5" />}
        label={t("dashboard.storageUsage", "Storage Usage")}
        formattedValue={storageDisplay}
        subtitle={storageSubtitle}
        isLoading={isLoading}
        color="purple"
      />
    </div>
  );
}
