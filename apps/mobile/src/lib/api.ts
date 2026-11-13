import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// API Configuration
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "https://wateam.ayyansystems.com/api";

const TOKEN_KEY = "wateaminbox_access_token";
const REFRESH_TOKEN_KEY = "wateaminbox_refresh_token";
const COMPANY_KEY = "wateaminbox_company_id";

// Secure storage helpers
export async function getStoredToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setStoredToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getStoredRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setStoredRefreshToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
}

export async function getActiveCompanyId(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(COMPANY_KEY);
  } catch {
    return null;
  }
}

export async function setActiveCompanyId(companyId: string): Promise<void> {
  await SecureStore.setItemAsync(COMPANY_KEY, companyId);
}

export async function clearAuthTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  ]);
}

/**
 * Universal authenticated fetch wrapper with automatic token refresh
 */
export async function fetchWithAuth<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getStoredToken();
  const companyId = await getActiveCompanyId();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (companyId) {
    headers["X-Company-ID"] = companyId;
  }

  const url = endpoint.startsWith("http")
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  let response = await fetch(url, { ...options, headers });

  // Handle Token Refresh on 401
  if (response.status === 401) {
    const refreshToken = await getStoredRefreshToken();
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshRes.ok) {
          const data = (await refreshRes.json()) as {
            accessToken: string;
            refreshToken?: string;
          };
          await setStoredToken(data.accessToken);
          if (data.refreshToken) {
            await setStoredRefreshToken(data.refreshToken);
          }
          headers.Authorization = `Bearer ${data.accessToken}`;
          response = await fetch(url, { ...options, headers });
        } else {
          await clearAuthTokens();
        }
      } catch {
        await clearAuthTokens();
      }
    }
  }

  if (!response.ok) {
    let errorMessage = `Request failed: ${response.status} ${response.statusText}`;
    try {
      const errJson = (await response.json()) as { message?: string; error?: string };
      errorMessage = errJson.message || errJson.error || errorMessage;
    } catch {
      // ignore
    }
    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
}

// ==========================================
// API Methods
// ==========================================

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

export interface Workspace {
  id: string;
  name: string;
  role: string;
  logoUrl?: string;
}

export interface ConversationItem {
  id: string;
  contactId: string;
  jid: string;
  displayName: string;
  phoneNumber?: string;
  avatarUrl?: string;
  isGroup: boolean;
  unreadCount: number;
  status: "open" | "pending" | "resolved";
  assignedTo?: {
    id: string;
    name: string;
  } | null;
  lastMessage?: {
    id: string;
    content: string;
    type: string;
    timestamp: string;
    fromMe: boolean;
    status: string;
  } | null;
  labels?: Array<{ id: string; name: string; color: string }>;
}

export interface MessageItem {
  id: string;
  messageId: string;
  contactId: string;
  fromMe: boolean;
  senderName?: string;
  senderJid?: string;
  content: string;
  messageType: string;
  mediaUrl?: string;
  status: "pending" | "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  reactions?: Array<{ emoji: string; reactorJid: string; isOwn: boolean }>;
}

export interface ContactItem {
  id: string;
  name?: string;
  phone_number?: string;
  jid?: string;
  profile_picture_url?: string;
  is_group?: boolean;
  notes?: string;
  email?: string;
  created_at?: string;
  last_message?: {
    id: string;
    content: string;
    type: string;
    timestamp: string;
  } | null;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  created_at: string;
  data?: Record<string, any>;
}

