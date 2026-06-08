import {
  PremiumEmptyState,
  PremiumLoadingState,
} from "@/components/PremiumUI";
import { FadeIn, ScalePressable } from "@/components/Motion";
import { ThemedBackground } from "@/components/ThemedBackground";
import { datingColors, datingShadow } from "@/constants/datingDesign";
import {
  premiumColors,
  premiumShadow,
  premiumSpacing,
} from "@/constants/premiumDesign";
import { getCountryLabel } from "@/constants/germanLabels";
import {
  getChatMessages,
  getChatReadReceipts,
  getCurrentUserMatches,
  getSessionUser,
  getUserKey,
  type ChatMessage,
  type MatchRecord,
} from "@/services/auth/session";
import { supabase } from "@/services/supabase";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const isWeb = Platform.OS === "web";

type ChatSummary = {
  lastMessage: ChatMessage | null;
  currentUserLastReadAt: string | null;
  otherUserLastReadAt: string | null;
};

function getOtherUser(match: MatchRecord, currentUserKey: string) {
  const otherUserKey = match.userKeys.find(
    (userKey) => userKey !== currentUserKey,
  );
  return otherUserKey ? match.users[otherUserKey] : null;
}

async function getChatSummary(
  match: MatchRecord,
  currentUserKey: string,
): Promise<ChatSummary> {
  const otherUser = getOtherUser(match, currentUserKey);
  const [messages, readReceipts] = await Promise.all([
    getChatMessages(match.id),
    getChatReadReceipts(match.id),
  ]);

  return {
    lastMessage: messages.at(-1) ?? null,
    currentUserLastReadAt:
      readReceipts.find((receipt) => receipt.userKey === currentUserKey)
        ?.lastReadAt ?? null,
    otherUserLastReadAt:
      readReceipts.find((receipt) => receipt.userKey === otherUser?.id)
        ?.lastReadAt ?? null,
  };
}

function getMessagePreview(message: ChatMessage | null) {
  if (!message) return "Ihr mögt euch beide. Sag ehrlich Hallo.";
  if (message.text) return message.text;
  if (message.emoji) return message.emoji;
  if (message.imageUri) return "Foto";
  return "Neue Nachricht";
}

