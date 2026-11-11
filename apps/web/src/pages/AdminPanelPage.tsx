import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  ChevronDown,
  Copy,
  Database,
  HardDrive,
  KeyRound,
  Mail,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  UserCheck,
  Users,
  UserX,
} from "lucide-react";
import { useAuth } from "../contexts/auth-context";
import {
  type AdminOverview,
  type AdminUser,
  fetchAdminOverview,
  fetchAdminUsage,
  fetchAdminUsers,
  resetAdminUserPassword,
  setAdminUserStatus,
  type WorkspaceUsage,
} from "../lib/api/admin";

export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

interface UserActionsDropdownProps {
  user: AdminUser;
  isSelf: boolean;
  onResetPassword: (user: AdminUser) => void;
  onToggleStatus: (user: AdminUser, targetActive: boolean) => void;
}

function UserActionsDropdown({
  user,
  isSelf,
  onResetPassword,
  onToggleStatus,
}: UserActionsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(user.email);
    toast.success("Email copied to clipboard");
    setIsOpen(false);
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(user.id);
    toast.success("User ID copied to clipboard");
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-dark-border dark:bg-dark-tertiary dark:text-dark-text-primary dark:hover:bg-dark-elevated"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <span>Actions</span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-emerald-600" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 top-full z-50 mt-1.5 w-52 origin-top-right rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl ring-1 ring-black/5 focus:outline-none dark:border-dark-border dark:bg-dark-elevated dark:ring-white/10"
        >
          {/* Action: Reset Password */}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              onResetPassword(user);
            }}
            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:text-dark-text-primary dark:hover:bg-dark-tertiary"
          >
            <KeyRound className="h-4 w-4 text-slate-500" />
            <span>Reset Password</span>
          </button>

          {/* Action: Toggle Active / Deactivate */}
          {!isSelf ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                onToggleStatus(user, !user.isActive);
              }}
              className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs font-medium transition ${
                user.isActive
                  ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                  : "text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
              }`}
            >
              {user.isActive ? (
                <>
                  <UserX className="h-4 w-4 text-red-500" />
                  <span>Deactivate Account</span>
                </>
              ) : (
                <>
                  <UserCheck className="h-4 w-4 text-emerald-500" />
                  <span>Activate Account</span>
                </>
              )}
            </button>
          ) : (
            <div
              className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs font-medium text-slate-400 cursor-not-allowed dark:text-slate-600"
              title="Cannot deactivate your own account"
            >
              <UserX className="h-4 w-4 opacity-50" />
              <span>Deactivate (Self)</span>
            </div>
          )}

          <div className="my-1 border-t border-slate-100 dark:border-dark-border" />

          {/* Action: Copy Email */}
          <button
            type="button"
            role="menuitem"
            onClick={handleCopyEmail}
            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:text-dark-text-secondary dark:hover:bg-dark-tertiary"
          >
            <Mail className="h-4 w-4 text-slate-400" />
            <span>Copy Email Address</span>
          </button>

          {/* Action: Copy User ID */}
          <button
            type="button"
            role="menuitem"
            onClick={handleCopyId}
            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:text-dark-text-secondary dark:hover:bg-dark-tertiary"
          >
            <Copy className="h-4 w-4 text-slate-400" />
            <span>Copy User ID</span>
          </button>
        </div>
      )}
    </div>
  );
}

export function AdminPanelPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const isAuthorizedSuperAdmin =
    user?.email?.toLowerCase().trim() === "info@namehostclub.com" &&
    user?.isSuperAdmin === true;

  useEffect(() => {
    if (!isAuthorizedSuperAdmin) {
      navigate("/workspaces", { replace: true });
    }
  }, [isAuthorizedSuperAdmin, navigate]);

  const [activeTab, setActiveTab] = useState<"overview" | "users" | "usage">(
    "overview",
  );
  const [isLoading, setIsLoading] = useState(true);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usage, setUsage] = useState<WorkspaceUsage[]>([]);

  // User filters & search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">(
    "all",
  );

  // Password reset modal state
  const [passwordResetUser, setPasswordResetUser] = useState<AdminUser | null>(
    null,
  );
  const [newPassword, setNewPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  // Status toggle confirmation modal state
  const [statusConfirmUser, setStatusConfirmUser] = useState<{
    user: AdminUser;
    targetActive: boolean;
  } | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [overviewData, usersData, usageData] = await Promise.all([
        fetchAdminOverview(),
        fetchAdminUsers(searchQuery, statusFilter),
        fetchAdminUsage(),
      ]);
      setOverview(overviewData);
      setUsers(usersData);
      setUsage(usageData);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load admin data";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleStatus = async () => {
    if (!statusConfirmUser) return;
    setIsUpdatingStatus(true);
    try {
      await setAdminUserStatus(
        statusConfirmUser.user.id,
        statusConfirmUser.targetActive,
      );
      toast.success(
        `User ${statusConfirmUser.user.email} was ${
          statusConfirmUser.targetActive ? "activated" : "deactivated"
        }.`,
      );
      setStatusConfirmUser(null);
      await loadData();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update user status";
      toast.error(message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordResetUser) return;
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }
    setIsResetting(true);
    try {
      await resetAdminUserPassword(passwordResetUser.id, newPassword);
      toast.success(`Password reset for ${passwordResetUser.email}.`);
      setPasswordResetUser(null);
      setNewPassword("");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to reset password";
      toast.error(message);
    } finally {
      setIsResetting(false);
    }
  };

  if (!isAuthorizedSuperAdmin) {
    return null;
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-slate-50 text-slate-900 dark:bg-dark-primary dark:text-dark-text-primary">
      {/* Top Admin Header */}
      <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm dark:border-dark-border dark:bg-dark-secondary">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate("/workspaces")}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-dark-border dark:bg-dark-tertiary dark:text-dark-text-secondary dark:hover:bg-dark-elevated"
            title="Return to user workspace"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to App
          </button>
          <div className="h-5 w-px bg-slate-200 dark:bg-dark-border" />
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight text-slate-900 dark:text-white">
                Super Admin Control Panel
              </h1>
              <p className="text-[11px] font-medium text-slate-500 dark:text-dark-text-secondary">
                WATeamInbox Global Management
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-300 sm:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Signed in as: <strong className="font-semibold">{user?.email}</strong>
          </div>

          <button
            type="button"
            onClick={() => void loadData()}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 dark:border-dark-border dark:bg-dark-tertiary dark:text-dark-text-primary dark:hover:bg-dark-elevated"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="border-b border-slate-200 bg-white px-6 dark:border-dark-border dark:bg-dark-secondary">
        <div className="flex gap-8">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-2 border-b-2 py-3.5 text-sm font-semibold transition-colors ${
              activeTab === "overview"
                ? "border-emerald-600 text-emerald-700 dark:border-emerald-500 dark:text-emerald-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-dark-text-secondary dark:hover:text-white"
            }`}
          >
            <Activity className="h-4 w-4" />
            Overview Dashboard
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-2 border-b-2 py-3.5 text-sm font-semibold transition-colors ${
              activeTab === "users"
                ? "border-emerald-600 text-emerald-700 dark:border-emerald-500 dark:text-emerald-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-dark-text-secondary dark:hover:text-white"
            }`}
          >
            <Users className="h-4 w-4" />
            User Management ({users.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("usage")}
            className={`flex items-center gap-2 border-b-2 py-3.5 text-sm font-semibold transition-colors ${
              activeTab === "usage"
                ? "border-emerald-600 text-emerald-700 dark:border-emerald-500 dark:text-emerald-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-dark-text-secondary dark:hover:text-white"
            }`}
          >
            <Database className="h-4 w-4" />
            Data Usage & Storage ({usage.length})
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Metric Cards Grid */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Users Card */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-dark-border dark:bg-dark-secondary">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-dark-text-secondary">
                      Total Users
                    </p>
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                      <Users className="h-5 w-5" />
                    </div>
                  </div>
                  <p className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">
                    {overview?.users.total ?? 0}
                  </p>
                  <div className="mt-3 flex items-center gap-3 text-xs text-slate-600 dark:text-dark-text-secondary">
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                      <UserCheck className="h-3.5 w-3.5" />
                      {overview?.users.active ?? 0} active
                    </span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1 text-slate-400">
                      <UserX className="h-3.5 w-3.5" />
                      {overview?.users.inactive ?? 0} inactive
                    </span>
                  </div>
                </div>

                {/* Workspaces Card */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-dark-border dark:bg-dark-secondary">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-dark-text-secondary">
                      Workspaces
                    </p>
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
                      <Building2 className="h-5 w-5" />
                    </div>
                  </div>
                  <p className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">
                    {overview?.workspaces.total ?? 0}
                  </p>
                  <p className="mt-3 text-xs text-slate-500 dark:text-dark-text-secondary">
                    <strong className="font-semibold text-purple-600 dark:text-purple-400">
                      {overview?.workspaces.active ?? 0}
                    </strong>{" "}
                    active multi-tenant instances
                  </p>
                </div>

                {/* Total Messages Card */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-dark-border dark:bg-dark-secondary">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-dark-text-secondary">
                      Total Messages
                    </p>
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                      <MessageSquare className="h-5 w-5" />
                    </div>
                  </div>
                  <p className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">
                    {overview?.dataUsage.totalMessages.toLocaleString() ?? 0}
                  </p>
                  <div className="mt-3 flex items-center gap-3 text-xs text-slate-600 dark:text-dark-text-secondary">
                    <span>
                      In:{" "}
                      <strong className="font-semibold text-slate-800 dark:text-slate-200">
                        {overview?.dataUsage.inboundMessages.toLocaleString() ??
                          0}
                      </strong>
                    </span>
                    <span>·</span>
                    <span>
                      Out:{" "}
                      <strong className="font-semibold text-slate-800 dark:text-slate-200">
                        {overview?.dataUsage.outboundMessages.toLocaleString() ??
                          0}
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Media Storage Card */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-dark-border dark:bg-dark-secondary">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-dark-text-secondary">
                      Media Storage
                    </p>
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                      <HardDrive className="h-5 w-5" />
                    </div>
                  </div>
                  <p className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">
                    {formatBytes(overview?.dataUsage.totalStorageBytes ?? 0)}
                  </p>
                  <p className="mt-3 text-xs text-slate-500 dark:text-dark-text-secondary">
                    Across{" "}
                    <strong className="font-semibold text-amber-600 dark:text-amber-400">
                      {overview?.dataUsage.totalMediaFiles.toLocaleString() ??
                        0}
                    </strong>{" "}
                    attachments & media
                  </p>
                </div>
              </div>

              {/* Two Column Layout: Recent Users & Largest Workspaces */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Recent Users Card */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-dark-border dark:bg-dark-secondary">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-dark-border">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      Recent Signups
                    </h2>
                    <button
                      type="button"
                      onClick={() => setActiveTab("users")}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                    >
                      View All Users →
                    </button>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-dark-border">
                    {overview?.recentUsers.map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center justify-between py-3.5"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700 dark:bg-dark-tertiary dark:text-slate-200">
                            {u.name?.slice(0, 1).toUpperCase() ||
                              u.email.slice(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">
                              {u.name || "Unnamed"}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-dark-text-secondary">
                              {u.email}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span
                            className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold ${
                              u.isActive !== false
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300"
                            }`}
                          >
                            {u.isActive !== false ? "Active" : "Deactivated"}
                          </span>
                          <p className="mt-1 text-[11px] text-slate-400">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Platform Workspaces Summary */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-dark-border dark:bg-dark-secondary">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-dark-border">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      Workspaces & Storage Top
                    </h2>
                    <button
                      type="button"
                      onClick={() => setActiveTab("usage")}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                    >
                      View Usage Breakdown →
                    </button>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-dark-border">
                    {usage.slice(0, 5).map((w) => (
                      <div
                        key={w.companyId}
                        className="flex items-center justify-between py-3.5"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 font-bold text-xs">
                            {w.companyName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">
                              {w.companyName}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-dark-text-secondary">
                              Owner: {w.owner?.email || "Unknown"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-900 dark:text-white">
                            {formatBytes(w.storageBytes)}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-dark-text-secondary">
                            {w.totalMessages.toLocaleString()} msgs ·{" "}
                            {w.memberCount} members
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: USER MANAGEMENT */}
          {activeTab === "users" && (
            <div className="space-y-4">
              {/* Search & Filters */}
              <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-dark-border dark:bg-dark-secondary sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by email or name..."
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-dark-border dark:bg-dark-tertiary dark:text-white dark:focus:bg-dark-elevated"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500 dark:text-dark-text-secondary">
                    Status:
                  </span>
                  {(["all", "active", "inactive"] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setStatusFilter(status)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                        statusFilter === status
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-dark-border dark:bg-dark-tertiary dark:text-dark-text-secondary dark:hover:bg-dark-elevated"
                      }`}
                    >
                      {status === "all"
                        ? "All Users"
                        : status === "active"
                        ? "Active"
                        : "Deactivated"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Users Table */}
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-dark-border dark:bg-dark-secondary min-h-[340px]">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-dark-border text-left">
                  <thead className="bg-slate-50 dark:bg-dark-tertiary text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-dark-text-secondary">
                    <tr>
                      <th className="px-5 py-3.5 rounded-tl-xl">User, Workspaces & Storage</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5">Storage & Activity</th>
                      <th className="px-5 py-3.5">Verified</th>
                      <th className="px-5 py-3.5">Registered</th>
                      <th className="px-5 py-3.5 text-right rounded-tr-xl">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-dark-border text-sm">
                    {users.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-5 py-12 text-center text-slate-500 dark:text-dark-text-secondary"
                        >
                          No users found matching your search criteria.
                        </td>
                      </tr>
                    ) : (
                      users.map((u) => {
                        const isSelf = u.id === user?.id;
                        return (
                          <tr
                            key={u.id}
                            className="hover:bg-slate-50/70 dark:hover:bg-dark-tertiary/50 transition-colors"
                          >
                            <td className="px-5 py-4">
                              <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                  {u.name?.slice(0, 1).toUpperCase() ||
                                    u.email.slice(0, 1).toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1 space-y-2">
                                  <div>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-semibold text-slate-900 dark:text-white">
                                        {u.name || "Unnamed"}
                                      </span>
                                      {u.isSuperAdmin && (
                                        <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                                          Super Admin
                                        </span>
                                      )}
                                      {isSelf && (
                                        <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                                          You
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-dark-text-secondary">
                                      {u.email}
                                    </p>
                                  </div>

                                  {/* Workspaces & Storage directly under the user */}
                                  <div className="pt-1.5 border-t border-slate-100 dark:border-dark-border/60">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      {u.workspaces.length === 0 ? (
                                        <span className="text-xs text-slate-400 italic">
                                          No workspaces assigned
                                        </span>
                                      ) : (
                                        u.workspaces.map((w) => (
                                          <div
                                            key={w.companyId}
                                            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200/80 bg-slate-50 px-2 py-1 text-xs text-slate-700 dark:border-dark-border dark:bg-dark-tertiary dark:text-dark-text-primary shadow-xs"
                                          >
                                            <Building2 className="h-3 w-3 text-slate-400" />
                                            <span className="font-medium text-slate-800 dark:text-slate-200">
                                              {w.companyName}
                                            </span>
                                            <span className="text-[10px] text-slate-400 capitalize">
                                              ({w.role})
                                            </span>
                                            <span className="text-slate-300 dark:text-slate-600">·</span>
                                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                                              <HardDrive className="h-3 w-3" />
                                              {formatBytes(w.storageBytes || 0)}
                                            </span>
                                          </div>
                                        ))
                                      )}
                                      {u.workspaces.length > 0 && (
                                        <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                                          Total: {formatBytes(u.totalStorageBytes || 0)}
                                          {u.totalMessages ? ` (${u.totalMessages.toLocaleString()} msgs)` : ""}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-4 align-top">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                                  u.isActive
                                    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-950/50 dark:text-emerald-300"
                                    : "bg-red-50 text-red-700 ring-1 ring-red-600/20 dark:bg-red-950/50 dark:text-red-300"
                                }`}
                              >
                                {u.isActive ? (
                                  <>
                                    <UserCheck className="h-3 w-3" />
                                    Active
                                  </>
                                ) : (
                                  <>
                                    <UserX className="h-3 w-3" />
                                    Deactivated
                                  </>
                                )}
                              </span>
                            </td>

                            <td className="px-5 py-4 align-top">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                                  <HardDrive className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                  <span>{formatBytes(u.totalStorageBytes || 0)}</span>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-dark-text-secondary">
                                  {(u.totalMessages || 0).toLocaleString()} messages
                                </p>
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              {u.emailVerified ? (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                  <CheckCircle2 className="h-4 w-4" />
                                  Verified
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                                  <AlertCircle className="h-4 w-4" />
                                  Pending
                                </span>
                              )}
                            </td>

                            <td className="px-5 py-4 text-xs text-slate-500 dark:text-dark-text-secondary">
                              {new Date(u.createdAt).toLocaleDateString()}
                            </td>

                            <td className="px-5 py-4 text-right align-top">
                              <div className="flex items-center justify-end">
                                <UserActionsDropdown
                                  user={u}
                                  isSelf={isSelf}
                                  onResetPassword={(targetUser) => {
                                    setPasswordResetUser(targetUser);
                                    setNewPassword("");
                                  }}
                                  onToggleStatus={(targetUser, targetActive) => {
                                    setStatusConfirmUser({
                                      user: targetUser,
                                      targetActive,
                                    });
                                  }}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: DATA USAGE & STORAGE */}
          {activeTab === "usage" && (
            <div className="space-y-6">
              {/* Summary Banner */}
              <div className="flex flex-col gap-4 rounded-xl border border-emerald-200 bg-emerald-50/70 p-6 dark:border-emerald-900/40 dark:bg-emerald-950/20 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-emerald-950 dark:text-emerald-200">
                    Multi-Tenant Storage & Data Usage
                  </h2>
                  <p className="mt-1 text-xs text-emerald-800 dark:text-emerald-300/80">
                    Each company workspace operates in an isolated PostgreSQL
                    schema (`tenant_...`). Storage metrics represent database
                    messages and stored media objects.
                  </p>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <p className="text-xs uppercase font-semibold text-emerald-800/80 dark:text-emerald-400">
                      Total Storage
                    </p>
                    <p className="text-2xl font-black text-emerald-950 dark:text-white">
                      {formatBytes(overview?.dataUsage.totalStorageBytes ?? 0)}
                    </p>
                  </div>
                  <div className="h-8 w-px bg-emerald-200 dark:bg-emerald-800/40" />
                  <div>
                    <p className="text-xs uppercase font-semibold text-emerald-800/80 dark:text-emerald-400">
                      Total Messages
                    </p>
                    <p className="text-2xl font-black text-emerald-950 dark:text-white">
                      {overview?.dataUsage.totalMessages.toLocaleString() ?? 0}
                    </p>
                  </div>
                </div>
              </div>

              {/* Workspace Usage Table */}
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-dark-border dark:bg-dark-secondary">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-dark-border text-left">
                  <thead className="bg-slate-50 dark:bg-dark-tertiary text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-dark-text-secondary">
                    <tr>
                      <th className="px-5 py-3.5">Workspace</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5">Owner</th>
                      <th className="px-5 py-3.5 text-center">Channels</th>
                      <th className="px-5 py-3.5 text-center">Members</th>
                      <th className="px-5 py-3.5 text-center">Contacts</th>
                      <th className="px-5 py-3.5 text-right">Messages</th>
                      <th className="px-5 py-3.5 text-right">Storage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-dark-border text-sm">
                    {usage.map((w) => (
                      <tr
                        key={w.companyId}
                        className="hover:bg-slate-50/70 dark:hover:bg-dark-tertiary/50 transition-colors"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-xs font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                              {w.companyName.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-white">
                                {w.companyName}
                              </p>
                              <p className="text-[11px] font-mono text-slate-400">
                                {w.companyId.slice(0, 8)}...
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${
                              w.status === "active"
                                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-950/50 dark:text-emerald-300"
                                : "bg-slate-100 text-slate-600 dark:bg-dark-tertiary dark:text-slate-400"
                            }`}
                          >
                            {w.status}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm text-slate-900 dark:text-white">
                            {w.owner?.name || "Workspace Owner"}
                          </p>
                          <p className="text-xs text-slate-400">
                            {w.owner?.email || "No owner"}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-center">
                          <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                            <Smartphone className="h-3.5 w-3.5 text-slate-400" />
                            {w.connectionsCount}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-center font-medium text-slate-700 dark:text-slate-300">
                          {w.memberCount}
                        </td>

                        <td className="px-5 py-4 text-center font-medium text-slate-700 dark:text-slate-300">
                          {w.contactsCount.toLocaleString()}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <p className="font-bold text-slate-900 dark:text-white">
                            {w.totalMessages.toLocaleString()}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {w.inboundMessages.toLocaleString()} in ·{" "}
                            {w.outboundMessages.toLocaleString()} out
                          </p>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <p className="font-extrabold text-emerald-700 dark:text-emerald-400">
                            {formatBytes(w.storageBytes)}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {w.mediaCount.toLocaleString()} media files
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Password Reset Modal */}
      {passwordResetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-dark-secondary dark:border dark:border-dark-border">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Reset User Password
                </h3>
                <p className="text-xs text-slate-500 dark:text-dark-text-secondary">
                  Target user: {passwordResetUser.email}
                </p>
              </div>
            </div>

            <form onSubmit={handleResetPassword} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  New Password (min 8 characters)
                </label>
                <input
                  type="text"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new secure password..."
                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-dark-border dark:bg-dark-tertiary dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPasswordResetUser(null)}
                  disabled={isResetting}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-dark-border dark:text-slate-300 dark:hover:bg-dark-tertiary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResetting || newPassword.length < 8}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isResetting ? "Updating..." : "Save Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deactivate / Activate Confirm Modal */}
      {statusConfirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-dark-secondary dark:border dark:border-dark-border">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  statusConfirmUser.targetActive
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                    : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                }`}
              >
                {statusConfirmUser.targetActive ? (
                  <UserCheck className="h-5 w-5" />
                ) : (
                  <ShieldAlert className="h-5 w-5" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {statusConfirmUser.targetActive
                    ? "Activate User Account"
                    : "Deactivate User Account"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-dark-text-secondary">
                  {statusConfirmUser.user.email}
                </p>
              </div>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-slate-600 dark:text-dark-text-secondary">
              {statusConfirmUser.targetActive
                ? "This user will regain full access to their workspaces and be permitted to sign in."
                : "Deactivating this user will IMMEDIATELY terminate all their active web and mobile sessions and block them from logging in."}
            </p>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setStatusConfirmUser(null)}
                disabled={isUpdatingStatus}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-dark-border dark:text-slate-300 dark:hover:bg-dark-tertiary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleToggleStatus}
                disabled={isUpdatingStatus}
                className={`rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-sm transition ${
                  statusConfirmUser.targetActive
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {isUpdatingStatus
                  ? "Processing..."
                  : statusConfirmUser.targetActive
                  ? "Confirm Activation"
                  : "Confirm Deactivation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