export const api = {
  // Auth
  login: async (email: string, password: string) => {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Invalid email or password");
    }
    const data = await res.json();
    await setStoredToken(data.accessToken);
    if (data.refreshToken) await setStoredRefreshToken(data.refreshToken);
    if (data.companies?.[0]?.id) await setActiveCompanyId(data.companies[0].id);
    return data;
  },

  getWorkspaces: () => fetchWithAuth<{ companies: Workspace[] }>("/companies"),

  getCurrentUser: () => fetchWithAuth<{ user: UserProfile }>("/auth/me"),

  // Conversations
  getConversations: async (params?: {
    status?: "open" | "pending" | "resolved";
    search?: string;
    limit?: number;
    offset?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.status) q.append("status", params.status);
    if (params?.search) q.append("search", params.search);
    if (params?.limit) q.append("limit", params.limit.toString());
    if (params?.offset) q.append("offset", params.offset.toString());
    return fetchWithAuth<{ conversations: ConversationItem[] }>(
      `/conversations?${q.toString()}`,
    );
  },

  getMessages: (conversationId: string, limit = 50) =>
    fetchWithAuth<{ messages: MessageItem[] }>(
      `/conversations/${conversationId}/messages?limit=${limit}`,
    ),

  sendMessage: (
    conversationId: string,
    content: string,
    messageType: string = "text",
    mediaUrl?: string,
  ) =>
    fetchWithAuth<MessageItem>(`/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({
        content,
        messageType,
        mediaUrl,
      }),
    }),

  markAsRead: (conversationId: string) =>
    fetchWithAuth(`/conversations/${conversationId}/read`, {
      method: "POST",
    }),

  assignConversation: (conversationId: string, userId: string | null) =>
    fetchWithAuth(`/conversations/${conversationId}/assign`, {
      method: "POST",
      body: JSON.stringify({ userId }),
    }),

  resolveConversation: (conversationId: string, outcome = "resolved") =>
    fetchWithAuth(`/conversations/${conversationId}/resolve`, {
      method: "POST",
      body: JSON.stringify({ outcome }),
    }),

  reopenConversation: (conversationId: string) =>
    fetchWithAuth(`/conversations/${conversationId}/reopen`, {
      method: "POST",
    }),

  // Push Tokens
  registerDeviceToken: (token: string, deviceName?: string) =>
    fetchWithAuth("/notifications/devices", {
      method: "POST",
      body: JSON.stringify({
        token,
        platform: Platform.OS,
        deviceName,
      }),
    }),

  deregisterDeviceToken: (token: string) =>
    fetchWithAuth("/notifications/devices", {
      method: "DELETE",
      body: JSON.stringify({ token }),
    }),

  // Contacts
  getContacts: async (params?: {
    search?: string;
    limit?: number;
    offset?: number;
    includeGroups?: boolean;
  }) => {
    const q = new URLSearchParams();
    if (params?.search) q.append("search", params.search);
    if (params?.limit) q.append("limit", params.limit.toString());
    if (params?.offset) q.append("offset", params.offset.toString());
    if (params?.includeGroups !== undefined)
      q.append("includeGroups", params.includeGroups.toString());
    return fetchWithAuth<{ contacts: ContactItem[]; total: number }>(
      `/contacts?${q.toString()}`,
    );
  },

  // Notifications
  getNotifications: async (params?: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
  }) => {
    const q = new URLSearchParams();
    if (params?.limit) q.append("limit", params.limit.toString());
    if (params?.offset) q.append("offset", params.offset.toString());
    if (params?.unreadOnly !== undefined)
      q.append("unreadOnly", params.unreadOnly.toString());
    return fetchWithAuth<{
      data: AppNotification[];
      meta: { total: number; unreadCount: number };
    }>(`/notifications?${q.toString()}`);
  },

  markNotificationRead: (id: string) =>
    fetchWithAuth(`/notifications/${id}/read`, {
      method: "PATCH",
    }),

  markAllNotificationsRead: () =>
    fetchWithAuth("/notifications/read-all", {
      method: "POST",
    }),

  // Media Upload
  uploadMedia: async (fileUri: string, mimeType: string, fileName: string) => {
    const token = await getStoredToken();
    const companyId = await getActiveCompanyId();

    const formData = new FormData();
    formData.append("file", {
      uri: fileUri,
      name: fileName,
      type: mimeType,
    } as any);

    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (companyId) headers["X-Company-ID"] = companyId;

    const res = await fetch(`${API_BASE_URL}/media/upload`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to upload media");
    }

    const json = await res.json();
    return json.data as {
      mediaUrl: string;
      fileName: string;
      fileSize: number;
      mimeType: string;
      key: string;
    };
  },

  // Centrifugo Realtime Token
  getRealtimeToken: () =>
    fetchWithAuth<{ token: string; wsUrl: string }>("/realtime/token"),
};
