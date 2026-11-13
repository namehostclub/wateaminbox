import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, Clock, Info } from "lucide-react-native";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { api, AppNotification } from "../../src/lib/api";
import { useAuthStore } from "../../src/stores/auth";

export default function NotificationsScreen() {
  const queryClient = useQueryClient();
  const { activeWorkspace } = useAuthStore();

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ["notifications", activeWorkspace?.id],
    queryFn: async () => {
      const res = await api.getNotifications({ limit: 50 });
      return res.data || [];
    },
    enabled: !!activeWorkspace?.id,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.markNotificationRead(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await api.markAllNotificationsRead();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const formatTimestamp = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const renderNotificationItem = ({ item }: { item: AppNotification }) => {
    return (
      <TouchableOpacity
        style={[
          styles.notificationCard,
          !item.read && styles.notificationUnread,
        ]}
        activeOpacity={0.8}
        onPress={() => {
          if (!item.read) {
            markReadMutation.mutate(item.id);
          }
        }}
      >
        <View style={styles.iconContainer}>
          <Bell
            size={20}
            color={!item.read ? "#00a884" : "#8696a0"}
          />
        </View>

        <View style={styles.contentContainer}>
          <View style={styles.titleRow}>
            <Text
              style={[
                styles.titleText,
                !item.read && styles.unreadTitleText,
              ]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <Text style={styles.timeText}>
              {formatTimestamp(item.created_at)}
            </Text>
          </View>

          <Text style={styles.bodyText}>{item.body}</Text>
        </View>

        {!item.read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Action Bar */}
      <View style={styles.actionBar}>
        <Text style={styles.actionTitle}>Recent Activity</Text>
        <TouchableOpacity
          style={styles.markAllButton}
          onPress={() => markAllReadMutation.mutate()}
          disabled={markAllReadMutation.isPending}
        >
          <CheckCheck size={16} color="#00a884" style={{ marginRight: 4 }} />
          <Text style={styles.markAllText}>Mark all as read</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#00a884" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : data?.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Bell color="#8696a0" size={54} />
          <Text style={styles.emptyTitle}>All caught up!</Text>
          <Text style={styles.emptySubtitle}>
            You have no notifications in this workspace right now.
          </Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={renderNotificationItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
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
  actionBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#111b21",
    borderBottomWidth: 1,
    borderBottomColor: "#222d34",
  },
  actionTitle: {
    color: "#8696a0",
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  markAllButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  markAllText: {
    color: "#00a884",
    fontSize: 13,
    fontWeight: "600",
  },
  listContent: {
    paddingBottom: 24,
  },
  notificationCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#222d34",
    backgroundColor: "#0b141a",
  },
  notificationUnread: {
    backgroundColor: "rgba(0, 168, 132, 0.04)",
  },
  iconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  contentContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  titleText: {
    color: "#e9edef",
    fontSize: 15,
    fontWeight: "500",
    flex: 1,
    marginRight: 8,
  },
  unreadTitleText: {
    fontWeight: "700",
    color: "#ffffff",
  },
  timeText: {
    color: "#8696a0",
    fontSize: 12,
  },
  bodyText: {
    color: "#8696a0",
    fontSize: 14,
    lineHeight: 20,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#00a884",
    marginLeft: 8,
    marginTop: 6,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
    marginTop: 4,
  },
});
