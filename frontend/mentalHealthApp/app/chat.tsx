import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import MessageBubble from "../components/chat/MessageBubble";
import { Message } from "../components/chat/Message";
import ChatInput from "../components/chat/ChatInput";
import {
  getAllMessages,
  getEarliestCursorFromIncoming,
  getLatestUserEmotionLabel,
  getOldestSyncedCursor,
  upsertServerMessages,
} from "@/services/repositories/chatRepository";
import { useAuth } from "@/hooks/useAuth";
import { fetchChatHistory, sendChatMessage } from "@/services/apiService";

export default function ChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView | null>(null);
  const hasMoreRef = useRef<boolean>(true);
  const nextCursorRef = useRef<{ beforeTs?: string; beforeId?: number }>({});
  const isFetchingHistory = useRef<boolean>(false);
  const isAtBottomRef = useRef<boolean>(true);
  const isAtTopRef = useRef<boolean>(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [messageEmotion, setMessageEmotion] = useState<string|undefined>(undefined);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const chatPageLimit = 20;

  const {user, jwt} = useAuth();

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setIsKeyboardVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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

  const mergeMessages = (existing: Message[], incoming: Message[]) => {
    const byKey = new Map<string, Message>();
    for (const message of [...existing, ...incoming]) {
      const key = messageKey(message);
      byKey.set(key, message);
    }
    return Array.from(byKey.values()).sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );
  };

  const fetchHistory = async (loadOlder?: boolean) => {
  if (isFetchingHistory.current) return;
  isFetchingHistory.current = true;

  try {
    if (!loadOlder) {
      let localMessages = await getAllMessages(user?.id);
      console.log("[chat] initial_open local_count", localMessages.length);

      const emotion = await getLatestUserEmotionLabel(user?.id);
      setMessageEmotion(emotion ?? undefined);
      if (localMessages.length > 0) {
        setMessages(localMessages);
      } else {
        // Keep chat empty while we attempt server fetch. Fallback message only if both local+server are empty.
        setMessages([]);
      }

      requestAnimationFrame(() => {
        scrollRef.current?.scrollToEnd({ animated: false });
      });

      const page = await fetchChatHistory({
        jwt: jwt ?? undefined,
        limit: chatPageLimit,
      });
      console.log("[chat] initial_open server_page", page);

      const incoming = page.messages ?? [];
      if (incoming.length > 0) {
        await upsertServerMessages(incoming, user?.id);
      }

      const refreshed = await getAllMessages(user?.id);
      console.log("[chat] initial_open refreshed_local_count", refreshed.length);
      if (refreshed.length > 0) {
        setMessages(refreshed);
      } else {
        setMessages([
          new Message({
            isUser: false,
            textMessage: "Wanna get something off your mind? Let's talk.",
            timestamp: new Date(),
          }),
        ]);
      }

      hasMoreRef.current = Boolean(page.has_more);
      if (page.next_before_ts) {
        nextCursorRef.current = {
          beforeTs: page.next_before_ts,
          beforeId: page.next_before_id ?? undefined,
        };
      }
      return;
    }

    let cursor = nextCursorRef.current;
    if (!cursor.beforeTs) {
      const oldest = await getOldestSyncedCursor(user?.id);
      if (oldest) {
        cursor = oldest;
        nextCursorRef.current = oldest;
      }
    }

    const page = await fetchChatHistory({
      jwt: jwt ?? undefined,
      beforeTs: cursor.beforeTs,
      beforeId: cursor.beforeId,
      limit: chatPageLimit,
    });

    console.log("[PAGE]", page)

    const incoming = page.messages ?? [];
    let earliestIncoming:
      | { beforeTs: string; beforeId: number }
      | null = null;
    if (incoming.length > 0) {
      await upsertServerMessages(incoming, user?.id);
      earliestIncoming = getEarliestCursorFromIncoming(incoming);
      if (earliestIncoming) {
        nextCursorRef.current = earliestIncoming;
      }
      const incomingMessages = mapApiMessages(incoming);
      setMessages((previous) => mergeMessages(previous, incomingMessages));
      setMessageEmotion(await getLatestUserEmotionLabel(user?.id));
    }

    hasMoreRef.current = Boolean(page.has_more);
    if (page.next_before_ts) {
      nextCursorRef.current = {
        beforeTs: page.next_before_ts,
        beforeId: page.next_before_id ?? undefined,
      };
    } else if (earliestIncoming) {
      nextCursorRef.current = earliestIncoming;
    }
  } catch (error) {
    console.warn("[chat] fetch history failed", error);
  } finally {
    isFetchingHistory.current = false;
  }
  };

  useEffect(() => {
    if (!user?.id) return;
    console.log("[chat] mounted/open -> fetch initial history");
    fetchHistory(false);
  }, [user?.id]);

  const handleScroll = (event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event?.nativeEvent || {};
    const yOffset = contentOffset?.y ?? 0;
    const contentHeight = contentSize?.height ?? 0;
    const viewHeight = layoutMeasurement?.height ?? 0;
    const distanceFromBottom = contentHeight - viewHeight - yOffset;
    isAtBottomRef.current = distanceFromBottom <= 20;
    isAtTopRef.current = yOffset <= 20;
    if (yOffset <= 20 && hasMoreRef.current) {
      fetchHistory(true);
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
    console.log("[TEXT IT LOL]",text);
    const data = await sendChatMessage({
      jwt: jwt ?? undefined,
      message: text,
    });
    console.log("[DATA IT LOL]",data);


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
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
      <View
        style={[
          styles.topHeader,
          {
            height: insets.top + 84,
            paddingTop: insets.top + 12,
          },
        ]}
      >
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
          style={[
            styles.closeButton,
            { top: insets.top + 10 },
          ]}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
              return;
            }
            router.replace("/(tabs)");
          }}
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
        bottomInset={isKeyboardVisible ? 0 : insets.bottom || 12}
        onSendMessage={handleSendMessage}
      />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8F5FF",
  },
  keyboardAvoid: {
    flex: 1,
  },

  topHeader: {
    backgroundColor: "#FFFFFF",
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
    right: 28,
    width: 36,
    height: 36,
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
