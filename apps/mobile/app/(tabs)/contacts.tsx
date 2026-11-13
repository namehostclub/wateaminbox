import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { MessageSquare, Phone, Search, User, Users } from "lucide-react-native";
import React, { useState } from "react";
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
import { api, ContactItem } from "../../src/lib/api";
import { useAuthStore } from "../../src/stores/auth";

export default function ContactsScreen() {
  const router = useRouter();
  const { activeWorkspace } = useAuthStore();
  const [search, setSearch] = useState("");

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ["contacts", activeWorkspace?.id, search],
    queryFn: async () => {
      const res = await api.getContacts({
        search: search.trim() || undefined,
        limit: 100,
        includeGroups: true,
      });
      return res.contacts || [];
    },
    enabled: !!activeWorkspace?.id,
  });

  const renderContactItem = ({ item }: { item: ContactItem }) => {
    return (
      <View style={styles.contactCard}>
        <View style={styles.avatarWrapper}>
          {item.profile_picture_url ? (
            <Image
              source={{ uri: item.profile_picture_url }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              {item.is_group ? (
                <Users color="#8696a0" size={24} />
              ) : (
                <User color="#8696a0" size={24} />
              )}
            </View>
          )}
          {item.is_group && (
            <View style={styles.groupBadge}>
              <Text style={styles.groupBadgeText}>G</Text>
            </View>
          )}
        </View>

        <View style={styles.infoWrapper}>
          <Text style={styles.contactName} numberOfLines={1}>
            {item.name || item.phone_number || "Unnamed Contact"}
          </Text>
          {item.phone_number ? (
            <Text style={styles.contactPhone}>{item.phone_number}</Text>
          ) : null}
          {item.email ? (
            <Text style={styles.contactEmail} numberOfLines={1}>
              {item.email}
            </Text>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search color="#8696a0" size={18} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, phone or email..."
            placeholderTextColor="#8696a0"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#00a884" />
          <Text style={styles.loadingText}>Loading contacts...</Text>
        </View>
      ) : data?.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Users color="#8696a0" size={54} />
          <Text style={styles.emptyTitle}>No contacts found</Text>
          <Text style={styles.emptySubtitle}>
            {search
              ? "No contacts matched your search query."
              : "No contacts available in this workspace."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={renderContactItem}
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
  searchContainer: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#111b21",
    borderBottomWidth: 1,
    borderBottomColor: "#222d34",
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
  listContent: {
    paddingBottom: 24,
  },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#222d34",
  },
  avatarWrapper: {
    position: "relative",
    marginRight: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#202c33",
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#202c33",
    justifyContent: "center",
    alignItems: "center",
  },
  groupBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#00a884",
    borderRadius: 9,
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
  infoWrapper: {
    flex: 1,
  },
  contactName: {
    color: "#e9edef",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  contactPhone: {
    color: "#8696a0",
    fontSize: 13,
  },
  contactEmail: {
    color: "#8696a0",
    fontSize: 12,
    marginTop: 2,
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
  },
});

