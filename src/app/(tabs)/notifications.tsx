import { ThemedBackground } from "@/components/ThemedBackground";
import { getCountryLabel } from "@/constants/Labels";
import {
  premiumColors,
  premiumShadow,
} from "@/constants/premiumDesign";
import {
  acceptIncomingLikeRequest,
  getIncomingLikeRequestsForCurrentUser,
  getLikedProfilesForCurrentUser,
  getLikeResponseNotificationsForCurrentUser,
  getUnreadAcceptedLikeResponseForCurrentUser,
  getUserKey,
  markNotificationsSeenForCurrentUser,
  openAcceptedLikedProfileChat,
  skipIncomingLikeRequest,
  type LikedProfileRecord,
  type LikeRequestRecord,
} from "@/services/auth/session";
import {
  disableWebPush,
  enableWebPush,
  getWebPushState,
  type WebPushState,
} from "@/services/webPush";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const isWeb = Platform.OS === "web";

export default function NotificationsScreen() {
  const [incomingLikes, setIncomingLikes] = useState<LikeRequestRecord[]>([]);
  const [responses, setResponses] = useState<LikeRequestRecord[]>([]);
  const [matches, setMatches] = useState<LikedProfileRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [pushState, setPushState] = useState<WebPushState>("default");
  const [pushPending, setPushPending] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      loadNotifications(() => isActive);
      if (isWeb) {
        void getWebPushState()
          .then((state) => {
            if (isActive) {
              setPushState(state);
            }
          })
          .catch(() => {
            if (isActive) {
              setPushState("unsupported");
            }
          });
      }

      return () => {
        isActive = false;
      };
    }, []),
  );

  async function handlePushToggle() {
    setPushPending(true);
    setMessage("");

    try {
      const nextState =
        pushState === "enabled"
          ? await disableWebPush()
          : await enableWebPush();
      setPushState(nextState);

      if (nextState === "enabled") {
        setMessage("Push-Mitteilungen sind jetzt aktiviert.");
      } else if (nextState === "denied") {
        setMessage(
          "Push wurde blockiert. Erlaube Mitteilungen in den Website-Einstellungen.",
        );
      } else if (nextState === "unsupported") {
        setMessage(
          "Installiere Extasy zuerst über „Zum Home-Bildschirm“, um Push auf iPhone zu verwenden.",
        );
      } else {
        setMessage("Push-Mitteilungen wurden deaktiviert.");
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Push-Mitteilungen konnten nicht geändert werden.",
      );
    } finally {
      setPushPending(false);
    }
  }

  async function loadNotifications(isActive = () => true) {
    const [
      incomingRecords,
      responseRecords,
      matchRecords,
      unreadAcceptedResponse,
    ] =
      await Promise.all([
        getIncomingLikeRequestsForCurrentUser(),
        getLikeResponseNotificationsForCurrentUser(),
        getLikedProfilesForCurrentUser(),
        getUnreadAcceptedLikeResponseForCurrentUser(),
      ]);

    if (!isActive()) {
      return;
    }

    setIncomingLikes(incomingRecords);
    setResponses(responseRecords);
    setMatches(matchRecords);
    setIsLoading(false);
    await markNotificationsSeenForCurrentUser();

    if (isActive() && unreadAcceptedResponse?.matchId) {
      router.push(`/chat?matchId=${unreadAcceptedResponse.matchId}`);
    }
  }

  async function handleAccept(request: LikeRequestRecord) {
    const result = await acceptIncomingLikeRequest(request.id);
    await loadNotifications();

    if (result?.match) {
      router.push(`/chat?matchId=${result.match.id}`);
      return;
    }

    setMessage("Dieser Like konnte nicht angenommen werden.");
  }

  async function handleSkip(request: LikeRequestRecord) {
    await skipIncomingLikeRequest(request.id);
    await loadNotifications();
    setMessage(`${request.fromUser.name ?? "Jemand"} übersprungen.`);
  }

  async function handleOpenMatch(record: LikedProfileRecord) {
    if (record.status === "accepted") {
      const match = await openAcceptedLikedProfileChat(getUserKey(record.user));

      if (match) {
        router.push(`/chat?matchId=${match.id}`);
        return;
      }
    }

    router.push(`/userProfile?userKey=${getUserKey(record.user)}`);
  }

  function LikeCard({ request }: { request: LikeRequestRecord }) {
    const photo = request.fromUser.photos?.[0] ?? request.fromUser.picture;

    return (
      <View style={styles.card}>
        <TouchableOpacity
          onPress={() =>
            router.push(`/userProfile?userKey=${getUserKey(request.fromUser)}`)
          }
        >
          {photo ? (
            <Image source={{ uri: photo }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>
                {request.fromUser.name?.slice(0, 1).toUpperCase() ?? "E"}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.copy}>
          <Text style={styles.name}>
            {request.fromUser.name ?? "Jemand"}
            {request.fromUser.age ? `, ${request.fromUser.age}` : ""}
          </Text>
          {request.fromUser.city && request.fromUser.country ? (
            <Text style={styles.location} numberOfLines={1}>
              {request.fromUser.city}, {getCountryLabel(request.fromUser.country)}
            </Text>
          ) : null}
          <Text style={styles.body} numberOfLines={2}>
            Möchte mit dir matchen.
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.smallButton, styles.acceptButton]}
            onPress={() => handleAccept(request)}
          >
            <Text style={styles.acceptText}>Annehmen</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.smallButton, styles.skipButton]}
            onPress={() => handleSkip(request)}
          >
            <Text style={styles.skipText}>Überspringen</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
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

  return (
    <ThemedBackground style={styles.background}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Benachrichtigungen</Text>
        <Text style={styles.subtitle}>
          Deine Matches, neue Likes und alle Antworten an einem Ort.
        </Text>

        {isWeb ? (
          <View style={styles.pushCard}>
            <View style={styles.pushCopy}>
              <Text style={styles.pushTitle}>Browser Push</Text>
              <Text style={styles.pushText}>
                Neue Likes, Matches und Nachrichten auch bei geschlossener Seite.
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.pushButton,
                pushState === "enabled" && styles.pushButtonEnabled,
                pushPending && styles.pushButtonDisabled,
              ]}
              disabled={pushPending}
              onPress={handlePushToggle}
            >
              <Text style={styles.pushButtonText}>
                {pushPending
                  ? "..."
                  : pushState === "enabled"
                    ? "Aktiv"
                    : "Aktivieren"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {message ? <Text style={styles.message}>{message}</Text> : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Eingehende Likes</Text>
          {incomingLikes.length ? (
            incomingLikes.map((request) => (
              <LikeCard key={request.id} request={request} />
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Keine neuen Likes</Text>
              <Text style={styles.emptyText}>Neue Likes erscheinen hier.</Text>
            </View>
          )}
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Updates zu deinen Likes</Text>
          {responses.length ? (
            responses.map((request) => (
              <View key={request.id} style={styles.responseCard}>
                <Text style={styles.responseTitle}>
                  {request.toUser.name ?? "Jemand"}
                </Text>
                <Text style={styles.responseText}>
                  {request.status === "accepted"
                    ? "Hat deinen Like angenommen. Der Chat ist geöffnet."
                    : "Hat deinen Like übersprungen."}
                </Text>
                {request.status === "accepted" && request.matchId ? (
                  <TouchableOpacity
                    style={styles.chatButton}
                    onPress={() =>
                      router.push(`/chat?matchId=${request.matchId}`)
                    }
                  >
                    <Text style={styles.chatText}>Chat öffnen</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Noch keine Antworten</Text>
              <Text style={styles.emptyText}>
                Wenn jemand deinen Like annimmt oder überspringt, erscheint es hier.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Meine Matches</Text>
          {matches.length ? (
            matches.map((record) => {
              const photo = record.user.photos?.[0] ?? record.user.picture;
              const statusLabel =
                record.status === "accepted"
                  ? "Angenommen"
                  : record.status === "skipped"
                    ? "Übersprungen"
                    : "Wartet";

              return (
                <TouchableOpacity
                  key={record.user.id}
                  style={styles.matchCard}
                  onPress={() => handleOpenMatch(record)}
                >
                  {photo ? (
                    <Image source={{ uri: photo }} style={styles.matchAvatar} />
                  ) : (
                    <View style={styles.matchAvatarPlaceholder}>
                      <Text style={styles.avatarInitial}>
                        {record.user.name?.slice(0, 1).toUpperCase() ?? "E"}
                      </Text>
                    </View>
                  )}

                  <View style={styles.copy}>
                    <Text style={styles.name} numberOfLines={1}>
                      {record.user.name}
                      {record.user.age ? `, ${record.user.age}` : ""}
                    </Text>
                    {record.user.city && record.user.country ? (
                      <Text style={styles.location} numberOfLines={1}>
                        {record.user.city},{" "}
                        {getCountryLabel(record.user.country)}
                      </Text>
                    ) : null}
                    <Text style={styles.body} numberOfLines={2}>
                      {record.user.about}
                    </Text>
                  </View>

                  <View style={styles.matchActions}>
                    <View
                      style={[
                        styles.statusBadge,
                        record.status === "accepted" && styles.mutualBadge,
                        record.status === "pending" && styles.waitingBadge,
                        record.status === "skipped" && styles.skippedBadge,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          record.status === "accepted" && styles.mutualText,
                          record.status === "pending" && styles.waitingText,
                          record.status === "skipped" && styles.skippedText,
                        ]}
                      >
                        {statusLabel}
                      </Text>
                    </View>
                    {record.status === "accepted" ? (
                      <Text style={styles.matchOpenText}>Chat ›</Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Noch keine Matches</Text>
              <Text style={styles.emptyText}>
                Deine Likes und bestätigten Kontakte erscheinen hier.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </ThemedBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
  },

  container: {
    width: "100%",
    maxWidth: isWeb ? 980 : 640,
    alignSelf: "center",
    paddingHorizontal: isWeb ? 34 : 20,
    paddingBottom: isWeb ? 150 : 120,
    marginTop: isWeb ? 34 : 80,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  navButton: {
    width: 44,
    height: 44,
    alignSelf: "flex-start",
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.78)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    marginLeft: 10,
  },

  navText: {
    color: "#111",
    fontSize: 34,
    lineHeight: 36,
  },

  title: {
    color: "#b4b2b2",
    fontSize: 36,
  },

  subtitle: {
    color: "#6E6E73",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 6,
  },

  message: {
    marginTop: 14,
    color: "#111",
    fontSize: 14,
  },

  pushCard: {
    marginTop: 18,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.84)",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },

  pushCopy: {
    flex: 1,
    minWidth: 0,
  },

  pushTitle: {
    color: "#111",
    fontSize: 17,
    fontWeight: "800",
  },

  pushText: {
    color: "#6E6E73",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },

  pushButton: {
    minWidth: 94,
    height: 42,
    borderRadius: 15,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },

  pushButtonEnabled: {
    backgroundColor: premiumColors.emerald,
  },

  pushButtonDisabled: {
    opacity: 0.55,
  },

  pushButtonText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "800",
  },

  section: {
    marginTop: 16,
  },

  sectionTitle: {
    color: "#111",
    fontSize: 19,
    marginBottom: 12,
  },
  logo: {
    width: 220,
    height: 120,
    resizeMode: "contain",
    marginTop: 24,
  },

  card: {
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.84)",
    padding: 14,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  avatar: {
    width: 66,
    height: 66,
    borderRadius: 22,
    backgroundColor: "#E8E2DC",
  },

  avatarPlaceholder: {
    width: 66,
    height: 66,
    borderRadius: 22,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarInitial: {
    color: "#FFF",
    fontSize: 22,
  },

  copy: {
    flex: 1,
  },

  name: {
    color: "#111",
    fontSize: 17,
  },

  location: {
    color: "#111",
    fontSize: 12,
    marginTop: 4,
  },

  body: {
    color: "#6E6E73",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },

  actions: {
    gap: 8,
  },

  smallButton: {
    minWidth: 76,
    height: 36,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },

  acceptButton: {
    backgroundColor: "#111",
  },

  skipButton: {
    backgroundColor: "#FFF",
  },

  acceptText: {
    color: "#FFF",
    fontSize: 13,
  },

  skipText: {
    color: "#111",
    fontSize: 13,
  },

  responseCard: {
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.82)",
    padding: 16,
    marginBottom: 12,
  },

  responseTitle: {
    color: "#111",
    fontSize: 17,
  },

  responseText: {
    color: "#6E6E73",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 5,
  },

  chatButton: {
    height: 42,
    alignSelf: "flex-start",
    borderRadius: 15,
    backgroundColor: "#111",
    justifyContent: "center",
    paddingHorizontal: 18,
    marginTop: 12,
  },

  chatText: {
    color: "#FFF",
    fontSize: 14,
  },

  emptyCard: {
    minHeight: 150,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.76)",
    alignItems: "center",
    justifyContent: "center",
    padding: 22,
  },

  emptyTitle: {
    color: "#111",
    fontSize: 20,
    textAlign: "center",
  },

  emptyText: {
    color: "#6E6E73",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 8,
  },

  matchCard: {
    borderRadius: 24,
    backgroundColor: "rgba(255, 252, 247, 0.9)",
    borderWidth: 1,
    borderColor: premiumColors.hairline,
    padding: 14,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    ...premiumShadow,
  },

  matchAvatar: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: premiumColors.champagneSoft,
  },

  matchAvatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: premiumColors.navy,
    alignItems: "center",
    justifyContent: "center",
  },

  matchActions: {
    alignItems: "flex-end",
    gap: 8,
  },

  statusBadge: {
    minHeight: 32,
    borderRadius: 999,
    paddingHorizontal: 10,
    justifyContent: "center",
  },

  mutualBadge: {
    backgroundColor: premiumColors.emeraldSoft,
  },

  waitingBadge: {
    backgroundColor: premiumColors.champagneSoft,
  },

  skippedBadge: {
    backgroundColor: "#F4E0DD",
  },

  statusText: {
    fontSize: 12,
  },

  mutualText: {
    color: premiumColors.emerald,
  },

  waitingText: {
    color: "#7A5A12",
  },

  skippedText: {
    color: "#7A1F1F",
  },

  matchOpenText: {
    color: premiumColors.ink,
    fontSize: 13,
  },
});
