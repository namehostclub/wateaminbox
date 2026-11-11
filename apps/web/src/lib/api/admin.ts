import { fetchWithAuth } from "./client";

export interface AdminOverview {
  users: {
    total: number;
    active: number;
    inactive: number;
  };
  workspaces: {
    total: number;
    active: number;
  };
  dataUsage: {
    totalMessages: number;
    inboundMessages: number;
    outboundMessages: number;
    totalMediaFiles: number;
    totalStorageBytes: number;
    totalConnections: number;
    totalContacts: number;
  };
  recentUsers: Array<{
    id: string;
    email: string;
    name: string | null;
    avatarUrl?: string;
    emailVerified: boolean;
    createdAt: string;
    isActive?: boolean;
    isSuperAdmin?: boolean;
  }>;
}

export interface AdminUserWorkspace {
  companyId: string;
  companyName: string;
  role: string;
  joinedAt: string;
  storageBytes?: number;
  totalMessages?: number;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl?: string;
  emailVerified: boolean;
  isActive: boolean;
  isSuperAdmin: boolean;
  createdAt: string;
  updatedAt: string;
  lastActiveAt: string | null;
  workspaces: AdminUserWorkspace[];
  totalStorageBytes?: number;
  totalMessages?: number;
}

export interface WorkspaceUsage {
  companyId: string;
  companyName: string;
  status: string;
  createdAt: string;
  owner: {
    id: string;
    email: string;
    name: string | null;
  } | null;
  memberCount: number;
  totalMessages: number;
  inboundMessages: number;
  outboundMessages: number;
  mediaCount: number;
  storageBytes: number;
  contactsCount: number;
  connectionsCount: number;
}

export async function fetchAdminOverview(): Promise<AdminOverview> {
  return fetchWithAuth<AdminOverview>("/admin/overview");
}

export async function fetchAdminUsers(
  search?: string,
  status?: string,
): Promise<AdminUser[]> {
  const params = new URLSearchParams();
  if (search) params.append("search", search);
  if (status && status !== "all") params.append("status", status);
  const query = params.toString() ? `?${params.toString()}` : "";
  return fetchWithAuth<AdminUser[]>(`/admin/users${query}`);
}

export async function setAdminUserStatus(
  userId: string,
  isActive: boolean,
): Promise<{ userId: string; isActive: boolean }> {
  return fetchWithAuth<{ userId: string; isActive: boolean }>(
    `/admin/users/${userId}/status`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    },
  );
}

export async function resetAdminUserPassword(
  userId: string,
  newPassword: string,
): Promise<{ message: string }> {
  return fetchWithAuth<{ message: string }>(
    `/admin/users/${userId}/reset-password`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword }),
    },
  );
}

export async function fetchAdminUsage(): Promise<WorkspaceUsage[]> {
  return fetchWithAuth<WorkspaceUsage[]>("/admin/usage");
}

