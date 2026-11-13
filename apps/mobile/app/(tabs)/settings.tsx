import { useRouter } from "expo-router";
import {
  Building2,
  Check,
  ChevronRight,
  Fingerprint,
  Globe,
  Info,
  LogOut,
  Moon,
  Shield,
  Smartphone,
  User,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { API_BASE_URL, Workspace } from "../../src/lib/api";
import { useAuthStore } from "../../src/stores/auth";

export default function SettingsScreen() {
  const router = useRouter();
  const {
    user,
    activeWorkspace,
    workspaces,
    switchWorkspace,
    logout,
    biometricsAvailable,
    biometricsEnabled,
    setBiometricsEnabled,
  } = useAuthStore();

  const [workspaceModalVisible, setWorkspaceModalVisible] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      "Confirm Logout",
      "Are you sure you want to sign out from WATeamInbox?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out",
          style: "destructive",
          onPress: async () => {
            await logout();
            router.replace("/(auth)/login");
          },
        },
      ],
    );
  };

  const handleSelectWorkspace = async (workspace: Workspace) => {
    await switchWorkspace(workspace);
    setWorkspaceModalVisible(false);
  };

  return (
    <ScrollView style={styles.container}>
      {/* User Profile Card */}
      <View style={styles.sectionCard}>
        <View style={styles.profileRow}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>
              {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
            </Text>
          </View>
          <View style={styles.profileDetails}>
            <Text style={styles.profileName}>{user?.name || "Agent"}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
          </View>
        </View>
      </View>

      {/* Workspace Switcher Section */}
      <Text style={styles.sectionHeader}>WORKSPACE</Text>
      <View style={styles.sectionCard}>
        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => setWorkspaceModalVisible(true)}
        >
          <View style={styles.iconCircle}>
            <Building2 size={20} color="#00a884" />
          </View>
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingTitle}>Active Workspace</Text>
            <Text style={styles.settingSubtitle}>
              {activeWorkspace?.name || "None Selected"}
            </Text>
          </View>
          <ChevronRight size={20} color="#8696a0" />
        </TouchableOpacity>
      </View>

      {/* Security Section */}
      <Text style={styles.sectionHeader}>SECURITY & PRIVACY</Text>
      <View style={styles.sectionCard}>
        <View style={styles.settingItem}>
          <View style={styles.iconCircle}>
            <Fingerprint size={20} color="#00a884" />
          </View>
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingTitle}>Biometric Lock</Text>
            <Text style={styles.settingSubtitle}>
              {biometricsAvailable
                ? "Unlock app with FaceID or Fingerprint"
                : "Biometrics not available on device"}
            </Text>
          </View>
          <Switch
            value={biometricsEnabled}
            onValueChange={setBiometricsEnabled}
            disabled={!biometricsAvailable}
            thumbColor={biometricsEnabled ? "#00a884" : "#8696a0"}
            trackColor={{ false: "#3b4a54", true: "rgba(0, 168, 132, 0.4)" }}
          />
        </View>
      </View>

      {/* App & Server Info */}
      <Text style={styles.sectionHeader}>APPLICATION INFO</Text>
      <View style={styles.sectionCard}>
        <View style={styles.settingItem}>
          <View style={styles.iconCircle}>
            <Globe size={20} color="#00a884" />
          </View>
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingTitle}>API Server</Text>
            <Text style={styles.settingSubtitle}>{API_BASE_URL}</Text>
          </View>
        </View>

        <View style={[styles.settingItem, styles.noBorder]}>
          <View style={styles.iconCircle}>
            <Smartphone size={20} color="#00a884" />
          </View>
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingTitle}>Client Build</Text>
            <Text style={styles.settingSubtitle}>v1.0.0 (Expo SDK 52)</Text>
          </View>
        </View>
      </View>

      {/* Logout Button */}
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
        activeOpacity={0.8}
      >
        <LogOut size={20} color="#ef4444" style={{ marginRight: 8 }} />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

      {/* Workspace Switcher Modal */}
      <Modal
        visible={workspaceModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setWorkspaceModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Workspace</Text>
              <TouchableOpacity
                onPress={() => setWorkspaceModalVisible(false)}
              >
                <Text style={styles.modalCloseText}>Done</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalList}>
              {workspaces.map((ws) => {
                const isSelected = activeWorkspace?.id === ws.id;
                return (
                  <TouchableOpacity
                    key={ws.id}
                    style={[
                      styles.workspaceItem,
                      isSelected && styles.workspaceItemSelected,
                    ]}
                    onPress={() => handleSelectWorkspace(ws)}
                  >
                    <View style={styles.workspaceItemLeft}>
                      <View style={styles.workspaceIcon}>
                        <Building2
                          size={18}
                          color={isSelected ? "#00a884" : "#8696a0"}
                        />
                      </View>
                      <View>
                        <Text style={styles.workspaceItemName}>{ws.name}</Text>
                        <Text style={styles.workspaceItemRole}>
                          Role: {ws.role || "Member"}
                        </Text>
                      </View>
                    </View>
                    {isSelected && <Check size={20} color="#00a884" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b141a",
  },
  sectionHeader: {
    color: "#8696a0",
    fontSize: 12,
    fontWeight: "700",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
    letterSpacing: 0.5,
  },
  sectionCard: {
    backgroundColor: "#111b21",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#222d34",
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#00a884",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  avatarInitial: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "bold",
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    color: "#e9edef",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  profileEmail: {
    color: "#8696a0",
    fontSize: 14,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#222d34",
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#202c33",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    color: "#e9edef",
    fontSize: 15,
    fontWeight: "500",
    marginBottom: 2,
  },
  settingSubtitle: {
    color: "#8696a0",
    fontSize: 13,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    marginHorizontal: 16,
    marginVertical: 32,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  logoutText: {
    color: "#ef4444",
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#111b21",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "75%",
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#222d34",
  },
  modalTitle: {
    color: "#e9edef",
    fontSize: 17,
    fontWeight: "700",
  },
  modalCloseText: {
    color: "#00a884",
    fontSize: 16,
    fontWeight: "600",
  },
  modalList: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  workspaceItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: "#202c33",
  },
  workspaceItemSelected: {
    borderColor: "#00a884",
    borderWidth: 1,
  },
  workspaceItemLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  workspaceIcon: {
    marginRight: 12,
  },
  workspaceItemName: {
    color: "#e9edef",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  workspaceItemRole: {
    color: "#8696a0",
    fontSize: 12,
  },
});

