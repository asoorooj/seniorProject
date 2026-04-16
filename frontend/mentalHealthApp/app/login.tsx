import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { login } from "@/services/apiService";
import { persistAuthSession, setCurrentUserId } from "@/services/db";
import { syncAllUnsynced } from "@/services/sync/syncController";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submit, setSubmit] = useState(false);

  const { user, sessionId, setUser, setSessionId } = useAuth();

  useEffect(()=>{
    if(user && sessionId){
      router.push("/(tabs)");
    }
  },[user,sessionId])

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          <View style={styles.headerBlock}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>We&apos;re glad to see you again</Text>
          </View>

          <View style={styles.spacer} />

          <View style={styles.formBlock}>
            <View style={styles.inputGroup}>
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#1E1830"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Password"
                placeholderTextColor="#1E1830"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                onPress={() => setShowPassword((value) => !value)}
                style={styles.eyeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather
                  name={showPassword ? "eye-off" : "eye"}
                  size={22}
                  color="#1E1830"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.forgotButton} activeOpacity={0.8}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.loginButton}
              activeOpacity={0.85}
              disabled={submit}
              onPress={async () => {
                try {
                  setSubmit(true);
                  const data = await login(email, password);
                  await persistAuthSession(data.user, data.sessionId);
                  setCurrentUserId(data.user.id);
                  setUser(data.user);
                  setSessionId(data.sessionId);
                  await syncAllUnsynced(data.sessionId, "action");
                  router.replace("/(tabs)");
                } finally {
                  setSubmit(false);
                }
              }}
            >
              <Text style={styles.loginButtonText}>Login</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.registerRow}
              activeOpacity={0.8}
              onPress={() => router.push("/register")}
            >
              <Text style={styles.registerText}>
                Don&apos;t have an account? <Text style={styles.registerLink}>Register</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  keyboardView: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 32,
    paddingTop: 28,
    paddingBottom: 36,
    backgroundColor: "#FFFFFF",
  },
  screenLabel: {
    fontSize: 18,
    fontWeight: "500",
    color: "#1E1830",
    opacity: 0.45,
    marginBottom: 24,
    paddingLeft: 4,
  },
  headerBlock: {
    alignItems: "center",
    gap: 12,
    paddingTop: 8,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "800",
    color: "#000000",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 18,
    lineHeight: 25,
    fontWeight: "500",
    color: "#1E1830",
    textAlign: "center",
  },
  spacer: {
    flex: 1,
    minHeight: 220,
  },
  formBlock: {
    gap: 14,
    paddingBottom: 20,
  },
  inputGroup: {
    minHeight: 46,
    backgroundColor: "#EDE8FF",
    borderRadius: 8,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "400",
    color: "#1E1830",
    paddingVertical: 12,
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "400",
    color: "#1E1830",
    paddingVertical: 12,
    paddingRight: 12,
  },
  eyeButton: {
    justifyContent: "center",
    alignItems: "center",
  },
  forgotButton: {
    alignSelf: "flex-end",
    paddingTop: 2,
    paddingBottom: 8,
  },
  forgotText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "700",
    color: "#F27059",
    textAlign: "right",
  },
  loginButton: {
    minHeight: 46,
    borderRadius: 8,
    backgroundColor: "#F27059",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 12,
    shadowColor: "#F22705",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
    marginTop: 8,
  },
  loginButtonText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  registerRow: {
    alignItems: "center",
    marginTop: 16,
  },
  registerText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "400",
    color: "#1E1830",
    textAlign: "center",
  },
  registerLink: {
    fontWeight: "700",
    color: "#F27059",
  },
});
