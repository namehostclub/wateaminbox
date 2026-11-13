import { Tabs } from "expo-router";
import { Bell, CheckSquare, MessageSquare, Settings, Users } from "lucide-react-native";
import React from "react";
import { Platform } from "react-native";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: "#1f2c34",
        },
        headerTintColor: "#e9edef",
        headerTitleStyle: {
          fontWeight: "700",
          fontSize: 18,
        },
        tabBarStyle: {
          backgroundColor: "#1f2c34",
          borderTopColor: "#222d34",
          borderTopWidth: 1,
          height: Platform.OS === "ios" ? 88 : 64,
          paddingBottom: Platform.OS === "ios" ? 28 : 10,
          paddingTop: 8,
        },
        tabBarActiveTintColor: "#00a884",
        tabBarInactiveTintColor: "#8696a0",
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Chats",
          headerTitle: "WATeamInbox",
          tabBarIcon: ({ color, size }) => (
            <MessageSquare color={color} size={size || 22} />
          ),
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{
          title: "Contacts",
          headerTitle: "Contacts Directory",
          tabBarIcon: ({ color, size }) => (
            <Users color={color} size={size || 22} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Alerts",
          headerTitle: "Notifications",
          tabBarIcon: ({ color, size }) => (
            <Bell color={color} size={size || 22} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          headerTitle: "Settings & Workspaces",
          tabBarIcon: ({ color, size }) => (
            <Settings color={color} size={size || 22} />
          ),
        }}
      />
    </Tabs>
  );
}
