import BottomMenu from "@/components/BottomMenu";
import { PremiumEmptyState, PremiumLoadingState } from "@/components/PremiumUI";
import { ThemedBackground } from "@/components/ThemedBackground";
import { premiumColors, premiumShadow } from "@/constants/premiumDesign";
import { getCountryLabel, getInterestLabel } from "@/constants/germanLabels";
import {
  getChatMessages,
  getMatchById,
  getSessionUser,
  getUserKey,
  reactToChatMessage,
  sendChatMessage,
  type ChatMessage,
  type MatchRecord,
} from "@/services/auth/session";
import * as ExpoImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
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
];

function getOtherUser(match: MatchRecord, currentUserKey: string) {
  const otherUserKey = match.userKeys.find(
    (userKey) => userKey !== currentUserKey,
  );
  return otherUserKey ? match.users[otherUserKey] : null;
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
  const [profileDrawerVisible, setProfileDrawerVisible] = useState(false);
  const profileDrawerProgress = React.useRef(new Animated.Value(1)).current;

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

    setMessages((currentMessages) => [...currentMessages, message]);
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

    setMessages((currentMessages) => [...currentMessages, message]);
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

  const otherUser = match ? getOtherUser(match, currentUserKey) : null;
  const photo = otherUser?.photos?.[0] ?? otherUser?.picture;
  const isNarrowWeb = isWeb && viewportWidth < 1120;
  const isCompactWeb = isWeb && viewportWidth < 760;

  function renderMessages() {
    return (
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
                  message.imageUri && styles.imageBubble,
                  message.emoji && styles.emojiBubble,
                  isMine ? styles.myMessage : styles.theirMessage,
                  message.imageUri && styles.transparentBubble,
                ]}
              >
                {message.imageUri ? (
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() =>
                      setFullscreenImageUri(message.imageUri ?? "")
                    }
                    onLongPress={() => {
                      setReactionMessageId(message.id);
                      setPhotoReactionOpen(true);
                    }}
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
              </View>
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

  function renderComposer() {
    return (
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
          onChangeText={setDraft}
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSendText}>
          <Text style={styles.sendText}>Senden</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderProfilePanelContent() {
    return (
      <>
        <Text style={styles.webPanelEyebrow}>Profil</Text>
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

  const sharedModals = (
    <>
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
              Halte ein Foto gedrückt und wähle danach ein Emoji, um es oben anzuheften.
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
    return (
      <ThemedBackground style={styles.background}>
        <View
          style={[
            styles.webContainer,
            isCompactWeb && styles.webContainerCompact,
          ]}
        >
          <View style={styles.webMainContent}>
            <View style={styles.webChatSurface}>
              {renderMessages()}
              {renderComposer()}
            </View>
          </View>
          {!isNarrowWeb ? renderWebProfilePanel() : null}
        </View>
        <BottomMenu />
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
          <TouchableOpacity
            style={styles.mobileProfileTrigger}
            onPress={openProfileDrawer}
          >
            {photo ? (
              <Image
                source={{ uri: photo }}
                style={styles.mobileTriggerImage}
              />
            ) : (
              <Text style={styles.mobileTriggerText}>Profil</Text>
            )}
          </TouchableOpacity>
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
                      message.imageUri && styles.imageBubble,
                      message.emoji && styles.emojiBubble,
                      isMine ? styles.myMessage : styles.theirMessage,
                      message.imageUri && styles.transparentBubble,
                    ]}
                  >
                    {message.imageUri ? (
                      <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() =>
                          setFullscreenImageUri(message.imageUri ?? "")
                        }
                        onLongPress={() => {
                          setReactionMessageId(message.id);
                          setPhotoReactionOpen(true);
                        }}
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
                  </View>
                );
              })
            ) : (
              <PremiumEmptyState
                title="Ihr habt ein Match"
                text={`Starte das Gespräch mit ${otherUser?.name ?? "deinem Match"} mit einer aufmerksamen Nachricht.`}
              />
            )}
          </ScrollView>

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
              onChangeText={setDraft}
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
              Halte ein Foto gedrückt und wähle danach ein Emoji, um es oben anzuheften.
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
  },

  webContainer: {
    flex: 1,
    width: "100%",
    flexDirection: "row",
    padding: 22,
    paddingBottom: 132,
    gap: 22,
  },

  webContainerCompact: {
    flexDirection: "column",
    padding: 14,
    paddingBottom: 132,
    gap: 14,
  },

  webMainContent: {
    flex: 1,
    minWidth: 0,
  },

  webChatSurface: {
    flex: 1,
    borderRadius: 30,
    backgroundColor: "rgba(255, 252, 247, 0.9)",
    borderWidth: 1,
    borderColor: premiumColors.hairline,
    overflow: "hidden",
    ...premiumShadow,
  },

  webRightPanel: {
    width: 320,
    flexShrink: 0,
    borderRadius: 30,
    backgroundColor: "rgba(255, 252, 247, 0.92)",
    borderWidth: 1,
    borderColor: premiumColors.hairline,
    padding: 20,
    ...premiumShadow,
  },

  webPanelEyebrow: {
    color: premiumColors.champagne,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    marginBottom: 14,
  },

  webProfilePhoto: {
    width: "100%",
    height: 260,
    borderRadius: 24,
    backgroundColor: premiumColors.champagneSoft,
  },

  webProfileName: {
    color: premiumColors.ink,
    fontSize: 25,
    lineHeight: 30,
    fontWeight: "900",
    marginTop: 18,
  },

  webProfileMeta: {
    color: premiumColors.navy,
    fontSize: 14,
    fontWeight: "800",
    marginTop: 6,
  },

  webProfileAbout: {
    color: premiumColors.muted,
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
    backgroundColor: premiumColors.navySoft,
    borderWidth: 1,
    borderColor: "#CEDAE5",
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  webProfileTagText: {
    color: premiumColors.navy,
    fontSize: 12,
    fontWeight: "800",
  },

  webProfileButton: {
    height: 52,
    borderRadius: 18,
    backgroundColor: premiumColors.ink,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
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
    marginBottom: isWeb ? 132 : 100,
    borderRadius: isWeb ? 30 : 28,
    backgroundColor: "rgba(255, 252, 247, 0.74)",
    borderWidth: 1,
    borderColor: premiumColors.hairline,
    overflow: "hidden",
    ...premiumShadow,
  },

  mobileProfileTrigger: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 8,
    minWidth: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(255, 252, 247, 0.92)",
    borderWidth: 1,
    borderColor: premiumColors.hairline,
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
    paddingTop: isWeb ? 22 : 75,
    paddingBottom: isWeb ? 20 : 18,
  },

  messageBubble: {
    maxWidth: isWeb ? "68%" : "78%",
    borderRadius: isWeb ? 20 : 22,
    paddingHorizontal: isWeb ? 18 : 16,
    paddingVertical: 12,
    marginBottom: isWeb ? 12 : 10,
  },

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
    backgroundColor: premiumColors.navy,
    borderBottomRightRadius: 8,
  },

  theirMessage: {
    alignSelf: "flex-start",
    backgroundColor: premiumColors.white,
    borderBottomLeftRadius: 8,
  },

  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },

  myMessageText: {
    color: premiumColors.white,
  },

  theirMessageText: {
    color: premiumColors.ink,
  },

  messageImage: {
    width: isWeb ? 284 : 238,
    height: isWeb ? 220 : 190,
    borderRadius: 18,
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
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: isWeb ? 20 : 14,
    paddingTop: isWeb ? 14 : 14,
    paddingBottom: isWeb ? 18 : 16,
    backgroundColor: premiumColors.white,
    borderTopWidth: 1,
    borderTopColor: premiumColors.hairline,
  },

  attachButton: {
    width: 50,
    height: 50,
    borderRadius: 18,
    backgroundColor: premiumColors.ivory,
    alignItems: "center",
    justifyContent: "center",
  },

  attachText: {
    color: premiumColors.champagne,
    fontSize: 22,
  },

  input: {
    flex: 1,
    minHeight: 50,
    borderRadius: 18,
    backgroundColor: premiumColors.ivory,
    paddingHorizontal: 16,
    color: premiumColors.ink,
    fontSize: 15,
  },

  sendButton: {
    minWidth: 88,
    height: 50,
    borderRadius: 18,
    backgroundColor: premiumColors.ink,
    alignItems: "center",
    justifyContent: "center",
    ...premiumShadow,
  },

  sendText: {
    color: premiumColors.white,
    fontSize: 15,
    fontWeight: "700",
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(16, 24, 32, 0.42)",
    justifyContent: "flex-end",
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
    maxWidth: isWeb ? 520 : undefined,
    width: isWeb ? "94%" : undefined,
    alignSelf: "center",
    margin: 14,
    borderRadius: 30,
    backgroundColor: premiumColors.porcelain,
    borderWidth: 1,
    borderColor: premiumColors.hairline,
    padding: 18,
    ...premiumShadow,
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
  },

  emojiOption: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: premiumColors.white,
    borderWidth: 1,
    borderColor: premiumColors.hairline,
    alignItems: "center",
    justifyContent: "center",
  },

  emojiOptionText: {
    fontSize: 13,
    lineHeight: 16,
  },

  reactionSheet: {
    margin: 14,
    borderRadius: 28,
    backgroundColor: premiumColors.porcelain,
    borderWidth: 1,
    borderColor: premiumColors.hairline,
    padding: 18,
    ...premiumShadow,
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
    backgroundColor: premiumColors.porcelain,
    borderTopLeftRadius: 30,
    borderBottomLeftRadius: 30,
    padding: 18,
    paddingTop: 52,
    borderLeftWidth: 1,
    borderColor: premiumColors.hairline,
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
    backgroundColor: premiumColors.white,
    alignItems: "center",
    justifyContent: "center",
    ...premiumShadow,
  },

  drawerCloseText: {
    color: premiumColors.ink,
    fontSize: 26,
    lineHeight: 28,
    fontWeight: "700",
  },
});
