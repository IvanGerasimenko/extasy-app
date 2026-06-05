import { ThemedBackground } from "@/components/ThemedBackground";
import { getCountryLabel } from "@/constants/germanLabels";
import {
  acceptIncomingLikeRequest,
  getIncomingLikeRequestsForCurrentUser,
  getLikeResponseNotificationsForCurrentUser,
  getUnreadAcceptedLikeResponseForCurrentUser,
  getUserKey,
  markNotificationsSeenForCurrentUser,
  skipIncomingLikeRequest,
  type LikeRequestRecord,
} from "@/services/auth/session";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
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
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    const [incomingRecords, responseRecords, unreadAcceptedResponse] =
      await Promise.all([
        getIncomingLikeRequestsForCurrentUser(),
        getLikeResponseNotificationsForCurrentUser(),
        getUnreadAcceptedLikeResponseForCurrentUser(),
      ]);

    setIncomingLikes(incomingRecords);
    setResponses(responseRecords);
    setIsLoading(false);
    await markNotificationsSeenForCurrentUser();

    if (unreadAcceptedResponse?.matchId) {
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
          Nimm Likes an, um einen Chat zu öffnen, oder überspringe sie.
        </Text>

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
});
