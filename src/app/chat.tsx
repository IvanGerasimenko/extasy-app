import BottomMenu from "@/components/BottomMenu";
import { PremiumEmptyState, PremiumLoadingState } from "@/components/PremiumUI";
import { ThemedBackground } from "@/components/ThemedBackground";
import { datingColors, datingShadow } from "@/constants/datingDesign";
import { getCountryLabel, getInterestLabel } from "@/constants/Labels";
import { premiumColors, premiumShadow } from "@/constants/premiumDesign";
import {
  deleteChatMessage,
  getChatMessages,
  getMatchById,
  getSessionUser,
  getUserKey,
  markChatRead,
  reactToChatMessage,
  sendChatMessage,
  type ChatMessage,
  type MatchRecord,
} from "@/services/auth/session";
import {
  getUserLastSeen,
  isUserOnline,
  subscribeToPresence,
} from "@/services/presence";
import { supabase } from "@/services/supabase";
import * as ExpoImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Animated,
  AppState,
  Image,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
  type AlertButton,
  type StyleProp,
  type ViewStyle,
} from "react-native";

const isWeb = Platform.OS === "web";
const FULL_HD_MAX_SIZE = 1920;
const FULL_HD_JPEG_QUALITY = 0.92;
const emojiOptions = [
  "😀",
  "😊",
  "😍",
  "🥰",
  "😘",
  "😌",
  "😂",
  "🙂",
  "😉",
  "😎",
  "🤍",
  "✨",
  "🔥",
  "☕️",
  "🍷",
  "🌿",
  "🌙",
  "⭐️",
  "🎧",
  "📍",
  "💬",
  "👏",
  "🙌",
  "🫶",
  "😒",
  "😢",
  "💁",
  "🤨",
  "🤮",
  "😳",
  "🤯",
  "😰",
];

function getOtherUser(match: MatchRecord, currentUserKey: string) {
  const otherUserKey = match.userKeys.find(
    (userKey) => userKey !== currentUserKey,
  );
  return otherUserKey ? match.users[otherUserKey] : null;
}

function formatLastSeen(lastSeenAt: string | null) {
  if (!lastSeenAt) return "Offline";

  const lastSeen = new Date(lastSeenAt);
  const elapsedMs = Math.max(0, Date.now() - lastSeen.getTime());
  const elapsedMinutes = Math.floor(elapsedMs / 60_000);

  if (elapsedMinutes < 1) return "Gerade eben online";
  if (elapsedMinutes < 60) return `Zuletzt online vor ${elapsedMinutes} Min.`;

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `Zuletzt online vor ${elapsedHours} Std.`;

  const elapsedDays = Math.floor(elapsedHours / 24);
  if (elapsedDays === 1) return "Zuletzt online gestern";
  if (elapsedDays < 7) return `Zuletzt online vor ${elapsedDays} Tagen`;

  return `Zuletzt online am ${new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year:
      lastSeen.getFullYear() === new Date().getFullYear()
        ? undefined
        : "numeric",
  }).format(lastSeen)}`;
}

function realtimeRecordToChatMessage(
  record: Record<string, unknown>,
): ChatMessage | null {
  if (
    typeof record.id !== "string" ||
    typeof record.match_id !== "string" ||
    typeof record.sender_id !== "string" ||
    typeof record.created_at !== "string"
  ) {
    return null;
  }

  return {
    id: record.id,
    matchId: record.match_id,
    senderKey: record.sender_id,
    text: typeof record.text === "string" ? record.text : undefined,
    imageUri:
      typeof record.image_url === "string" ? record.image_url : undefined,
    emoji: typeof record.emoji === "string" ? record.emoji : undefined,
    photoReaction:
      typeof record.photo_reaction === "string"
        ? record.photo_reaction
        : undefined,
    createdAt: record.created_at,
  };
}

function mergeChatMessage(
  currentMessages: ChatMessage[],
  nextMessage: ChatMessage,
) {
  const existingIndex = currentMessages.findIndex(
    (message) => message.id === nextMessage.id,
  );

  if (existingIndex === -1) {
    return [...currentMessages, nextMessage];
  }

  const nextMessages = [...currentMessages];
  nextMessages[existingIndex] = nextMessage;
  return nextMessages;
}

function getMessagePreview(message: ChatMessage) {
  return (
    message.text || message.emoji || (message.imageUri ? "Foto" : "Nachricht")
  );
}

function SpringMessage({
  children,
  style,
  onLongPress,
}: {
  children: React.ReactNode;
  style: StyleProp<ViewStyle>;
  onLongPress: () => void;
}) {
  const scale = React.useRef(new Animated.Value(1)).current;
  const longPressTimer = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const longPressTriggered = React.useRef(false);
  const pressStart = React.useRef({ x: 0, y: 0 });

  React.useEffect(
    () => () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    },
    [],
  );

  function animate(value: number) {
    Animated.spring(scale, {
      toValue: value,
      friction: 4,
      tension: 220,
      useNativeDriver: true,
    }).start();
  }

  function triggerLongPress() {
    if (longPressTriggered.current) return;

    longPressTriggered.current = true;
    animate(0.94);
    setTimeout(() => animate(1), 120);
    onLongPress();
  }

  function startNativePress() {
    longPressTriggered.current = false;
    animate(0.96);
  }

  function clearLongPressTimer() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function endNativePress() {
    clearLongPressTimer();
    if (!longPressTriggered.current) {
      animate(1);
    }
  }

  function startWebPress(event: {
    nativeEvent: { pageX?: number; pageY?: number };
  }) {
    clearLongPressTimer();
    longPressTriggered.current = false;
    pressStart.current = {
      x: event.nativeEvent.pageX ?? 0,
      y: event.nativeEvent.pageY ?? 0,
    };
    longPressTimer.current = setTimeout(triggerLongPress, 360);
  }

  function moveWebPress(event: {
    nativeEvent: { pageX?: number; pageY?: number };
  }) {
    const movedX = Math.abs(
      (event.nativeEvent.pageX ?? pressStart.current.x) - pressStart.current.x,
    );
    const movedY = Math.abs(
      (event.nativeEvent.pageY ?? pressStart.current.y) - pressStart.current.y,
    );

    if (movedX > 14 || movedY > 14) {
      clearLongPressTimer();
    }
  }

  const animatedStyle = [
    style,
    styles.messageInteraction,
    { transform: [{ scale }] },
  ];

  if (isWeb) {
    return (
      <Animated.View
        style={animatedStyle}
        onPointerDown={startWebPress}
        onPointerMove={moveWebPress}
        onPointerUp={clearLongPressTimer}
        onPointerCancel={clearLongPressTimer}
        onPointerLeave={clearLongPressTimer}
        {...({
          onContextMenu: (event: { preventDefault(): void }) => {
            event.preventDefault();
            triggerLongPress();
          },
        } as object)}
      >
        {children}
      </Animated.View>
    );
  }

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPressIn={startNativePress}
        onPressOut={endNativePress}
        onLongPress={triggerLongPress}
        delayLongPress={350}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

