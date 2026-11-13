import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import {
  registerForPushNotificationsAsync,
  setupNotificationListeners,
} from "../src/services/notifications";
import { initRealtimeClient } from "../src/services/realtime";
import { useAuthStore } from "../src/stores/auth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 30, // 30s
    },
  },
});

function RootNavigationGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, activeWorkspace, user, init } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    init();
  }, [init]);

  // Auth routing guard
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (isAuthenticated && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, isLoading, segments, router]);

  // Realtime & Push notification setup
  useEffect(() => {
    if (!isAuthenticated || !activeWorkspace || !user) return;

    // Register push token
    registerForPushNotificationsAsync();
    const cleanupNotifications = setupNotificationListeners();

    // Start Centrifugo WebSocket
    let cleanupRealtime = () => {};
    initRealtimeClient(activeWorkspace.id, user.id, queryClient).then((cleanup) => {
      cleanupRealtime = cleanup;
    });

    return () => {
      cleanupNotifications();
      cleanupRealtime();
    };
  }, [isAuthenticated, activeWorkspace, user]);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#0b141a",
        }}
      >
        <ActivityIndicator size="large" color="#25D366" />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <RootNavigationGuard>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: "#1f2c34" },
            headerTintColor: "#e9edef",
            headerTitleStyle: { fontWeight: "600" },
            contentStyle: { backgroundColor: "#0b141a" },
          }}
        >
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="chat/[id]"
            options={{
              headerShown: true,
              headerBackTitle: "Back",
            }}
          />
        </Stack>
      </RootNavigationGuard>
    </QueryClientProvider>
  );
}
