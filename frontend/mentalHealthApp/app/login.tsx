import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getUser, loginUser, saveUser } from "../services/apiService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../hooks/useAuth";
import { colors } from "@/assets/styles/colors";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {  ActivityIndicator } from "react-native";
export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(""); 
  const [loading, setLoading] = useState(false); 
  const { user, setUser, jwt, setJwt } = useAuth();

  const handleLogin = async () => {
    setError("");

    //  input validation
    if (!email.trim()) {
      setError("Please enter your email");
      return;
    }
    if (!email.includes("@")) {
      setError("Please enter a valid email");
      return;
    }
    if (!password.trim()) {
      setError("Please enter your password");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      const res = await loginUser(email, password);
      console.log("RES:", res);

      if (res.access_token && res.user_id) {
        try {
          await saveUser(res);
          console.log("persistAuthSession done ✅");
        } catch (e) {
          console.warn("persistAuthSession FAILED ❌", e);
        }

        const token = await AsyncStorage.getItem("token");
        setJwt(token);
        const savedUser = await getUser();
        setUser(savedUser);

        //  welcome back popup
        const firstName = res.user?.email?.split("@")[0] ?? "there";
        Alert.alert(
          "Welcome back! 👋",
          `Good to see you again, ${firstName}!`,
          [{ text: "Let's go!", onPress: () => router.replace("/(tabs)") }]
        );

      } else {
        //  show backend error
        setError(res.error ?? "Invalid credentials. Please try again.");
      }
    } catch (e) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
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

          <View style={[styles.headerBlock, { paddingTop: insets.top + 16 }]}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>We&apos;re glad to see you again</Text>
          </View>

          <View style={styles.spacer} />

          <View style={styles.formBlock}>
            <View style={styles.inputGroup}>
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={colors.textSecondary}
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
                placeholderTextColor={colors.textSecondary}
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
                  color={colors.textPrimary}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.forgotButton} activeOpacity={0.8}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>
            
            {/*  error message */}
            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : null}

            <TouchableOpacity
              style={[styles.loginButton, loading && { opacity: 0.7 }]}
              activeOpacity={0.85}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.surface} />
              ) : (
                <Text style={styles.loginButtonText}>Login</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.registerRow}
              activeOpacity={0.8}
              onPress={() => router.replace("/register")}
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
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 32,
    paddingBottom: 36,
    backgroundColor: colors.background,
  },
  screenLabel: {
    fontSize: 18,
    fontWeight: "500",
    color: colors.textPrimary,
    opacity: 0.45,
    marginBottom: 24,
    paddingLeft: 4,
  },
  headerBlock: {
    alignItems: "center",
    gap: 12,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "800",
    color: colors.textPrimary,
    textAlign: "center",
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "500",
    color: colors.accentDark,
    textAlign: "center",
  },
  spacer: {
    flex: 1,
    minHeight: 120,
  },
  formBlock: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 14,
    paddingBottom: 20,
    shadowColor: colors.textSecondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  inputGroup: {
    minHeight: 46,
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "400",
    color: colors.textPrimary,
    paddingVertical: 12,
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "400",
    color: colors.textPrimary,
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
    color: colors.primary,
    textAlign: "right",
  },
  errorText: {
  fontSize: 14,
  color: colors.primary,
  textAlign: "center",
  marginTop: -4,
 },
  loginButton: {
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: colors.primary,
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
    color: colors.surface,
  },
  registerRow: {
    alignItems: "center",
    marginTop: 12,
  },
  registerText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "400",
    color: colors.textPrimary,
    textAlign: "center",
  },
  registerLink: {
    fontWeight: "700",
    color: colors.primary,
  },
});
