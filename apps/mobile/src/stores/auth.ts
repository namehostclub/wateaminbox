import { create } from "zustand";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import {
  api,
  clearAuthTokens,
  getActiveCompanyId,
  getStoredToken,
  setActiveCompanyId,
  type UserProfile,
  type Workspace,
} from "../lib/api";

const BIOMETRICS_PREF_KEY = "wateaminbox_biometrics_enabled";

interface AuthState {
  user: UserProfile | null;
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  biometricsAvailable: boolean;
  biometricsEnabled: boolean;
  init: () => Promise<void>;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  switchWorkspace: (workspace: Workspace) => Promise<void>;
  authenticateWithBiometrics: () => Promise<boolean>;
  setBiometricsEnabled: (enabled: boolean) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  workspaces: [],
  activeWorkspace: null,
  isAuthenticated: false,
  isLoading: true,
  biometricsAvailable: false,
  biometricsEnabled: false,

  init: async () => {
    try {
      // Check biometrics capability
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const biometricsAvailable = hasHardware && isEnrolled;
      const biometricsPref = await SecureStore.getItemAsync(BIOMETRICS_PREF_KEY);
      const biometricsEnabled = biometricsPref === "true" && biometricsAvailable;

      const token = await getStoredToken();
      if (!token) {
        set({
          isLoading: false,
          isAuthenticated: false,
          biometricsAvailable,
          biometricsEnabled,
        });
        return;
      }

      // If biometrics is enabled, prompt user
      if (biometricsEnabled) {
        const authSuccess = await get().authenticateWithBiometrics();
        if (!authSuccess) {
          set({
            isLoading: false,
            isAuthenticated: false,
            biometricsAvailable,
            biometricsEnabled,
          });
          return;
        }
      }

      // Fetch user profile and workspaces
      const [userRes, companiesRes] = await Promise.all([
        api.getCurrentUser(),
        api.getWorkspaces(),
      ]);

      const storedCompanyId = await getActiveCompanyId();
      const activeWorkspace =
        companiesRes.companies.find((c) => c.id === storedCompanyId) ||
        companiesRes.companies[0] ||
        null;

      if (activeWorkspace) {
        await setActiveCompanyId(activeWorkspace.id);
      }

      set({
        user: userRes.user,
        workspaces: companiesRes.companies,
        activeWorkspace,
        isAuthenticated: true,
        isLoading: false,
        biometricsAvailable,
        biometricsEnabled,
      });
    } catch {
      await clearAuthTokens();
      set({ isLoading: false, isAuthenticated: false });
    }
  },

  authenticateWithBiometrics: async () => {
    try {
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock WATeamInbox",
        fallbackLabel: "Use Password",
        disableDeviceFallback: false,
      });
      return res.success;
    } catch {
      return false;
    }
  },

  setBiometricsEnabled: async (enabled: boolean) => {
    await SecureStore.setItemAsync(BIOMETRICS_PREF_KEY, enabled ? "true" : "false");
    set({ biometricsEnabled: enabled });
  },

  login: async (email: string, pass: string) => {
    set({ isLoading: true });
    try {
      const data = await api.login(email, pass);
      const companiesRes = await api.getWorkspaces();
      const activeWorkspace =
        companiesRes.companies.find((c) => c.id === data.user.companyId) ||
        companiesRes.companies[0] ||
        null;

      if (activeWorkspace) {
        await setActiveCompanyId(activeWorkspace.id);
      }

      set({
        user: data.user,
        workspaces: companiesRes.companies,
        activeWorkspace,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    await clearAuthTokens();
    set({
      user: null,
      workspaces: [],
      activeWorkspace: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  switchWorkspace: async (workspace: Workspace) => {
    await setActiveCompanyId(workspace.id);
    set({ activeWorkspace: workspace });
  },
}));
