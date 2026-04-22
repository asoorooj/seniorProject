import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MessageBubble from "../components/chat/MessageBubble";
import { Message } from "../components/chat/Message";
import ChatInput from "../components/chat/ChatInput";
import {
  getAllMessages,
  getLatestUserEmotionLabel,
  getRecentMessages,
  upsertServerMessages,
} from "@/services/repositories/chatRepository";
import { useAuth } from "@/hooks/useAuth";
import { executeSqlAsync } from "@/services/db";
import { fetchChatHistory, sendChatMessage } from "@/services/apiService";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function ChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView | null>(null);
  const hasMoreRef = useRef<boolean>(true);
  const nextBeforeId = useRef<number|undefined>(undefined);
  const isFetchingHistory = useRef<boolean>(false);
  const isAtBottomRef = useRef<boolean>(true);
  const isAtTopRef = useRef<boolean>(false);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [messageEmotion, setMessageEmotion] = useState<string|undefined>(undefined);
  const [messages, setMessages] = useState<Message[]>([]);
  const chatPageLimit = 20;

  const {user, jwt} = useAuth();

  const messageKey = (message: Message, index = 0) => {
    const idPart =
      typeof message.id === "number" ? String(message.id) : "local";
    const timePart =
      message.timestamp instanceof Date
        ? String(message.timestamp.getTime())
        : String(new Date(message.timestamp).getTime());
    return `${idPart}-${message.isUser ? "u" : "b"}-${timePart}-${index}`;
  };

  const mapApiMessages = (apiMessages: any[]) => {
    return apiMessages.map((message: any) => {
      return new Message({
        id: message.id ?? message.server_id,
        userId: message.user_id ?? message.user_id,
        isUser:
          typeof message.isUser === "boolean"
            ? message.isUser
            : message.role === "user",
        textMessage: message.textMessage ?? message.text_message ?? message.message ?? "",
        timestamp: message.timestamp ? new Date(message.timestamp) : new Date(),
      } as Message);
    });
  };

  const getNextBeforeIdFromApi = (apiMessages: any[]) => {
    const ids = apiMessages
      .map((message: any) => message.id ?? message.server_id)
      .filter((id: any) => typeof id === "number");
    if (ids.length === 0) return undefined;
    return Math.min(...ids);
  };

  const scheduleRetryIfNeeded = () => {
    if (!isAtTopRef.current) return;
    if (!hasMoreRef.current || !nextBeforeId.current) return;
    if (retryTimeoutRef.current) return;
    console.log("[chat] retry_scheduled", { beforeId: nextBeforeId.current });
    retryTimeoutRef.current = setTimeout(() => {
      retryTimeoutRef.current = null;
      console.log("[chat] retry_fire", { beforeId: nextBeforeId.current });
      fetchHistory(nextBeforeId.current);
    }, 2000);
  };

  const clearRetry = () => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  };

const fetchHistory = async (beforeId?: number) => {
  if (isFetchingHistory.current) return;
  isFetchingHistory.current = true;

  try {
    // =========================
    // 1. LOAD LOCAL FIRST (UI ALWAYS STABLE)
    // =========================
    if (!beforeId) {
      let localMessages = await getAllMessages(user?.id);

      if (!localMessages || localMessages.length === 0) {
        localMessages = [
          new Message({
            isUser: false,
            textMessage: "Wanna get something off your mind? Let's talk.",
            timestamp: new Date(),
          }),
        ];
      }

      const emotion = await getLatestUserEmotionLabel(user?.id);
      setMessageEmotion(emotion ?? undefined);
      setMessages(localMessages);

      requestAnimationFrame(() => {
        scrollRef.current?.scrollToEnd({ animated: false });
      });
    }

    // =========================
    // 2. SERVER SYNC (BACKGROUND ONLY)
    // =========================
    try {

      const data = await fetchChatHistory({});
      setMessages(data);
      setMessageEmotion(await getLatestUserEmotionLabel(user?.id));

    } catch (err) {
      console.warn("[chat] server fetch failed, keeping current UI");
    }

    clearRetry();
  } finally {
    isFetchingHistory.current = false;
  }
};

useEffect(() => {
  fetchHistory();
}, []);

  const handleScroll = (event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event?.nativeEvent || {};
    const yOffset = contentOffset?.y ?? 0;
    const contentHeight = contentSize?.height ?? 0;
    const viewHeight = layoutMeasurement?.height ?? 0;
    const distanceFromBottom = contentHeight - viewHeight - yOffset;
    isAtBottomRef.current = distanceFromBottom <= 20;
    isAtTopRef.current = yOffset <= 20;
    if (yOffset <= 20 && hasMoreRef.current && nextBeforeId.current) {
      fetchHistory(nextBeforeId.current);
    }
  };

