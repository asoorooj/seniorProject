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
import { fetchChatHistory, sendChatMessage } from "@/services/apiService";

export default function ChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView | null>(null);
  const hasMoreRef = useRef<boolean>(true);
  const nextBeforeId = useRef<number|undefined>(undefined);
  const isFetchingHistory = useRef<boolean>(false);
  const isAtBottomRef = useRef<boolean>(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [messageEmotion, setMessageEmotion] = useState<string|undefined>(undefined);
  const [messages, setMessages] = useState<Message[]>([]);

  const fetchHistory = async (beforeId?: number) => {
    if (isFetchingHistory.current) return;
    isFetchingHistory.current = true;
    const data = await fetchChatHistory({ userId: 1, beforeId });
    if (!data) {
      isFetchingHistory.current = false;
      return;
    }
    console.log(data);
    hasMoreRef.current = Boolean(data.has_more);
    nextBeforeId.current = data.next_before_id;

    setMessages(prev => {
      let newMessages = data.messages.map((message: any) => {
        return new Message({
          id: message.id,
          sessionId: message.session_id,
          isUser: message.role === "user" ? true : false,
          textMessage: message.textMessage,
          timestamp: message.timestamp ? new Date(message.timestamp) : new Date()
        } as Message);
      });
      return beforeId ? [...newMessages, ...prev] : [...newMessages];
    });
    if (!beforeId) {
      const latestUserMessage = [...(data.messages || [])]
        .reverse()
        .find((message: any) => message.role === "user");
      setMessageEmotion(latestUserMessage?.emotionLabel ?? null);
    }
    isFetchingHistory.current = false;
    return data;
  };

  useEffect(() => {
    fetchHistory().then(() => {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 50);
    });
  },[])

  const handleScroll = (event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event?.nativeEvent || {};
    const yOffset = contentOffset?.y ?? 0;
    const contentHeight = contentSize?.height ?? 0;
    const viewHeight = layoutMeasurement?.height ?? 0;
    const distanceFromBottom = contentHeight - viewHeight - yOffset;
    isAtBottomRef.current = distanceFromBottom <= 20;
    if (yOffset <= 20 && hasMoreRef.current && nextBeforeId.current) {
      fetchHistory(nextBeforeId.current);
    }
  };

  const handleSendMessage = async (text: string) => {
    const newMessage = new Message({
      // id: `${Date.now()}`,
      sessionId: undefined,
      isUser: true,
      textMessage: text,
      timestamp: new Date(),
      status: "sent",
    });
    setMessages((prev) => [...prev, newMessage]);
    const sendChatForResponse = async function(){
      setIsGenerating(true);
      const data = await sendChatMessage({ userId: 1, message: newMessage });
      console.log(data);
      setIsGenerating(false);
      return data;
    };
    const response = await sendChatForResponse();
    let responseMessage = response?.response_message;
    let evalUserMessage = response?.user_message;
    if (responseMessage) {
      setMessages(prev => {
        const newMessage = new Message({
          id:responseMessage.id,
          sessionId:responseMessage.sessionId,
          isUser:responseMessage.isUser,
          textMessage:responseMessage.textMessage,
          timestamp: responseMessage.timestamp ? new Date(responseMessage.timestamp) : new Date()
        });
        return [...prev,newMessage];
      });
      setMessageEmotion(evalUserMessage?.emotionLabel);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    } else if (response?.error){
        setMessages(prev => {
        const newMessage = new Message({
          isUser:false,
          textMessage:response.error,
          timestamp: responseMessage.timestamp ? new Date(responseMessage.timestamp) : new Date()
        });
        return [...prev, newMessage];
      });
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
        {messageEmotion && 
          <View style={styles.moodStickyWrap}>
            <View style={styles.moodPill}>
              <Text style={styles.moodLabel}>Based on your messages: {messageEmotion}</Text>
              <Text style={styles.moodValue}></Text>
            </View>
          </View>
        }
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
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
