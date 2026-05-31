import BottomMenu from "@/components/BottomMenu";
import {
  getChatMessages,
  getMatchById,
  getSessionUser,
  getUserKey,
  sendChatMessage,
  type ChatMessage,
  type MatchRecord,
} from "@/services/auth/session";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

function getOtherUser(match: MatchRecord, currentUserKey: string) {
  const otherUserKey = match.userKeys.find(
    (userKey) => userKey !== currentUserKey,
  );
  return otherUserKey ? match.users[otherUserKey] : null;
}

export default function ChatScreen() {
  const { matchId } = useLocalSearchParams<{ matchId?: string }>();
  const [match, setMatch] = useState<MatchRecord | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentUserKey, setCurrentUserKey] = useState("");
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadChat() {
      const user = await getSessionUser();

      if (!user || !matchId) {
        router.replace("/welcome");
        return;
      }

      const foundMatch = await getMatchById(matchId);
      const chatMessages = await getChatMessages(matchId);

      if (!isMounted) {
        return;
      }

      setCurrentUserKey(getUserKey(user));
      setMatch(foundMatch);
      setMessages(chatMessages);
      setIsLoading(false);
    }

    loadChat();

    return () => {
      isMounted = false;
    };
  }, [matchId]);

  async function handleSend() {
    if (!matchId || !draft.trim()) {
      return;
    }

    const message = await sendChatMessage(matchId, draft);

    if (!message) {
      return;
    }

    setMessages((currentMessages) => [...currentMessages, message]);
    setDraft("");
  }

  if (isLoading) {
    return (
      <ImageBackground
        source={require("../../assets/bg.png")}
        style={styles.background}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#111" />
        </View>
      </ImageBackground>
    );
  }

  const otherUser = match ? getOtherUser(match, currentUserKey) : null;
  const photo = otherUser?.photos?.[0] ?? otherUser?.picture;

  return (
    <ImageBackground
      source={require("../../assets/bg.png")}
      style={styles.background}
    >
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => router.back()}
          >
            <Text style={styles.navText}>‹</Text>
          </TouchableOpacity>

          {photo ? (
            <TouchableOpacity
              onPress={() =>
                otherUser &&
                router.push(`/userProfile?userKey=${getUserKey(otherUser)}`)
              }
            >
              <Image source={{ uri: photo }} style={styles.avatar} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.avatarPlaceholder}
              onPress={() =>
                otherUser &&
                router.push(`/userProfile?userKey=${getUserKey(otherUser)}`)
              }
            >
              <Text style={styles.avatarInitial}>
                {otherUser?.name?.slice(0, 1).toUpperCase() ?? "E"}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.headerCopy}
            onPress={() =>
              otherUser &&
              router.push(`/userProfile?userKey=${getUserKey(otherUser)}`)
            }
          >
            <Text style={styles.title}>{otherUser?.name ?? "Chat"}</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {otherUser?.city && otherUser.country
                ? `${otherUser.city}, ${otherUser.country}`
                : "Matched on Extasy"}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.messages}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.length ? (
            messages.map((message) => {
              const isMine = message.senderKey === currentUserKey;

              return (
                <View
                  key={message.id}
                  style={[
                    styles.messageBubble,
                    isMine ? styles.myMessage : styles.theirMessage,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      isMine ? styles.myMessageText : styles.theirMessageText,
                    ]}
                  >
                    {message.text}
                  </Text>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>It's a match</Text>
              <Text style={styles.emptyText}>
                Start the conversation with {otherUser?.name ?? "your match"}.
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            placeholder="Write a message..."
            placeholderTextColor="#888"
            value={draft}
            onChangeText={setDraft}
          />
          <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
            <Text style={styles.sendText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <BottomMenu />
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
  },

  screen: {
    flex: 1,
    paddingTop: 58,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingBottom: 16,
    gap: 12,
  },

  navButton: {
    width: 44,
    height: 44,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.78)",
    alignItems: "center",
    justifyContent: "center",
  },

  navText: {
    color: "#111",
    fontSize: 34,
    lineHeight: 36,
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E8E2DC",
  },

  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarInitial: {
    color: "#FFF",
    fontSize: 18,
  },

  headerCopy: {
    flex: 1,
  },

  title: {
    color: "#111",
    fontSize: 20,
  },

  subtitle: {
    color: "#6E6E73",
    fontSize: 13,
    marginTop: 2,
  },

  messages: {
    flex: 1,
  },

  messagesContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 110,
  },

  messageBubble: {
    maxWidth: "78%",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 10,
  },

  myMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#111",
    borderBottomRightRadius: 8,
  },

  theirMessage: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.84)",
    borderBottomLeftRadius: 8,
  },

  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },

  myMessageText: {
    color: "#FFF",
  },

  theirMessageText: {
    color: "#111",
  },

  emptyState: {
    minHeight: 260,
    borderRadius: 26,
    backgroundColor: "rgba(255, 255, 255, 0.82)",
    alignItems: "center",
    justifyContent: "center",
    padding: 26,
    marginTop: 40,
  },

  emptyTitle: {
    color: "#111",
    fontSize: 28,
    textAlign: "center",
  },

  emptyText: {
    color: "#6E6E73",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginTop: 10,
  },

  composer: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    paddingBottom: 96,
    backgroundColor: "rgba(255, 255, 255, 0.72)",
  },

  input: {
    flex: 1,
    minHeight: 50,
    borderRadius: 18,
    backgroundColor: "#FFF",
    paddingHorizontal: 16,
    color: "#111",
    fontSize: 15,
  },

  sendButton: {
    minWidth: 76,
    height: 50,
    borderRadius: 18,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },

  sendText: {
    color: "#FFF",
    fontSize: 15,
  },
});
