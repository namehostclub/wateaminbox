import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
  Archive,
  CheckCheck,
  CheckCircle2,
  Clock,
  Filter,
  Inbox as InboxIcon,
  MessageSquare,
  RefreshCw,
  Search,
  User,
  Users,
} from "lucide-react-native";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { api, ConversationItem } from "../../src/lib/api";
import { useAuthStore } from "../../src/stores/auth";

type FilterStatus = "open" | "pending" | "resolved" | "all";

export default function InboxScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { activeWorkspace } = useAuthStore();
  const [selectedStatus, setSelectedStatus] = useState<FilterStatus>("open");
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: [
      "conversations",
      activeWorkspace?.id,
      selectedStatus,
      searchQuery,
    ],
    queryFn: async () => {
      const statusParam =
        selectedStatus === "all" ? undefined : selectedStatus;
      const res = await api.getConversations({
        status: statusParam,
        search: searchQuery.trim() || undefined,
        limit: 50,
      });
      return res.conversations || [];
    },
    enabled: !!activeWorkspace?.id,
  });

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const formatTime = (isoString?: string) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const renderConversationItem = ({ item }: { item: ConversationItem }) => {
    const isUnread = item.unreadCount > 0;

    return (
      <TouchableOpacity
        style={[styles.itemContainer, isUnread && styles.itemUnread]}
        activeOpacity={0.7}
        onPress={() => {
          router.push(`/chat/${item.id}`);
        }}
      >
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {item.avatarUrl ? (
            <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              {item.isGroup ? (
                <Users color="#8696a0" size={24} />
              ) : (
                <User color="#8696a0" size={24} />
              )}
            </View>
          )}
          {item.isGroup && (
            <View style={styles.groupBadge}>
              <Text style={styles.groupBadgeText}>G</Text>
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.infoContainer}>
          <View style={styles.headerRow}>
            <Text
              style={[styles.contactName, isUnread && styles.unreadTextBold]}
              numberOfLines={1}
            >
              {item.displayName || item.phoneNumber || "Unknown Contact"}
            </Text>
            <Text
              style={[
                styles.timestamp,
                isUnread && { color: "#00a884", fontWeight: "600" },
              ]}
            >
              {formatTime(item.lastMessage?.timestamp)}
            </Text>
          </View>

          <View style={styles.messageRow}>
            <View style={styles.previewContainer}>
              {item.lastMessage?.fromMe && (
                <CheckCheck
                  size={14}
                  color={
                    item.lastMessage.status === "read" ? "#53bdeb" : "#8696a0"
                  }
                  style={{ marginRight: 4 }}
                />
              )}
              <Text
                style={[styles.lastMessageText, isUnread && styles.unreadText]}
                numberOfLines={1}
              >
                {item.lastMessage?.content || "No messages yet"}
              </Text>
            </View>

            {/* Unread Badge */}
            {isUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {item.unreadCount > 99 ? "99+" : item.unreadCount}
                </Text>
              </View>
            )}
          </View>

          {/* Footer Metadata (Assignee & Status) */}
          <View style={styles.metaRow}>
            {item.assignedTo ? (
              <View style={styles.assigneeBadge}>
                <Text style={styles.assigneeText} numberOfLines={1}>
                  👤 {item.assignedTo.name}
                </Text>
              </View>
            ) : (
              <View style={styles.unassignedBadge}>
                <Text style={styles.unassignedText}>Unassigned</Text>
              </View>
            )}

            <View
              style={[
                styles.statusTag,
                item.status === "open" && styles.statusOpen,
                item.status === "pending" && styles.statusPending,
                item.status === "resolved" && styles.statusResolved,
              ]}
            >
              <Text style={styles.statusTagText}>{item.status.toUpperCase()}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Workspace Banner */}
      <View style={styles.workspaceBanner}>
        <Text style={styles.workspaceName} numberOfLines={1}>
          Workspace: {activeWorkspace?.name || "WATeamInbox"}
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Search color="#8696a0" size={18} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search contacts, messages..."
            placeholderTextColor="#8696a0"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {/* Segmented Filter Control */}
      <View style={styles.filterBar}>
        {(["open", "pending", "resolved", "all"] as FilterStatus[]).map(
          (status) => {
            const isActive = selectedStatus === status;
            return (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterTab,
                  isActive && styles.filterTabActive,
                ]}
                onPress={() => setSelectedStatus(status)}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    isActive && styles.filterTabTextActive,
                  ]}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          },
        )}
      </View>

      {/* Conversation List */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#00a884" />
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      ) : data?.length === 0 ? (
        <View style={styles.emptyContainer}>
          <InboxIcon color="#8696a0" size={54} />
          <Text style={styles.emptyTitle}>No conversations found</Text>
          <Text style={styles.emptySubtitle}>
            {selectedStatus === "all"
              ? "Your inbox is completely empty."
              : `There are currently no ${selectedStatus} chats.`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={renderConversationItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={onRefresh}
              tintColor="#00a884"
              colors={["#00a884"]}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b141a",
  },
  workspaceBanner: {
    backgroundColor: "#1f2c34",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#222d34",
  },
  workspaceName: {
    color: "#00a884",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  searchSection: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#111b21",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#202c33",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    color: "#e9edef",
    fontSize: 15,
  },
  filterBar: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#111b21",
    borderBottomWidth: 1,
    borderBottomColor: "#222d34",
  },
  filterTab: {
    flex: 1,
    paddingVertical: 6,
    marginHorizontal: 4,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: "#202c33",
  },
  filterTabActive: {
    backgroundColor: "#00a884",
  },
  filterTabText: {
    color: "#8696a0",
    fontSize: 13,
    fontWeight: "600",
  },
  filterTabTextActive: {
    color: "#111b21",
  },
  listContent: {
    paddingBottom: 24,
  },
  itemContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#222d34",
    alignItems: "center",
  },
  itemUnread: {
    backgroundColor: "rgba(0, 168, 132, 0.05)",
  },
  avatarContainer: {
    position: "relative",
    marginRight: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#202c33",
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#202c33",
    justifyContent: "center",
    alignItems: "center",
  },
  groupBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#00a884",
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#0b141a",
  },
  groupBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  infoContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  contactName: {
    color: "#e9edef",
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
    marginRight: 8,
  },
  unreadTextBold: {
    fontWeight: "700",
    color: "#ffffff",
  },
  timestamp: {
    color: "#8696a0",
    fontSize: 12,
  },
  messageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  previewContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  lastMessageText: {
    color: "#8696a0",
    fontSize: 14,
    flex: 1,
  },
  unreadText: {
    color: "#e9edef",
  },
  unreadBadge: {
    backgroundColor: "#00a884",
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  assigneeBadge: {
    backgroundColor: "#202c33",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 8,
  },
  assigneeText: {
    color: "#8696a0",
    fontSize: 11,
  },
  unassignedBadge: {
    backgroundColor: "rgba(134, 150, 160, 0.15)",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 8,
  },
  unassignedText: {
    color: "#8696a0",
    fontSize: 11,
    fontStyle: "italic",
  },
  statusTag: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  statusOpen: {
    backgroundColor: "rgba(0, 168, 132, 0.2)",
  },
  statusPending: {
    backgroundColor: "rgba(255, 170, 0, 0.2)",
  },
  statusResolved: {
    backgroundColor: "rgba(134, 150, 160, 0.2)",
  },
  statusTagText: {
    color: "#e9edef",
    fontSize: 10,
    fontWeight: "700",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    color: "#8696a0",
    marginTop: 12,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyTitle: {
    color: "#e9edef",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    color: "#8696a0",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});

