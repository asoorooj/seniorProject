import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

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
        style={styles.chatBody}
        contentContainerStyle={styles.chatContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.moodPill}>
          <Text style={styles.moodLabel}>Based on your scan today:</Text>
          <Text style={styles.moodValue}>Mostly Calm</Text>
        </View>

        <View style={styles.leftMessageRow}>
          <LinearGradient
            colors={["#F27059", "#9B8FE8"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.smallAvatar}
          >
            <Image
              source={require("../assets/images/kokoro_white_logo.png")}
              style={styles.smallLogoImage}
              resizeMode="contain"
            />
          </LinearGradient>

          <View style={styles.aiBubble}>
            <Text style={styles.aiText}>
              Hi Skylar! Your scan showed you’re feeling calm today, that’s
              great! Anything on your mind?
            </Text>
          </View>
        </View>

        <View style={styles.userRow}>
          <LinearGradient
            colors={["#F27059", "#F4845F"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.userBubble}
          >
            <Text style={styles.userText}>
              Kinda, yes, feeling a bit stressed out with deadlines!
            </Text>
          </LinearGradient>
        </View>

        <View style={styles.leftMessageRow}>
          <LinearGradient
            colors={["#F27059", "#9B8FE8"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.smallAvatar}
          >
            <Image
              source={require("../assets/images/kokoro_white_logo.png")}
              style={styles.smallLogoImage}
              resizeMode="contain"
            />
          </LinearGradient>

          <View style={styles.aiBubble}>
            <Text style={styles.aiText}>
              That’s totally valid. Would you like to vent, try a breathing
              exercise, or a de-stresser activity?
            </Text>
          </View>
        </View>

        <View style={styles.quickActionsWrap}>
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
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom || 12 }]}>
        <View style={styles.bottomDivider} />
        <View style={styles.inputRow}>
          <TextInput
            placeholder="Type a message..."
            placeholderTextColor="#9E8FB8"
            style={styles.input}
          />

          <TouchableOpacity>
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
    width: 235,
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
    width: 224,
    minHeight: 102,
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
  },

  userText: {
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 22,
    color: "#FFFFFF",
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