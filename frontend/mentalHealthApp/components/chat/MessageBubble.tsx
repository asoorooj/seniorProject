import React, { memo } from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Message } from "./Message";

type MessageBubbleProps = {
  message: Message;
};

function MessageBubble({ message }: MessageBubbleProps) {
  if (message.isUser) {
    return (
      <View style={styles.userRow}>
        <LinearGradient
          colors={["#F27059", "#F4845F"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.userBubble}
        >
          <Text style={styles.userText}>{message.textMessage}</Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.leftMessageRow}>
      <LinearGradient
        colors={["#F27059", "#9B8FE8"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.smallAvatar}
      >
        <Image
          source={require("../../assets/images/kokoro_white_logo.png")}
          style={styles.smallLogoImage}
          resizeMode="contain"
        />
      </LinearGradient>

      <View style={styles.aiBubble}>
        <Text style={styles.aiText}>{message.textMessage}</Text>
      </View>
    </View>
  );
}

const areEqual = (prev: MessageBubbleProps, next: MessageBubbleProps) => {
  return (
    prev.message.id === next.message.id &&
    prev.message.isUser === next.message.isUser &&
    prev.message.textMessage === next.message.textMessage &&
    prev.message.timestamp.getTime() === next.message.timestamp.getTime() &&
    prev.message.status === next.message.status &&
    prev.message.avatarUrl === next.message.avatarUrl
  );
};

export default memo(MessageBubble, areEqual);

const styles = StyleSheet.create({
  leftMessageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginLeft: 24,
    marginBottom: 26,
  },

  smallAvatar: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 7,
    marginBottom: 4,
  },

  smallLogoImage: {
    width: 42,
    height: 42,
  },

  aiBubble: {
    maxWidth: 260,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    borderBottomLeftRadius: 4,
    shadowColor: "#1E1830",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    paddingTop: 16,
    paddingLeft: 17,
    paddingRight: 16,
    paddingBottom: 16,
    alignSelf: "flex-start",
  },

  aiText: {
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 22,
    color: "#1E1830",
  },

  userRow: {
    alignItems: "flex-end",
    paddingRight: 25,
    marginBottom: 34,
  },

  userBubble: {
    maxWidth: 260,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 4,
    borderBottomLeftRadius: 16,
    shadowColor: "#F27059",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
    paddingTop: 18,
    paddingLeft: 24,
    paddingRight: 18,
    paddingBottom: 18,
    alignSelf: "flex-end",
  },

  userText: {
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 22,
    color: "#FFFFFF",
  },
});
