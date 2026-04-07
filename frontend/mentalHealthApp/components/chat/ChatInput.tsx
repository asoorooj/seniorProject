import React, { useState } from "react";
import { View, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

type ChatInputProps = {
  bottomInset?: number;
  placeholder?: string;
  onSendMessage?: (text: string) => void;
};

export default function ChatInput({
  bottomInset = 12,
  placeholder = "Type a message...",
  onSendMessage,
}: ChatInputProps) {
  const [text, setText] = useState("");

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    onSendMessage?.(trimmed);
    setText("");
  };

  return (
    <View style={[styles.bottomBar, { paddingBottom: bottomInset }]}>
      <View style={styles.bottomDivider} />
      <View style={styles.inputRow}>
        <TextInput
          placeholder={placeholder}
          placeholderTextColor="#9E8FB8"
          style={styles.input}
          value={text}
          onChangeText={setText}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />

        <TouchableOpacity onPress={handleSend}>
          <LinearGradient
            colors={["#F27059", "#9B8FE8"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sendButton}
          >
            <Ionicons name="arrow-up" size={24} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    width: "100%",
    height: 100,
    backgroundColor: "#FFFFFF",
  },

  bottomDivider: {
    height: 1.5,
    backgroundColor: "#EDE8FF",
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
    marginLeft: 24,
    marginRight: 24,
  },

  input: {
    flex: 1,
    height: 45,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#EDE8FF",
    backgroundColor: "#F8F5FF",
    paddingHorizontal: 18,
    fontSize: 16,
    fontWeight: "500",
    color: "#1E1830",
  },

  sendButton: {
    width: 45,
    height: 45,
    marginLeft: 16,
    borderRadius: 22.5,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#F27059",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 4,
  },
});
