import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Fingerprint, Lock, Mail, MessageSquare } from "lucide-react-native";
import { useAuthStore } from "../../src/stores/auth";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { login, biometricsAvailable, biometricsEnabled, authenticateWithBiometrics } =
    useAuthStore();

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Missing Fields", "Please enter your email and password.");
      return;
    }

    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      Alert.alert("Login Failed", err.message || "Invalid credentials");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBiometrics = async () => {
    const success = await authenticateWithBiometrics();
    if (!success) {
      Alert.alert("Authentication Failed", "Biometric verification was not recognized.");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Brand Icon & Heading */}
        <View style={styles.brandContainer}>
          <View style={styles.iconCircle}>
            <MessageSquare color="#00a884" size={42} />
          </View>
          <Text style={styles.title}>WATeamInbox</Text>
          <Text style={styles.subtitle}>Collaborative Omnichannel Team Inbox</Text>
        </View>

        {/* Input Form */}
        <View style={styles.form}>
          <View style={styles.inputWrapper}>
            <Mail color="#8696a0" size={20} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email address"
              placeholderTextColor="#8696a0"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Lock color="#8696a0" size={20} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#8696a0"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <TouchableOpacity
            style={[styles.loginButton, submitting && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#0b141a" />
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Quick Biometrics Button if enrolled */}
          {biometricsAvailable && biometricsEnabled && (
            <TouchableOpacity style={styles.biometricButton} onPress={handleBiometrics}>
              <Fingerprint color="#00a884" size={22} />
              <Text style={styles.biometricButtonText}>Unlock with Biometrics</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b141a",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  brandContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#1f2c34",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#e9edef",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#8696a0",
    textAlign: "center",
  },
  form: {
    width: "100%",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1f2c34",
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 54,
    borderWidth: 1,
    borderColor: "#2a3942",
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: "#e9edef",
    fontSize: 16,
  },
  loginButton: {
    backgroundColor: "#00a884",
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: "#0b141a",
    fontSize: 16,
    fontWeight: "600",
  },
  biometricButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    paddingVertical: 12,
    gap: 8,
  },
  biometricButtonText: {
    color: "#00a884",
    fontSize: 15,
    fontWeight: "500",
  },
});