function formatMessageTime(createdAt?: string) {
  if (!createdAt) return "";

  const date = new Date(createdAt);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();

  if (isToday) {
    return new Intl.DateTimeFormat("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

function getRealtimeMatchId(
  nextRecord: Record<string, unknown>,
  previousRecord: Record<string, unknown>,
) {
  const matchId = nextRecord.match_id ?? previousRecord.match_id;
  return typeof matchId === "string" ? matchId : null;
}

export default function ChatsScreen() {
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [chatSummaries, setChatSummaries] = useState<
    Record<string, ChatSummary>
  >({});
  const [currentUserKey, setCurrentUserKey] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function loadChats() {
        const [user, userMatches] = await Promise.all([
          getSessionUser(),
          getCurrentUserMatches(),
        ]);

        if (!user) {
          router.replace("/welcome");
          return;
        }

        if (!isActive) {
          return;
        }

        const userKey = getUserKey(user);
        setCurrentUserKey(userKey);
        setMatches(userMatches);
        setIsLoading(false);

        await Promise.all(
          userMatches.map(async (match) => {
            const summary = await getChatSummary(match, userKey);

            if (!isActive) {
              return;
            }

            setChatSummaries((current) => ({
              ...current,
              [match.id]: summary,
            }));
          }),
        );
      }

      void loadChats();

      return () => {
        isActive = false;
      };
    }, []),
  );

  useEffect(() => {
    if (!currentUserKey || !matches.length) {
      return;
    }

    async function refreshSummary(matchId: string) {
      const match = matches.find((item) => item.id === matchId);
      if (!match) return;

      const summary = await getChatSummary(match, currentUserKey);
      setChatSummaries((current) => ({
        ...current,
        [matchId]: summary,
      }));
    }

    const messagesChannel = supabase
      .channel("chat-list-messages")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        (payload) => {
          const matchId = getRealtimeMatchId(payload.new, payload.old);
          if (matchId) {
            void refreshSummary(matchId);
          }
        },
      )
      .subscribe();
    const readsChannel = supabase
      .channel("chat-list-reads")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_reads" },
        (payload) => {
          const matchId = getRealtimeMatchId(payload.new, payload.old);
          if (matchId) {
            void refreshSummary(matchId);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(messagesChannel);
      void supabase.removeChannel(readsChannel);
    };
  }, [currentUserKey, matches]);

  if (isLoading) {
    return (
      <ThemedBackground style={styles.background}>
        <PremiumLoadingState label="Gespräche werden geladen" />
      </ThemedBackground>
    );
  }

  const visibleMatches = matches.filter((match) => {
    const otherUser = getOtherUser(match, currentUserKey);
    return (otherUser?.name ?? "Match")
      .toLowerCase()
      .includes(query.trim().toLowerCase());
  });

  return (
    <ThemedBackground style={styles.background}>
      <ScrollView contentContainerStyle={styles.container}>
        <FadeIn>
          <Text style={styles.eyebrow}>POSTEINGANG</Text>
          <Text style={styles.pageTitle}>Gespräche</Text>
          <Text style={styles.pageSubtitle}>
            Eure Matches, Nachrichten und neuen Verbindungen.
          </Text>
          <View style={styles.search}>
            <Text style={styles.searchIcon}>⌕</Text>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Matches suchen"
              placeholderTextColor={datingColors.textMuted}
              style={styles.searchInput}
            />
          </View>
        </FadeIn>

        {visibleMatches.length ? (
          visibleMatches.map((match, index) => {
            const otherUser = getOtherUser(match, currentUserKey);
            const photo = otherUser?.photos?.[0] ?? otherUser?.picture;
            const summary = chatSummaries[match.id];
            const lastMessage = summary?.lastMessage ?? null;
            const isLastMessageMine =
              lastMessage?.senderKey === currentUserKey;
            const isLastMessageRead =
              Boolean(lastMessage && summary?.otherUserLastReadAt) &&
              new Date(summary?.otherUserLastReadAt ?? 0).getTime() >=
                new Date(lastMessage?.createdAt ?? 0).getTime();
            const hasUnreadIncoming =
              Boolean(lastMessage && !isLastMessageMine) &&
              (!summary?.currentUserLastReadAt ||
                new Date(summary.currentUserLastReadAt).getTime() <
                  new Date(lastMessage?.createdAt ?? 0).getTime());

            return (
              <FadeIn key={match.id} delay={80 + index * 55}>
                <ScalePressable
                  style={styles.chatRow}
                  onPress={() => router.push(`/chat?matchId=${match.id}`)}
                >
                {photo ? (
                  <TouchableOpacity
                    onPress={() =>
                      otherUser &&
                      router.push(
                        `/userProfile?userKey=${getUserKey(otherUser)}`,
                      )
                    }
                  >
                    <Image source={{ uri: photo }} style={styles.avatar} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.avatarPlaceholder}
                    onPress={() =>
                      otherUser &&
                      router.push(
                        `/userProfile?userKey=${getUserKey(otherUser)}`,
                      )
                    }
                  >
                    <Text style={styles.avatarInitial}>
                      {otherUser?.name?.slice(0, 1).toUpperCase() ?? "E"}
                    </Text>
                  </TouchableOpacity>
                )}

                <View style={styles.chatCopy}>
                  <View style={styles.chatTitleRow}>
                    <Text style={styles.chatName}>
                      {otherUser?.name ?? "Match"}
                    </Text>
                    <Text style={styles.timeText}>
                      {formatMessageTime(lastMessage?.createdAt)}
                    </Text>
                  </View>
                  {otherUser?.city && otherUser.country ? (
                    <Text style={styles.chatLocation} numberOfLines={1}>
                      {otherUser.city}, {getCountryLabel(otherUser.country)}
                    </Text>
                  ) : null}
                  <Text style={styles.chatPreview}>
                    {getMessagePreview(lastMessage)}
                  </Text>
                </View>

                {isLastMessageMine ? (
                  <Text
                    style={[
                      styles.sessionReceipt,
                      isLastMessageRead
                        ? styles.sessionReceiptRead
                        : styles.sessionReceiptUnread,
                    ]}
                  >
                    ✓
                  </Text>
                ) : hasUnreadIncoming ? (
                  <View style={styles.unreadBadge} />
                ) : null}
                </ScalePressable>
              </FadeIn>
            );
          })
        ) : (
          <PremiumEmptyState
            title="Noch keine Chats"
            text="Wenn Sympathie gegenseitig wird, erscheint das Gespräch hier."
          />
        )}
      </ScrollView>
    </ThemedBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    backgroundColor: datingColors.background,
  },

  container: {
    width: "100%",
    maxWidth: isWeb ? 920 : undefined,
    alignSelf: "center",
    paddingHorizontal: isWeb ? 34 : premiumSpacing.screenX,
    paddingTop: isWeb ? 34 : premiumSpacing.screenTop,
    paddingBottom: isWeb ? 150 : premiumSpacing.screenBottom,
    gap: 14,
  },

  eyebrow: {
    color: datingColors.accent,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.4,
  },

  pageTitle: {
    color: datingColors.text,
    fontSize: isWeb ? 38 : 34,
    lineHeight: isWeb ? 44 : 40,
    fontWeight: "900",
    marginTop: 7,
  },

  pageSubtitle: {
    color: datingColors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 7,
  },

  search: {
    height: 54,
    borderRadius: 20,
    backgroundColor: datingColors.surface,
    borderWidth: 1,
    borderColor: datingColors.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginTop: 22,
    marginBottom: 10,
  },

  searchIcon: {
    color: datingColors.accent,
    fontSize: 25,
    marginRight: 10,
  },

  searchInput: {
    flex: 1,
    minWidth: 0,
    color: datingColors.text,
    fontSize: 15,
    outlineStyle: "none",
  } as never,

  navButton: {
    width: 44,
    height: 44,
    alignSelf: "flex-start",
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.78)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },

  navText: {
    color: "#111",
    fontSize: 34,
    lineHeight: 36,
  },

  title: {
    color: premiumColors.ink,
    fontSize: isWeb ? 34 : 36,
    fontWeight: "700",
  },

  chatRow: {
    minHeight: isWeb ? 92 : 86,
    borderRadius: 24,
    backgroundColor: datingColors.surface,
    borderWidth: 1,
    borderColor: datingColors.border,
    flexDirection: "row",
    alignItems: "center",
    padding: isWeb ? 16 : 14,
    ...datingShadow,
  },

  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: datingColors.surfaceSoft,
    borderWidth: 2,
    borderColor: "rgba(232, 62, 124, 0.28)",
  },

  avatarPlaceholder: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: datingColors.accentDark,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarInitial: {
    color: "#FFF",
    fontSize: 22,
  },

  chatCopy: {
    flex: 1,
    marginLeft: 14,
  },

  chatTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  chatName: {
    flex: 1,
    color: datingColors.text,
    fontSize: 18,
    fontWeight: "800",
  },

  timeText: {
    color: datingColors.textMuted,
    fontSize: 11,
    fontWeight: "700",
  },

  chatPreview: {
    color: datingColors.textMuted,
    fontSize: 14,
    marginTop: 4,
  },

  chatLocation: {
    color: datingColors.accent,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
  },

  unreadBadge: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: datingColors.accent,
    marginLeft: 10,
  },

  sessionReceipt: {
    width: 22,
    marginLeft: 8,
    textAlign: "center",
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "900",
  },

  sessionReceiptRead: {
    color: datingColors.accent,
  },

  sessionReceiptUnread: {
    color: datingColors.textMuted,
  },
});
