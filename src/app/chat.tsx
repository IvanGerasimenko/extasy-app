import BottomMenu from "@/components/BottomMenu";
import { ThemedBackground } from "@/components/ThemedBackground";
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
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const isWeb = Platform.OS === "web";

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
      <ThemedBackground style={styles.background}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#111" />
        </View>
      </ThemedBackground>
    );
  }

  const otherUser = match ? getOtherUser(match, currentUserKey) : null;
  const photo = otherUser?.photos?.[0] ?? otherUser?.picture;

  return (
    <ThemedBackground style={styles.background}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
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

        <View style={styles.chatSurface}>
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
              <Text style={styles.sendText}>Senden</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      <BottomMenu />
    </ThemedBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
  },

  screen: {
    flex: 1,
    width: "100%",
    maxWidth: isWeb ? 760 : undefined,
    alignSelf: "center",
    paddingTop: isWeb ? 32 : 58,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: isWeb ? 20 : 18,
    paddingBottom: isWeb ? 18 : 16,
    gap: 12,
    backgroundColor: "#fffffffa",
    borderRadius: 26,
    paddingTop: 22,
    marginBottom: isWeb ? 24 : 40,
  },

  navButton: {
    width: 44,
    height: 44,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.88)",
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
    fontSize: isWeb ? 22 : 20,
    fontWeight: "700",
  },

  subtitle: {
    color: "#6E6E73",
    fontSize: 13,
    marginTop: 2,
  },

  chatSurface: {
    flex: 1,
    marginHorizontal: isWeb ? 20 : 14,
    marginBottom: isWeb ? 104 : 92,
    borderRadius: isWeb ? 30 : 28,
    backgroundColor: "rgba(255, 255, 255, 0.34)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.76)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 18,
    },
    shadowOpacity: 0.12,
    shadowRadius: 32,
    elevation: 10,
  },

  messages: {
    flex: 1,
  },

  messagesContent: {
    paddingHorizontal: isWeb ? 20 : 18,
    paddingTop: isWeb ? 22 : 18,
    paddingBottom: isWeb ? 20 : 18,
  },

  messageBubble: {
    maxWidth: isWeb ? "68%" : "78%",
    borderRadius: isWeb ? 20 : 22,
    paddingHorizontal: isWeb ? 18 : 16,
    paddingVertical: 12,
    marginBottom: isWeb ? 12 : 10,
  },

  myMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#111",
    borderBottomRightRadius: 8,
  },

  theirMessage: {
    alignSelf: "flex-start",
    backgroundColor: "rgb(255, 255, 255)",
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
    backgroundColor: "rgb(255, 255, 255)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.86)",
    alignItems: "center",
    justifyContent: "center",
    padding: 26,
    marginTop: isWeb ? 24 : 40,
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
    paddingHorizontal: isWeb ? 20 : 14,
    paddingTop: isWeb ? 14 : 14,
    paddingBottom: isWeb ? 18 : 16,
    backgroundColor: "transparent",
  },

  input: {
    flex: 1,
    minHeight: 50,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.58)",
    paddingHorizontal: 16,
    color: "#111",
    fontSize: 15,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 8,
  },

  sendButton: {
    minWidth: 88,
    height: 50,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.58)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.88)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 8,
  },

  sendText: {
    color: "#111",
    fontSize: 15,
    fontWeight: "700",
  },
});
