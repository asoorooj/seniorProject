import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

export default function LoginScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login Screen</Text>

      {/* TEMP LOGIN BUTTON */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.replace("/(tabs)")}
      >
        <Text style={styles.buttonText}>Log In</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F5FF",
    justifyContent: "center",
    alignItems: "center",
  },

  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 30,
  },

  button: {
    backgroundColor: "#9B8FE8",
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 20,
  },

  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});