const handleSendMessage = async (text: string) => {
  const localUserMessage = new Message({
    id: undefined,
    userId: user?.id,
    isUser: true,
    textMessage: text,
    timestamp: new Date(),
  });

  requestAnimationFrame(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  });

  // 1. Optimistic UI update
  setMessages((prev) => [...prev, localUserMessage]);

  setIsGenerating(true);

  try {
    // 2. Call API
    const data = await sendChatMessage({
      jwt: jwt ?? undefined,
      message: text,
    });

    const userMsg = data.user_message;
    const assistantMsg = data.response_message;

    // 3. SAVE BOTH TO LOCAL DB HERE (single source of truth)
    await upsertServerMessages(
      [
        {
          ...userMsg,
          synced: 1,
        },
        {
          ...assistantMsg,
          synced: 1,
        },
      ],
      user?.id
    );

    // 4. Refresh UI from DB (prevents duplicates)
    const refreshed = await getAllMessages(user?.id);
    setMessages(refreshed);

    const emotion = await getLatestUserEmotionLabel(user?.id);
    setMessageEmotion(emotion ?? undefined);

  } catch (error) {
    console.warn("[chat] send failed", error);
  } finally {
    setIsGenerating(false);
  }
};

  return (
    <SafeAreaView style={styles.screen} edges={["left", "right"]}>
      <View style={styles.topHeader}>
        <LinearGradient
          colors={["#F27059", "#9B8FE8"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.mainAvatar}
        >
          <Image
            source={require("../assets/images/kokoro_white_logo.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </LinearGradient>

        <View style={styles.headerTextWrap}>
          <Text style={styles.appTitle}>kokoro AI</Text>
          <View style={styles.statusRow}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>Online</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.push("/(tabs)/journal")}
        >
          <Ionicons name="close" size={24} color="#1E1830" />
        </TouchableOpacity>
      </View>

      <View style={styles.topDivider} />

      <ScrollView
        ref={scrollRef}
        style={styles.chatBody}
        contentContainerStyle={[
          styles.chatContent,
          { paddingBottom: 140 },
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        stickyHeaderIndices={[0]}
      >
        <View style={styles.moodStickyWrap}>
          {messageEmotion ? (
            <View style={styles.moodPill}>
              <Text style={styles.moodLabel}>
                Based on your messages: {messageEmotion}
              </Text>
            </View>
          ) : null}
        </View>

        {messages.map((message, index) => (
          <MessageBubble key={messageKey(message, index)} message={message} />
        ))}
        {isGenerating && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color="#9E8FB8" />
            <Text style={styles.loadingText}>Generating response…</Text>
          </View>
        )}

        {/* <View style={styles.quickActionsWrap}>
          <View style={styles.quickActionsRow}>
            <TouchableOpacity style={styles.optionButton}>
              <Text style={styles.optionText}>Vent</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionButton}>
              <Text style={styles.optionText}>Breathe</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.quickActionsRowBottom}>
            <TouchableOpacity style={styles.optionButton}>
              <Text style={styles.optionText}>Activity</Text>
            </TouchableOpacity>
          </View>
        </View> */}
      </ScrollView>

      <ChatInput
        bottomInset={insets.bottom || 12}
        onSendMessage={handleSendMessage}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8F5FF",
  },

  topHeader: {
    height: 115,
    backgroundColor: "#FFFFFF",
    paddingTop: 31,
    paddingLeft: 20,
    paddingRight: 20,
    flexDirection: "row",
    alignItems: "flex-start",
  },

  mainAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: "center",
    justifyContent: "center",
  },

  logoImage: {
    width: 90,
    height: 90,
  },

  headerTextWrap: {
    marginLeft: 16,
    marginTop: 22,
  },

  appTitle: {
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 22,
    color: "#1E1830",
  },

  statusRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#4CC9B0",
    marginRight: 8,
  },

  onlineText: {
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 22,
    color: "#4CC9B0",
  },

  closeButton: {
    position: "absolute",
    top: 25,
    right: 28,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  topDivider: {
    height: 1.5,
    backgroundColor: "#EDE8FF",
  },

  chatBody: {
    flex: 1,
    backgroundColor: "#F8F5FF",
  },

  chatContent: {
    paddingTop: 18,
    paddingBottom: 28,
  },

  moodStickyWrap: {
    backgroundColor: "#F8F5FF",
    paddingTop: 8,
    paddingBottom: 12,
  },
  moodPill: {
    width: 341,
    height: 45,
    alignSelf: "center",
    borderRadius: 25,
    borderWidth: 2,
    borderColor: "#EDE8FF",
    backgroundColor: "#F0EEFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    marginBottom: 34,
  },

  moodLabel: {
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 22,
    color: "#9B8FE8",
    marginRight: 8,
  },

  moodValue: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
    color: "#9B8FE8",
  },


  quickActionsWrap: {
    marginLeft: 66,
    marginTop: -6,
  },

  quickActionsRow: {
    flexDirection: "row",
    marginBottom: 14,
  },

  quickActionsRowBottom: {
    flexDirection: "row",
  },

  optionButton: {
    width: 100,
    height: 23,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#EDE8FF",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 22,
  },

  optionText: {
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 22,
    color: "#9E8FB8",
  },

  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
  },
  loadingText: {
    fontSize: 13,
    color: "#9E8FB8",
  },

});