export default function ChatScreen() {
  const { matchId } = useLocalSearchParams<{ matchId?: string }>();
  const { width: viewportWidth } = useWindowDimensions();
  const [match, setMatch] = useState<MatchRecord | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentUserKey, setCurrentUserKey] = useState("");
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [attachmentOpen, setAttachmentOpen] = useState(false);
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [photoReactionOpen, setPhotoReactionOpen] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState("");
  const [fullscreenImageUri, setFullscreenImageUri] = useState("");
  const [reactionMessageId, setReactionMessageId] = useState("");
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);
  const [webActionMessage, setWebActionMessage] = useState<ChatMessage | null>(
    null,
  );
  const [webReactionMessage, setWebReactionMessage] =
    useState<ChatMessage | null>(null);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [profileDrawerVisible, setProfileDrawerVisible] = useState(false);
  const [otherUserOnline, setOtherUserOnline] = useState(false);
  const [otherUserLastSeen, setOtherUserLastSeen] = useState<string | null>(
    null,
  );
  const [webVisualViewport, setWebVisualViewport] = useState<{
    height: number;
    offsetTop: number;
  } | null>(null);
  const [, setPresenceClock] = useState(0);
  const profileDrawerProgress = React.useRef(new Animated.Value(1)).current;
  const messagesScrollRef = React.useRef<ScrollView>(null);
  const typingChannelRef = React.useRef<ReturnType<
    typeof supabase.channel
  > | null>(null);
  const typingStopTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const remoteTypingTimerRef = React.useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const otherUser = match ? getOtherUser(match, currentUserKey) : null;
  const otherUserId = otherUser?.id ?? "";

  function scrollMessagesToEnd(animated = true) {
    messagesScrollRef.current?.scrollToEnd({ animated });
  }

  async function markVisibleMessagesRead() {
    if (!matchId) {
      return;
    }
    if (
      isWeb &&
      typeof document !== "undefined" &&
      document.visibilityState !== "visible"
    ) {
      return;
    }
    if (!isWeb && AppState.currentState !== "active") {
      return;
    }

    try {
      await markChatRead(matchId);
    } catch (error) {
      if (__DEV__) {
        console.warn("Chat read receipt failed:", error);
      }
    }
  }

  useEffect(() => {
    if (!isWeb || !webVisualViewport) {
      return;
    }

    const animationFrame = requestAnimationFrame(() => {
      scrollMessagesToEnd(false);
    });

    return () => cancelAnimationFrame(animationFrame);
  }, [webVisualViewport]);

  useEffect(() => {
    if (!isWeb || typeof window === "undefined") {
      return;
    }

    function syncVisualViewport() {
      const visualViewport = window.visualViewport;

      setWebVisualViewport({
        height: visualViewport?.height ?? window.innerHeight,
        offsetTop: visualViewport?.offsetTop ?? 0,
      });
    }

    syncVisualViewport();
    window.visualViewport?.addEventListener("resize", syncVisualViewport);
    window.visualViewport?.addEventListener("scroll", syncVisualViewport);
    window.addEventListener("resize", syncVisualViewport);

    return () => {
      window.visualViewport?.removeEventListener("resize", syncVisualViewport);
      window.visualViewport?.removeEventListener("scroll", syncVisualViewport);
      window.removeEventListener("resize", syncVisualViewport);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadChat() {
      if (!matchId) {
        router.replace("/welcome");
        return;
      }

      const [user, foundMatch, chatMessages] = await Promise.all([
        getSessionUser(),
        getMatchById(matchId),
        getChatMessages(matchId),
      ]);

      if (!isMounted) {
        return;
      }

      if (!user || !foundMatch) {
        router.replace("/welcome");
        return;
      }

      const userKey = getUserKey(user);
      setCurrentUserKey(userKey);
      setMatch(foundMatch);
      setMessages(chatMessages);
      setIsLoading(false);
      void markVisibleMessagesRead();
    }

    loadChat();

    return () => {
      isMounted = false;
    };
  }, [matchId]);

  useEffect(() => {
    if (!matchId) {
      return;
    }

    const channel = supabase
      .channel(`chat-messages:${matchId}:${currentUserKey}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const deletedId = payload.old.id;
            if (typeof deletedId === "string") {
              setMessages((currentMessages) =>
                currentMessages.filter((message) => message.id !== deletedId),
              );
            }
            return;
          }

          const nextMessage = realtimeRecordToChatMessage(payload.new);
          if (nextMessage) {
            setMessages((currentMessages) =>
              mergeChatMessage(currentMessages, nextMessage),
            );
            if (
              payload.eventType === "INSERT" &&
              nextMessage.senderKey !== currentUserKey
            ) {
              void markVisibleMessagesRead();
            }
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentUserKey, matchId]);

  useEffect(() => {
    if (!matchId || !currentUserKey) {
      return;
    }

    const channel = supabase.channel(`typing:${matchId}`);

    channel.on("broadcast", { event: "typing" }, ({ payload }) => {
      if (payload.userId === currentUserKey) {
        return;
      }

      const nextIsTyping = Boolean(payload.isTyping);
      setIsOtherUserTyping(nextIsTyping);

      if (remoteTypingTimerRef.current) {
        clearTimeout(remoteTypingTimerRef.current);
      }
      if (nextIsTyping) {
        remoteTypingTimerRef.current = setTimeout(
          () => setIsOtherUserTyping(false),
          3_000,
        );
      }
    });

    channel.subscribe();
    typingChannelRef.current = channel;

    return () => {
      if (typingStopTimerRef.current) {
        clearTimeout(typingStopTimerRef.current);
      }
      if (remoteTypingTimerRef.current) {
        clearTimeout(remoteTypingTimerRef.current);
      }
      typingChannelRef.current = null;
      setIsOtherUserTyping(false);
      void supabase.removeChannel(channel);
    };
  }, [currentUserKey, matchId]);

  useEffect(() => {
    if (!matchId) {
      return;
    }

    const appStateSubscription = AppState.addEventListener(
      "change",
      (state) => {
        if (state === "active") {
          void markVisibleMessagesRead();
        }
      },
    );
    const visibilityHandler = () => {
      if (document.visibilityState === "visible") {
        void markVisibleMessagesRead();
      }
    };

    if (isWeb && typeof document !== "undefined") {
      document.addEventListener("visibilitychange", visibilityHandler);
    }

    return () => {
      appStateSubscription.remove();
      if (isWeb && typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", visibilityHandler);
      }
    };
  }, [matchId]);

  useEffect(() => {
    if (!otherUserId) return;

    let mounted = true;

    async function refreshPresence() {
      const online = isUserOnline(otherUserId);
      if (!mounted) return;
      setOtherUserOnline(online);

      if (!online) {
        const lastSeen = await getUserLastSeen(otherUserId);
        if (mounted) setOtherUserLastSeen(lastSeen);
      }
    }

    const unsubscribe = subscribeToPresence(() => {
      void refreshPresence();
    });
    const refreshInterval = setInterval(() => {
      void refreshPresence();
      setPresenceClock((value) => value + 1);
    }, 30_000);

    void refreshPresence();

    return () => {
      mounted = false;
      unsubscribe();
      clearInterval(refreshInterval);
    };
  }, [otherUserId]);

  useEffect(() => {
    if (!profileDrawerVisible) {
      return;
    }

    Animated.timing(profileDrawerProgress, {
      toValue: 0,
      duration: 240,
      useNativeDriver: true,
    }).start();
  }, [profileDrawerProgress, profileDrawerVisible]);

  async function handleSendText() {
    const text = draft.trim();

    if (!matchId || !text || !currentUserKey) {
      return;
    }

    const pendingId = `pending:${Date.now()}:${Math.random()}`;
    const pendingMessage: ChatMessage = {
      id: pendingId,
      matchId,
      senderKey: currentUserKey,
      text,
      replyTo: replyTarget
        ? {
            id: replyTarget.id,
            text: getMessagePreview(replyTarget),
            senderName:
              match?.users[replyTarget.senderKey]?.name ?? "Nachricht",
          }
        : undefined,
      createdAt: new Date().toISOString(),
    };

    setDraft("");
    sendTypingState(false);
    setReplyTarget(null);
    setMessages((currentMessages) => [...currentMessages, pendingMessage]);

    try {
      const message = await sendChatMessage(matchId, {
        text,
        replyTo: pendingMessage.replyTo,
      });

      if (!message) {
        throw new Error("Message could not be sent");
      }

      setMessages((currentMessages) =>
        mergeChatMessage(
          currentMessages.filter((item) => item.id !== pendingId),
          message,
        ),
      );
    } catch (error) {
      setMessages((currentMessages) =>
        currentMessages.filter((item) => item.id !== pendingId),
      );
      setDraft((currentDraft) => currentDraft || text);
      setReplyTarget((currentTarget) => currentTarget ?? replyTarget);

      if (__DEV__) {
        console.warn("Message send failed:", error);
      }
    }
  }

  function sendTypingState(isTyping: boolean) {
    if (!currentUserKey || !typingChannelRef.current) {
      return;
    }

    void typingChannelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: {
        userId: currentUserKey,
        isTyping,
      },
    });
  }

  function handleDraftChange(nextDraft: string) {
    setDraft(nextDraft);

    if (typingStopTimerRef.current) {
      clearTimeout(typingStopTimerRef.current);
    }

    const hasText = Boolean(nextDraft.trim());
    sendTypingState(hasText);

    if (hasText) {
      typingStopTimerRef.current = setTimeout(
        () => sendTypingState(false),
        1_500,
      );
    }
  }

  function stopTyping() {
    if (typingStopTimerRef.current) {
      clearTimeout(typingStopTimerRef.current);
    }
    sendTypingState(false);
  }

  function openReactionMenu(message: ChatMessage) {
    if (isWeb) {
      setWebActionMessage(null);
      setWebReactionMessage(message);
      return;
    }

    const reactionActions: AlertButton[] = ["👍", "❤️", "😂"].map((emoji) => ({
      text: emoji,
      onPress: () => void handleReactToMessage(message.id, emoji),
    }));

    Alert.alert("Reaktion", "Wähle eine Reaktion", [
      ...reactionActions,
      { text: "Abbrechen", style: "cancel" },
    ]);
  }

  function openMessageActions(message: ChatMessage) {
    if (isWeb) {
      setWebActionMessage(message);
      return;
    }

    const actions: AlertButton[] = [
      {
        text: "Antworten",
        onPress: () => setReplyTarget(message),
      },
      {
        text: "Reaktion",
        onPress: () => openReactionMenu(message),
      },
    ];

    if (message.senderKey === currentUserKey) {
      actions.push({
        text: "Löschen",
        onPress: () => void handleDeleteMessage(message.id),
      });
    }

    Alert.alert("Nachricht", getMessagePreview(message), [
      ...actions,
      { text: "Abbrechen", style: "cancel" },
    ]);
  }

  async function handleReactToMessage(messageId: string, emoji: string) {
    const updatedMessage = await reactToChatMessage(messageId, emoji);
    if (!updatedMessage) return;

    setMessages((current) =>
      current.map((message) =>
        message.id === updatedMessage.id ? updatedMessage : message,
      ),
    );
    setWebReactionMessage(null);
  }

  async function handleDeleteMessage(messageId: string) {
    const deletedMessage = messages.find((message) => message.id === messageId);
    if (!deletedMessage) return;

    setMessages((current) =>
      current.filter((message) => message.id !== messageId),
    );
    setReplyTarget((current) => (current?.id === messageId ? null : current));
    setWebActionMessage(null);

    try {
      const deletedId = await deleteChatMessage(messageId);
      if (!deletedId) {
        throw new Error("Message was not deleted");
      }
    } catch (error) {
      setMessages((current) =>
        current.some((message) => message.id === deletedMessage.id)
          ? current
          : [...current, deletedMessage].sort(
              (first, second) =>
                new Date(first.createdAt).getTime() -
                new Date(second.createdAt).getTime(),
            ),
      );

      if (isWeb && typeof window !== "undefined") {
        window.alert(
          "Die Nachricht konnte nicht gelöscht werden. Prüfe, ob die Supabase-Migration angewendet wurde.",
        );
      } else {
        Alert.alert(
          "Löschen fehlgeschlagen",
          "Die Nachricht konnte nicht gelöscht werden.",
        );
      }

      if (__DEV__) {
        console.warn("Message delete failed:", error);
      }
    }
  }

  async function handlePickImage() {
    if (Platform.OS !== "web") {
      const permission =
        await ExpoImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        return;
      }
    }

    const result = await ExpoImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedImageUri(await prepareChatImage(result.assets[0].uri));
    }
  }

  async function handleSendImage() {
    if (!matchId || !selectedImageUri) {
      return;
    }

    const message = await sendChatMessage(matchId, {
      imageUri: selectedImageUri,
    });

    if (!message) {
      return;
    }

    setMessages((currentMessages) =>
      currentMessages.some((item) => item.id === message.id)
        ? currentMessages
        : [...currentMessages, message],
    );
    setSelectedImageUri("");
    setImagePickerOpen(false);
  }

  async function handleSendEmoji(emoji: string) {
    if (!matchId) {
      return;
    }

    const message = await sendChatMessage(matchId, { emoji });

    if (!message) {
      return;
    }

    setMessages((currentMessages) =>
      currentMessages.some((item) => item.id === message.id)
        ? currentMessages
        : [...currentMessages, message],
    );
    setEmojiPickerOpen(false);
  }

  async function handleReactToPhoto(emoji: string) {
    if (!reactionMessageId) {
      return;
    }

    const updatedMessage = await reactToChatMessage(reactionMessageId, emoji);

    if (!updatedMessage) {
      return;
    }

    setMessages((currentMessages) =>
      currentMessages.map((message) =>
        message.id === updatedMessage.id ? updatedMessage : message,
      ),
    );
    setReactionMessageId("");
    setPhotoReactionOpen(false);
  }

  function openProfileDrawer() {
    profileDrawerProgress.setValue(1);
    setProfileDrawerVisible(true);
  }

  function closeProfileDrawer() {
    Animated.timing(profileDrawerProgress, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start(() => setProfileDrawerVisible(false));
  }

  const profileDrawerPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > 18 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.2,
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx > 44) {
            closeProfileDrawer();
          }
        },
      }),
    [profileDrawerProgress],
  );

  if (isLoading) {
    return (
      <ThemedBackground style={styles.background}>
        <PremiumLoadingState label="Gespräch wird geöffnet" />
      </ThemedBackground>
    );
  }

  const photo = otherUser?.photos?.[0] ?? otherUser?.picture;
  const isNarrowWeb = isWeb && viewportWidth < 1120;
  const isCompactWeb = isWeb && viewportWidth < 760;

  function handleComposerFocus() {
    if (!isCompactWeb) {
      return;
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => scrollMessagesToEnd(false));
    });
  }

  function renderMessages() {
    return (
      <ScrollView
        ref={messagesScrollRef}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scrollMessagesToEnd()}
        showsVerticalScrollIndicator={false}
      >
        {messages.length ? (
          messages.map((message) => {
            const isMine = message.senderKey === currentUserKey;

            return (
              <SpringMessage
                key={message.id}
                onLongPress={() => openMessageActions(message)}
                style={[
                  styles.messageBubble,
                  message.imageUri && styles.imageBubble,
                  message.emoji && styles.emojiBubble,
                  isMine ? styles.myMessage : styles.theirMessage,
                  message.imageUri && styles.transparentBubble,
                ]}
              >
                {message.replyTo ? (
                  <View style={styles.replyQuote}>
                    <Text style={styles.replyQuoteName}>
                      {message.replyTo.senderName}
                    </Text>
                    <Text style={styles.replyQuoteText} numberOfLines={2}>
                      {message.replyTo.text}
                    </Text>
                  </View>
                ) : null}
                {message.imageUri ? (
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() =>
                      setFullscreenImageUri(message.imageUri ?? "")
                    }
                    onLongPress={() => openMessageActions(message)}
                  >
                    <Image
                      source={{ uri: message.imageUri }}
                      style={styles.messageImage}
                    />
                    {message.photoReaction ? (
                      <View
                        style={[
                          styles.photoReaction,
                          isMine
                            ? styles.myPhotoReaction
                            : styles.theirPhotoReaction,
                        ]}
                      >
                        <Text style={styles.photoReactionText}>
                          {message.photoReaction}
                        </Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                ) : null}
                {message.emoji ? (
                  <Text style={styles.emojiMessage}>{message.emoji}</Text>
                ) : null}
                {message.text ? (
                  <Text
                    style={[
                      styles.messageText,
                      isMine ? styles.myMessageText : styles.theirMessageText,
                    ]}
                  >
                    {message.text}
                  </Text>
                ) : null}
                {message.reaction ? (
                  <Text style={styles.inlineReaction}>{message.reaction}</Text>
                ) : null}
              </SpringMessage>
            );
          })
        ) : (
          <PremiumEmptyState
            title="Ihr habt ein Match"
            text={`Starte das Gespräch mit ${otherUser?.name ?? "deinem Match"} mit einer aufmerksamen Nachricht.`}
          />
        )}
      </ScrollView>
    );
  }

  function renderChatHeader() {
    return (
      <View style={styles.conversationHeader}>
        <TouchableOpacity
          activeOpacity={0.78}
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.82}
          style={styles.conversationPerson}
          onPress={openProfileDrawer}
        >
          {photo ? (
            <Image source={{ uri: photo }} style={styles.conversationAvatar} />
          ) : (
            <View style={styles.conversationAvatarPlaceholder}>
              <Text style={styles.conversationAvatarInitial}>
                {otherUser?.name?.slice(0, 1).toUpperCase() ?? "E"}
              </Text>
            </View>
          )}
          <View style={styles.conversationCopy}>
            <Text style={styles.conversationName} numberOfLines={1}>
              {otherUser?.name ?? "Match"}
            </Text>
            <View style={styles.onlineRow}>
              <View
                style={[
                  styles.onlineDot,
                  !otherUserOnline && styles.offlineDot,
                ]}
              />
              <Text style={styles.onlineText} numberOfLines={1}>
                {otherUserOnline ? "Online" : formatLastSeen(otherUserLastSeen)}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.78}
          style={styles.profileMenuButton}
          onPress={openProfileDrawer}
        >
          <Text style={styles.profileMenuText}>•••</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderComposer() {
    return (
      <View>
        {renderReplyBar()}
        <View style={[styles.composer, isCompactWeb && styles.compactComposer]}>
          <TouchableOpacity
            style={[
              styles.attachButton,
              isCompactWeb && styles.compactComposerButton,
            ]}
            onPress={() => setAttachmentOpen(true)}
          >
            <Text style={styles.attachText}>＋</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Nachricht schreiben..."
            placeholderTextColor="#888"
            value={draft}
            onChangeText={handleDraftChange}
            onFocus={handleComposerFocus}
            onBlur={stopTyping}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              isCompactWeb && styles.compactSendButton,
            ]}
            onPress={handleSendText}
          >
            <Text style={styles.sendText}>{isCompactWeb ? "➤" : "Senden"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  function renderReplyBar() {
    if (!replyTarget) return null;

    return (
      <View style={styles.replyBar}>
        <View style={styles.replyBarCopy}>
          <Text style={styles.replyBarTitle}>Antwort</Text>
          <Text style={styles.replyBarText} numberOfLines={1}>
            {getMessagePreview(replyTarget)}
          </Text>
        </View>
        <TouchableOpacity onPress={() => setReplyTarget(null)}>
          <Text style={styles.replyBarClose}>×</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderTypingIndicator() {
    if (!isOtherUserTyping) return null;

    return (
      <View style={styles.liveTypingIndicator}>
        <Text style={styles.liveTypingText}>
          {otherUser?.name ?? "Dein Match"} schreibt...
        </Text>
      </View>
    );
  }

  function renderProfilePanelContent() {
    return (
      <>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.webProfilePhoto} />
        ) : null}
        <Text style={styles.webProfileName}>
          {otherUser?.name ?? "Match"}
          {otherUser?.age ? `, ${otherUser.age}` : ""}
        </Text>
        <Text style={styles.webProfileMeta}>
          {otherUser?.city && otherUser.country
            ? `${otherUser.city}, ${getCountryLabel(otherUser.country)}`
            : "Match bei Extasy"}
        </Text>
        {otherUser?.about ? (
          <Text style={styles.webProfileAbout}>{otherUser.about}</Text>
        ) : null}
        <View style={styles.webProfileTags}>
          {otherUser?.interests?.slice(0, 6).map((interest) => (
            <View key={interest} style={styles.webProfileTag}>
              <Text style={styles.webProfileTagText}>
                {getInterestLabel(interest)}
              </Text>
            </View>
          ))}
        </View>
        {otherUser ? (
          <TouchableOpacity
            style={styles.webProfileButton}
            onPress={() =>
              router.push(`/userProfile?userKey=${getUserKey(otherUser)}`)
            }
          >
            <Text style={styles.webProfileButtonText}>Profil öffnen</Text>
          </TouchableOpacity>
        ) : null}
      </>
    );
  }

  function renderWebProfilePanel() {
    return (
      <View style={styles.webRightPanel}>{renderProfilePanelContent()}</View>
    );
  }

  function renderMobileProfileDrawer() {
    const drawerTranslateX = profileDrawerProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 340],
    });

    return (
      <Modal visible={profileDrawerVisible} transparent animationType="none">
        <View style={styles.drawerBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={closeProfileDrawer}
          />
          <Animated.View
            style={[
              styles.mobileProfileDrawer,
              { transform: [{ translateX: drawerTranslateX }] },
            ]}
            {...profileDrawerPanResponder.panHandlers}
          >
            <TouchableOpacity
              style={styles.drawerCloseButton}
              onPress={closeProfileDrawer}
            >
              <Text style={styles.drawerCloseText}>×</Text>
            </TouchableOpacity>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.mobileDrawerContent}
            >
              {renderProfilePanelContent()}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    );
  }

  function EmojiButton({
    emoji,
    onPress,
  }: {
    emoji: string;
    onPress: () => void;
  }) {
    const scale = React.useRef(new Animated.Value(1)).current;
    const hoverProgress = React.useRef(new Animated.Value(0)).current;

    const animateTo = (value: number) => {
      Animated.spring(scale, {
        toValue: value,
        friction: 4,
        tension: 180,
        useNativeDriver: true,
      }).start();
    };

    const animateHover = (value: number) => {
      Animated.spring(hoverProgress, {
        toValue: value,
        friction: 5,
        tension: 50,
        useNativeDriver: true,
      }).start();
    };

    const hoverRotate = hoverProgress.interpolate({
      inputRange: [0, 1],
      outputRange: ["0deg", "360deg"],
    });
    const hoverScale = hoverProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 1.16],
    });

    return (
      <Pressable
        onHoverIn={() => animateHover(1)}
        onHoverOut={() => animateHover(0)}
      >
        <Animated.View
          style={{
            transform: [
              { scale },
              { scale: hoverScale },
              { rotate: hoverRotate },
            ],
          }}
        >
          <TouchableOpacity
            style={styles.emojiOption}
            onPress={onPress}
            onPressIn={() => animateTo(0.88)}
            onPressOut={() => animateTo(1)}
          >
            <Text style={styles.emojiOptionText}>{emoji}</Text>
          </TouchableOpacity>
        </Animated.View>
      </Pressable>
    );
  }

  const sharedModals = (
    <>
      <Modal
        visible={Boolean(webActionMessage)}
        transparent
        animationType="fade"
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setWebActionMessage(null)}
          />
          <View style={styles.webMessageMenu}>
            <Text style={styles.sheetTitle}>Nachricht</Text>
            <Text style={styles.webMessagePreview} numberOfLines={2}>
              {webActionMessage ? getMessagePreview(webActionMessage) : ""}
            </Text>
            <TouchableOpacity
              style={styles.webMessageAction}
              onPress={() => {
                if (webActionMessage) {
                  setReplyTarget(webActionMessage);
                }
                setWebActionMessage(null);
              }}
            >
              <Text style={styles.webMessageActionText}>Antworten</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.webMessageAction}
              onPress={() => {
                if (webActionMessage) {
                  openReactionMenu(webActionMessage);
                }
              }}
            >
              <Text style={styles.webMessageActionText}>Reaktion</Text>
            </TouchableOpacity>
            {webActionMessage?.senderKey === currentUserKey ? (
              <TouchableOpacity
                style={styles.webMessageAction}
                onPress={() => void handleDeleteMessage(webActionMessage.id)}
              >
                <Text style={styles.webDeleteActionText}>Löschen</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(webReactionMessage)}
        transparent
        animationType="fade"
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setWebReactionMessage(null)}
          />
          <View style={styles.webMessageMenu}>
            <Text style={styles.sheetTitle}>Reaktion</Text>
            <View style={styles.webReactionRow}>
              {["👍", "❤️", "😂"].map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={styles.webReactionButton}
                  onPress={() =>
                    webReactionMessage &&
                    void handleReactToMessage(webReactionMessage.id, emoji)
                  }
                >
                  <Text style={styles.webReactionText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={attachmentOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={() => setAttachmentOpen(false)}
          />
          <View style={styles.attachmentSheet}>
            <Text style={styles.sheetTitle}>Zur Nachricht hinzufügen</Text>
            <View style={styles.attachmentActions}>
              <TouchableOpacity
                style={styles.attachmentAction}
                onPress={() => {
                  setAttachmentOpen(false);
                  setImagePickerOpen(true);
                }}
              >
                <Text style={styles.attachmentIcon}>▧</Text>
                <Text style={styles.attachmentLabel}>Fotos</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.attachmentAction}
                onPress={() => {
                  setAttachmentOpen(false);
                  setEmojiPickerOpen(true);
                }}
              >
                <Text style={styles.attachmentIcon}>☺</Text>
                <Text style={styles.attachmentLabel}>Emoji</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={imagePickerOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.pickerWindow}>
            <View style={styles.windowHeader}>
              <Text style={styles.sheetTitle}>Foto auswählen</Text>
              <TouchableOpacity onPress={() => setImagePickerOpen(false)}>
                <Text style={styles.closeText}>Schließen</Text>
              </TouchableOpacity>
            </View>
            {selectedImageUri ? (
              <Image
                source={{ uri: selectedImageUri }}
                style={styles.preview}
              />
            ) : (
              <View style={styles.previewEmpty}>
                <Text style={styles.previewEmptyText}>Foto auswählen</Text>
              </View>
            )}
            <View style={styles.windowActions}>
              <TouchableOpacity
                style={styles.secondaryWindowButton}
                onPress={handlePickImage}
              >
                <Text style={styles.secondaryWindowText}>Bild auswählen</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.primaryWindowButton,
                  !selectedImageUri && styles.disabledWindowButton,
                ]}
                onPress={handleSendImage}
                disabled={!selectedImageUri}
              >
                <Text style={styles.primaryWindowText}>Foto senden</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={emojiPickerOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.pickerWindow}>
            <View style={styles.windowHeader}>
              <Text style={styles.sheetTitle}>Emoji</Text>
              <TouchableOpacity onPress={() => setEmojiPickerOpen(false)}>
                <Text style={styles.closeText}>Schließen</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.emojiGrid}>
              {emojiOptions.map((emoji) => (
                <EmojiButton
                  key={emoji}
                  emoji={emoji}
                  onPress={() => handleSendEmoji(emoji)}
                />
              ))}
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={photoReactionOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={() => {
              setReactionMessageId("");
              setPhotoReactionOpen(false);
            }}
          />
          <View style={styles.reactionSheet}>
            <Text style={styles.sheetTitle}>Reaktion auf Foto</Text>
            <Text style={styles.reactionHint}>
              Halte ein Foto gedrückt und wähle danach ein Emoji, um es oben
              anzuheften.
            </Text>
            <View style={styles.reactionEmojiRow}>
              {emojiOptions.slice(0, 12).map((emoji) => (
                <TouchableOpacity
                  key={`photo-${emoji}`}
                  style={styles.reactionEmoji}
                  onPress={() => handleReactToPhoto(emoji)}
                >
                  <Text style={styles.reactionEmojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(fullscreenImageUri)}
        transparent
        animationType="fade"
      >
        <View style={styles.fullscreenBackdrop}>
          <TouchableOpacity
            style={styles.fullscreenClose}
            onPress={() => setFullscreenImageUri("")}
          >
            <Text style={styles.fullscreenCloseText}>Schließen</Text>
          </TouchableOpacity>
          {fullscreenImageUri ? (
            <Image
              source={{ uri: fullscreenImageUri }}
              style={styles.fullscreenImage}
              resizeMode="contain"
            />
          ) : null}
        </View>
      </Modal>
    </>
  );

  if (isWeb) {
    const compactViewportStyle =
      isCompactWeb && webVisualViewport
        ? {
            height: webVisualViewport.height,
            minHeight: webVisualViewport.height,
            maxHeight: webVisualViewport.height,
            transform: [{ translateY: webVisualViewport.offsetTop }],
            overflow: "hidden" as const,
          }
        : null;

    return (
      <ThemedBackground style={[styles.background, compactViewportStyle]}>
        <View
          style={[
            styles.webContainer,
            isCompactWeb && styles.webContainerCompact,
          ]}
        >
          <View style={styles.webMainContent}>
            <View style={styles.webChatSurface}>
              {renderChatHeader()}
              {renderMessages()}
              {renderTypingIndicator()}
              {renderComposer()}
            </View>
          </View>
          {!isNarrowWeb ? renderWebProfilePanel() : null}
        </View>
        {renderMobileProfileDrawer()}
        {sharedModals}
      </ThemedBackground>
    );
  }

  return (
    <ThemedBackground style={styles.background}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.chatSurface}>
          {renderChatHeader()}
          <ScrollView
            ref={messagesScrollRef}
            style={styles.messages}
            contentContainerStyle={styles.messagesContent}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => scrollMessagesToEnd()}
            showsVerticalScrollIndicator={false}
          >
            {messages.length ? (
              messages.map((message) => {
                const isMine = message.senderKey === currentUserKey;

                return (
                  <SpringMessage
                    key={message.id}
                    onLongPress={() => openMessageActions(message)}
                    style={[
                      styles.messageBubble,
                      message.imageUri && styles.imageBubble,
                      message.emoji && styles.emojiBubble,
                      isMine ? styles.myMessage : styles.theirMessage,
                      message.imageUri && styles.transparentBubble,
                    ]}
                  >
                    {message.replyTo ? (
                      <View style={styles.replyQuote}>
                        <Text style={styles.replyQuoteName}>
                          {message.replyTo.senderName}
                        </Text>
                        <Text style={styles.replyQuoteText} numberOfLines={2}>
                          {message.replyTo.text}
                        </Text>
                      </View>
                    ) : null}
                    {message.imageUri ? (
                      <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() =>
                          setFullscreenImageUri(message.imageUri ?? "")
                        }
                        onLongPress={() => openMessageActions(message)}
                      >
                        <Image
                          source={{ uri: message.imageUri }}
                          style={styles.messageImage}
                        />
                        {message.photoReaction ? (
                          <View
                            style={[
                              styles.photoReaction,
                              isMine
                                ? styles.myPhotoReaction
                                : styles.theirPhotoReaction,
                            ]}
                          >
                            <Text style={styles.photoReactionText}>
                              {message.photoReaction}
                            </Text>
                          </View>
                        ) : null}
                      </TouchableOpacity>
                    ) : null}
                    {message.emoji ? (
                      <Text style={styles.emojiMessage}>{message.emoji}</Text>
                    ) : null}
                    {message.text ? (
                      <Text
                        style={[
                          styles.messageText,
                          isMine
                            ? styles.myMessageText
                            : styles.theirMessageText,
                        ]}
                      >
                        {message.text}
                      </Text>
                    ) : null}
                    {message.reaction ? (
                      <Text style={styles.inlineReaction}>
                        {message.reaction}
                      </Text>
                    ) : null}
                  </SpringMessage>
                );
              })
            ) : (
              <PremiumEmptyState
                title="Ihr habt ein Match"
                text={`Starte das Gespräch mit ${otherUser?.name ?? "deinem Match"} mit einer aufmerksamen Nachricht.`}
              />
            )}
          </ScrollView>

          {renderTypingIndicator()}
          {renderReplyBar()}
          <View style={styles.composer}>
            <TouchableOpacity
              style={styles.attachButton}
              onPress={() => setAttachmentOpen(true)}
            >
              <Text style={styles.attachText}>＋</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder="Nachricht schreiben..."
              placeholderTextColor="#888"
              value={draft}
              onChangeText={handleDraftChange}
              onBlur={stopTyping}
            />
            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleSendText}
            >
              <Text style={styles.sendText}>Senden</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      <BottomMenu />
      {renderMobileProfileDrawer()}

      <Modal visible={attachmentOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={() => setAttachmentOpen(false)}
          />
          <View style={styles.attachmentSheet}>
            <Text style={styles.sheetTitle}>Zur Nachricht hinzufügen</Text>
            <View style={styles.attachmentActions}>
              <TouchableOpacity
                style={styles.attachmentAction}
                onPress={() => {
                  setAttachmentOpen(false);
                  setImagePickerOpen(true);
                }}
              >
                <Text style={styles.attachmentIcon}>▧</Text>
                <Text style={styles.attachmentLabel}>Fotos</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.attachmentAction}
                onPress={() => {
                  setAttachmentOpen(false);
                  setEmojiPickerOpen(true);
                }}
              >
                <Text style={styles.attachmentIcon}>☺</Text>
                <Text style={styles.attachmentLabel}>Emoji</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={imagePickerOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.pickerWindow}>
            <View style={styles.windowHeader}>
              <Text style={styles.sheetTitle}>Foto auswählen</Text>
              <TouchableOpacity onPress={() => setImagePickerOpen(false)}>
                <Text style={styles.closeText}>Schließen</Text>
              </TouchableOpacity>
            </View>
            {selectedImageUri ? (
              <Image
                source={{ uri: selectedImageUri }}
                style={styles.preview}
              />
            ) : (
              <View style={styles.previewEmpty}>
                <Text style={styles.previewEmptyText}>Foto auswählen</Text>
              </View>
            )}
            <View style={styles.windowActions}>
              <TouchableOpacity
                style={styles.secondaryWindowButton}
                onPress={handlePickImage}
              >
                <Text style={styles.secondaryWindowText}>Bild auswählen</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.primaryWindowButton,
                  !selectedImageUri && styles.disabledWindowButton,
                ]}
                onPress={handleSendImage}
                disabled={!selectedImageUri}
              >
                <Text style={styles.primaryWindowText}>Foto senden</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={emojiPickerOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.pickerWindow}>
            <View style={styles.windowHeader}>
              <Text style={styles.sheetTitle}>Emoji</Text>
              <TouchableOpacity onPress={() => setEmojiPickerOpen(false)}>
                <Text style={styles.closeText}>Schließen</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.emojiGrid}>
              {emojiOptions.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={styles.emojiOption}
                  onPress={() => handleSendEmoji(emoji)}
                >
                  <Text style={styles.emojiOptionText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={photoReactionOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={() => {
              setReactionMessageId("");
              setPhotoReactionOpen(false);
            }}
          />
          <View style={styles.reactionSheet}>
            <Text style={styles.sheetTitle}>Reaktion auf Foto</Text>
            <Text style={styles.reactionHint}>
              Halte ein Foto gedrückt und wähle danach ein Emoji, um es oben
              anzuheften.
            </Text>
            <View style={styles.reactionEmojiRow}>
              {emojiOptions.slice(0, 12).map((emoji) => (
                <TouchableOpacity
                  key={`photo-${emoji}`}
                  style={styles.reactionEmoji}
                  onPress={() => handleReactToPhoto(emoji)}
                >
                  <Text style={styles.reactionEmojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(fullscreenImageUri)}
        transparent
        animationType="fade"
      >
        <View style={styles.fullscreenBackdrop}>
          <TouchableOpacity
            style={styles.fullscreenClose}
            onPress={() => setFullscreenImageUri("")}
          >
            <Text style={styles.fullscreenCloseText}>Schließen</Text>
          </TouchableOpacity>
          {fullscreenImageUri ? (
            <Image
              source={{ uri: fullscreenImageUri }}
              style={styles.fullscreenImage}
              resizeMode="contain"
            />
          ) : null}
        </View>
      </Modal>
    </ThemedBackground>
  );
}

async function prepareChatImage(uri: string) {
  if (Platform.OS !== "web") {
    return uri;
  }

  const response = await fetch(uri);
  const blob = await response.blob();
  const imageUrl = URL.createObjectURL(blob);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new window.Image();
      nextImage.onload = () => resolve(nextImage);
      nextImage.onerror = reject;
      nextImage.src = imageUrl;
    });
    const scale = Math.min(
      1,
      FULL_HD_MAX_SIZE / Math.max(image.width, image.height),
    );
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement("canvas");

    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")?.drawImage(image, 0, 0, width, height);

    return canvas.toDataURL("image/jpeg", FULL_HD_JPEG_QUALITY);
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    backgroundColor: datingColors.background,
  },

  webContainer: {
    flex: 1,
    width: "100%",
    flexDirection: "row",
    padding: 18,
    gap: 22,
    paddingBottom: 80,
  },

  webContainerCompact: {
    flexDirection: "column",
    width: "100%",
    minWidth: 0,
    minHeight: 0,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 8,
  },

  webMainContent: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
  },

  webChatSurface: {
    flex: 1,
    width: "100%",
    minWidth: 0,
    minHeight: 0,
    borderRadius: 30,
    backgroundColor: datingColors.backgroundSoft,
    borderWidth: 1,
    borderColor: datingColors.border,
    overflow: "hidden",
    ...datingShadow,
  },

  webRightPanel: {
    width: 320,
    flexShrink: 0,
    borderRadius: 30,
    backgroundColor: datingColors.surface,
    borderWidth: 1,
    borderColor: datingColors.border,
    paddingHorizontal: 20,
    ...datingShadow,
  },

  webPanelEyebrow: {
    color: datingColors.accent,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    marginBottom: 14,
  },

  webProfilePhoto: {
    width: "100%",
    height: 260,
    borderRadius: 24,
    backgroundColor: datingColors.surfaceSoft,
    marginTop: 20,
  },

  webProfileName: {
    color: datingColors.text,
    fontSize: 25,
    lineHeight: 30,
    fontWeight: "900",
    marginTop: 18,
  },

  webProfileMeta: {
    color: datingColors.accent,
    fontSize: 14,
    fontWeight: "800",
    marginTop: 6,
  },

  webProfileAbout: {
    color: datingColors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 14,
  },

  webProfileTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 16,
  },

  webProfileTag: {
    minHeight: 34,
    borderRadius: 14,
    backgroundColor: datingColors.surfaceSoft,
    borderWidth: 1,
    borderColor: datingColors.border,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  webProfileTagText: {
    color: datingColors.text,
    fontSize: 12,
    fontWeight: "800",
  },

  webProfileButton: {
    height: 52,
    borderRadius: 18,
    backgroundColor: datingColors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    marginBottom: 40,
  },

  webProfileButtonText: {
    color: premiumColors.white,
    fontSize: 14,
    fontWeight: "800",
  },

  screen: {
    flex: 1,
    width: "100%",
    maxWidth: isWeb ? 760 : undefined,
    alignSelf: "center",
    paddingTop: isWeb ? 32 : 34,
  },

  conversationHeader: {
    minHeight: 82,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: datingColors.border,
    backgroundColor: "rgba(7, 16, 23, 0.92)",
    gap: 12,
    zIndex: 9,
  },

  backButton: {
    width: 32,
    height: 32,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
  },

  backButtonText: {
    color: datingColors.text,
    fontSize: 36,
    lineHeight: 38,
    marginTop: -3,
  },

  conversationPerson: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },

  conversationAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "rgba(232, 62, 124, 0.38)",
  },

  conversationAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: datingColors.accentDark,
    alignItems: "center",
    justifyContent: "center",
  },

  conversationAvatarInitial: {
    color: datingColors.text,
    fontSize: 18,
    fontWeight: "900",
  },

  conversationCopy: {
    flex: 1,
    minWidth: 0,
  },

  conversationName: {
    color: datingColors.text,
    fontSize: 18,
    fontWeight: "900",
  },

  onlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 3,
  },

  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: datingColors.online,
  },

  offlineDot: {
    backgroundColor: datingColors.textMuted,
  },

  onlineText: {
    color: datingColors.textMuted,
    fontSize: 12,
  },

  profileMenuButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },

  profileMenuText: {
    color: datingColors.textMuted,
    fontSize: 17,
    letterSpacing: 1,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: isWeb ? 20 : 18,
    paddingBottom: isWeb ? 18 : 16,
    gap: 12,
    backgroundColor: "rgba(255, 252, 247, 0.92)",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: premiumColors.hairline,
    paddingTop: 16,
    marginHorizontal: isWeb ? 20 : 12,
    marginBottom: isWeb ? 22 : 26,
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
    backgroundColor: premiumColors.champagneSoft,
  },

  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: premiumColors.navy,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarInitial: {
    color: premiumColors.white,
    fontSize: 18,
  },

  headerCopy: {
    flex: 1,
  },

  title: {
    color: premiumColors.ink,
    fontSize: isWeb ? 22 : 20,
    fontWeight: "800",
  },

  subtitle: {
    color: premiumColors.muted,
    fontSize: 13,
    marginTop: 2,
  },

  chatSurface: {
    flex: 1,
    marginHorizontal: isWeb ? 20 : 14,
    borderRadius: isWeb ? 30 : 28,
    backgroundColor: datingColors.backgroundSoft,
    borderWidth: 1,
    borderColor: datingColors.border,
    overflow: "hidden",
    ...datingShadow,
  },

  mobileProfileTrigger: {
    position: "absolute",
    top: 94,
    right: 12,
    zIndex: 8,
    minWidth: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: datingColors.surface,
    borderWidth: 1,
    borderColor: datingColors.border,
    alignItems: "center",
    justifyContent: "center",
    ...premiumShadow,
  },

  mobileTriggerImage: {
    width: 38,
    height: 38,
    backgroundColor: premiumColors.champagneSoft,
  },

  mobileTriggerText: {
    color: premiumColors.ink,
    fontSize: 12,
    fontWeight: "800",
    paddingHorizontal: 10,
  },

  messages: {
    flex: 1,
  },

  messagesContent: {
    paddingHorizontal: isWeb ? 20 : 18,
    paddingTop: isWeb ? 22 : 22,
    paddingBottom: isWeb ? 20 : 18,
  },

  messageBubble: {
    maxWidth: isWeb ? "68%" : "78%",
    borderRadius: isWeb ? 20 : 22,
    paddingHorizontal: isWeb ? 18 : 16,
    paddingVertical: 12,
    marginBottom: isWeb ? 12 : 10,
  },

  messageInteraction: {
    userSelect: "none",
    WebkitUserSelect: "none",
    WebkitTouchCallout: "none",
    touchAction: "pan-y",
  } as never,

  imageBubble: {
    paddingHorizontal: 5,
    paddingVertical: 5,
    maxWidth: isWeb ? 300 : 250,
  },

  transparentBubble: {
    backgroundColor: "transparent",
  },

  emojiBubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "transparent",
  },

  myMessage: {
    alignSelf: "flex-end",
    backgroundColor: datingColors.accent,
    borderBottomRightRadius: 8,
  },

  theirMessage: {
    alignSelf: "flex-start",
    backgroundColor: datingColors.surfaceRaised,
    borderBottomLeftRadius: 8,
  },

  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },

  myMessageText: {
    color: datingColors.text,
  },

  theirMessageText: {
    color: datingColors.text,
  },

  messageImage: {
    width: isWeb ? 284 : 238,
    height: isWeb ? 220 : 190,
    borderRadius: 18,
  },

  replyQuote: {
    borderLeftWidth: 3,
    borderLeftColor: "rgba(255,255,255,0.7)",
    backgroundColor: "rgba(0,0,0,0.12)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 8,
  },

  replyQuoteName: {
    color: datingColors.text,
    fontSize: 12,
    fontWeight: "900",
  },

  replyQuoteText: {
    color: datingColors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },

  inlineReaction: {
    alignSelf: "flex-end",
    fontSize: 16,
    marginTop: 5,
  },

  replyBar: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: isWeb ? 20 : 14,
    paddingTop: 9,
    backgroundColor: datingColors.backgroundSoft,
  },

  replyBarCopy: {
    flex: 1,
    borderLeftWidth: 3,
    borderLeftColor: datingColors.accent,
    paddingLeft: 10,
  },

  replyBarTitle: {
    color: datingColors.accent,
    fontSize: 12,
    fontWeight: "900",
  },

  replyBarText: {
    color: datingColors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },

  replyBarClose: {
    color: datingColors.textMuted,
    fontSize: 25,
    paddingHorizontal: 10,
  },

  liveTypingIndicator: {
    minHeight: 30,
    justifyContent: "center",
    paddingHorizontal: isWeb ? 20 : 18,
    backgroundColor: datingColors.backgroundSoft,
  },

  liveTypingText: {
    color: datingColors.online,
    fontSize: 13,
    fontStyle: "italic",
    fontWeight: "700",
  },

  photoReaction: {
    position: "absolute",
    borderRadius: 18,
    bottom: -10,
    width: 24,
    height: 24,
    backgroundColor: premiumColors.white,
    borderColor: premiumColors.porcelain,
    alignItems: "center",
    justifyContent: "center",
    ...premiumShadow,
  },

  myPhotoReaction: {
    right: 10,
  },

  theirPhotoReaction: {
    left: 10,
  },

  photoReactionText: {
    fontSize: 12,
    lineHeight: 15,
  },

  emojiMessage: {
    fontSize: 18,
    lineHeight: 22,
  },

  composer: {
    width: "100%",
    minWidth: 0,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: isWeb ? 20 : 14,
    paddingTop: isWeb ? 14 : 14,
    paddingBottom: isWeb ? 18 : 16,
    backgroundColor: datingColors.backgroundSoft,
    borderTopWidth: 1,
    borderTopColor: datingColors.border,
  },

  compactComposer: {
    gap: 6,
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 12,
  },

  attachButton: {
    width: 50,
    flexShrink: 0,
    height: 50,
    borderRadius: 18,
    backgroundColor: datingColors.accent,
    alignItems: "center",
    justifyContent: "center",
  },

  compactComposerButton: {
    width: 44,
    height: 46,
    borderRadius: 16,
  },

  attachText: {
    color: datingColors.text,
    fontSize: 22,
  },

  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 50,
    borderRadius: 18,
    backgroundColor: datingColors.surface,
    paddingHorizontal: 16,
    color: datingColors.text,
    fontSize: isWeb ? 16 : 15,
  },

  sendButton: {
    minWidth: 88,
    flexShrink: 0,
    height: 50,
    borderRadius: 18,
    backgroundColor: datingColors.accent,
    alignItems: "center",
    justifyContent: "center",
    ...datingShadow,
  },

  compactSendButton: {
    minWidth: 46,
    width: 46,
    height: 46,
    borderRadius: 16,
  },

  sendText: {
    color: premiumColors.white,
    fontSize: 15,
    fontWeight: "700",
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(5, 2, 14, 0.84)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },

  webMessageMenu: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 24,
    backgroundColor: premiumColors.porcelain,
    borderWidth: 1,
    borderColor: premiumColors.hairline,
    padding: 16,
    gap: 9,
    ...premiumShadow,
  },

  webMessagePreview: {
    color: premiumColors.muted,
    fontSize: 13,
    marginBottom: 5,
  },

  webMessageAction: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: premiumColors.white,
    justifyContent: "center",
    paddingHorizontal: 16,
  },

  webMessageActionText: {
    color: premiumColors.ink,
    fontSize: 15,
    fontWeight: "800",
  },

  webDeleteActionText: {
    color: "#C53B4D",
    fontSize: 15,
    fontWeight: "800",
  },

  webReactionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },

  webReactionButton: {
    width: 62,
    height: 54,
    borderRadius: 17,
    backgroundColor: premiumColors.white,
    alignItems: "center",
    justifyContent: "center",
  },

  webReactionText: {
    fontSize: 26,
  },

  attachmentSheet: {
    margin: 14,
    borderRadius: 28,
    backgroundColor: premiumColors.porcelain,
    borderWidth: 1,
    borderColor: premiumColors.hairline,
    padding: 18,
    ...premiumShadow,
  },

  sheetTitle: {
    color: premiumColors.ink,
    fontSize: 20,
    fontWeight: "900",
  },

  attachmentActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },

  attachmentAction: {
    flex: 1,
    minHeight: 98,
    borderRadius: 22,
    backgroundColor: premiumColors.white,
    borderWidth: 1,
    borderColor: premiumColors.hairline,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  attachmentIcon: {
    color: premiumColors.champagne,
    fontSize: 32,
    lineHeight: 36,
  },

  attachmentLabel: {
    color: premiumColors.ink,
    fontSize: 14,
    fontWeight: "800",
  },

  pickerWindow: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 28,
    padding: 16,
    backgroundColor: "rgba(255, 252, 247, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
  },

  windowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },

  closeText: {
    color: premiumColors.champagne,
    fontSize: 14,
    fontWeight: "900",
  },

  preview: {
    width: "100%",
    height: 280,
    borderRadius: 24,
    marginTop: 16,
    backgroundColor: premiumColors.champagneSoft,
  },

  previewEmpty: {
    height: 220,
    borderRadius: 24,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: premiumColors.champagne,
    backgroundColor: premiumColors.ivory,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },

  previewEmptyText: {
    color: premiumColors.muted,
    fontSize: 15,
    fontWeight: "800",
  },

  windowActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },

  secondaryWindowButton: {
    flex: 1,
    height: 52,
    borderRadius: 18,
    backgroundColor: premiumColors.white,
    borderWidth: 1,
    borderColor: premiumColors.hairline,
    alignItems: "center",
    justifyContent: "center",
  },

  primaryWindowButton: {
    flex: 1,
    height: 52,
    borderRadius: 18,
    backgroundColor: premiumColors.ink,
    alignItems: "center",
    justifyContent: "center",
  },

  disabledWindowButton: {
    opacity: 0.45,
  },

  secondaryWindowText: {
    color: premiumColors.ink,
    fontSize: 14,
    fontWeight: "800",
  },

  primaryWindowText: {
    color: premiumColors.white,
    fontSize: 14,
    fontWeight: "800",
  },

  emojiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
    padding: 10,
    backgroundColor: "rgba(255, 255, 255, 0.72)",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(230, 224, 216, 0.9)",
  },

  emojiOption: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  emojiOptionText: {
    fontSize: 26,
    lineHeight: 32,
  },

  reactionSheet: {
    width: "100%",
    maxWidth: 430,
    margin: 14,
    borderRadius: 28,
    backgroundColor: "#21101F",
    borderWidth: 1,
    borderColor: "rgba(227, 55, 116, 0.35)",
    padding: 18,
    ...datingShadow,
  },

  reactionHint: {
    color: premiumColors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },

  reactionEmojiRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },

  reactionEmoji: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: premiumColors.white,
    borderWidth: 1,
    borderColor: premiumColors.hairline,
    alignItems: "center",
    justifyContent: "center",
  },

  reactionEmojiText: {
    fontSize: 13,
    lineHeight: 16,
  },

  fullscreenBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.96)",
    alignItems: "center",
    justifyContent: "center",
  },

  fullscreenImage: {
    width: "100%",
    height: "82%",
  },

  fullscreenClose: {
    position: "absolute",
    top: 56,
    right: 20,
    zIndex: 2,
    height: 42,
    borderRadius: 16,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    justifyContent: "center",
  },

  fullscreenCloseText: {
    color: premiumColors.white,
    fontSize: 14,
    fontWeight: "800",
  },

  drawerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(16, 24, 32, 0.36)",
    alignItems: "flex-end",
  },

  mobileProfileDrawer: {
    width: "86%",
    maxWidth: 340,
    height: "100%",
    backgroundColor: datingColors.backgroundSoft,
    borderTopLeftRadius: 30,
    borderBottomLeftRadius: 30,
    padding: 18,
    paddingTop: 52,
    borderLeftWidth: 1,
    borderColor: datingColors.border,
    ...premiumShadow,
  },

  mobileDrawerContent: {
    paddingBottom: 34,
  },

  drawerCloseButton: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 2,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: datingColors.surface,
    alignItems: "center",
    justifyContent: "center",
    ...premiumShadow,
  },

  drawerCloseText: {
    color: datingColors.text,
    fontSize: 26,
    lineHeight: 28,
    fontWeight: "700",
  },
});
