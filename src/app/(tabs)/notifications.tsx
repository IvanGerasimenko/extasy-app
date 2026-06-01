import { ThemedBackground } from "@/components/ThemedBackground";
import {
  acceptIncomingLikeRequest,
  getIncomingLikeRequestsForCurrentUser,
  getLikeResponseNotificationsForCurrentUser,
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
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function NotificationsScreen() {
  const [incomingLikes, setIncomingLikes] = useState<LikeRequestRecord[]>([]);
  const [responses, setResponses] = useState<LikeRequestRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    const [incomingRecords, responseRecords] = await Promise.all([
      getIncomingLikeRequestsForCurrentUser(),
      getLikeResponseNotificationsForCurrentUser(),
    ]);

    setIncomingLikes(incomingRecords);
    setResponses(responseRecords);
    setIsLoading(false);
    await markNotificationsSeenForCurrentUser();
  }

  async function handleAccept(request: LikeRequestRecord) {
    const result = await acceptIncomingLikeRequest(request.id);
    await loadNotifications();

    if (result?.match) {
      router.push(`/chat?matchId=${result.match.id}`);
      return;
    }

    setMessage("Could not accept this like.");
  }

  async function handleSkip(request: LikeRequestRecord) {
    await skipIncomingLikeRequest(request.id);
    await loadNotifications();
    setMessage(`${request.fromUser.name ?? "Someone"} was skipped.`);
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
            {request.fromUser.name ?? "Someone"}
            {request.fromUser.age ? `, ${request.fromUser.age}` : ""}
          </Text>
          {request.fromUser.city && request.fromUser.country ? (
            <Text style={styles.location} numberOfLines={1}>
              {request.fromUser.city}, {request.fromUser.country}
            </Text>
          ) : null}
          <Text style={styles.body} numberOfLines={2}>
            Wants to match with you.
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.smallButton, styles.acceptButton]}
            onPress={() => handleAccept(request)}
          >
            <Text style={styles.acceptText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.smallButton, styles.skipButton]}
            onPress={() => handleSkip(request)}
          >
            <Text style={styles.skipText}>Skip</Text>
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
        <Text style={styles.title}>Notifications</Text>
        <Text style={styles.subtitle}>
          Accept likes to open a chat, or skip them.
        </Text>

        {message ? <Text style={styles.message}>{message}</Text> : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Incoming Likes</Text>
          {incomingLikes.length ? (
            incomingLikes.map((request) => (
              <LikeCard key={request.id} request={request} />
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No new likes</Text>
              <Text style={styles.emptyText}>New likes will appear here.</Text>
            </View>
          )}
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Like Updates</Text>
          {responses.length ? (
            responses.map((request) => (
              <View key={request.id} style={styles.responseCard}>
                <Text style={styles.responseTitle}>
                  {request.toUser.name ?? "Someone"}
                </Text>
                <Text style={styles.responseText}>
                  {request.status === "accepted"
                    ? "Accepted your like. Chat is open."
                    : "Skipped your like."}
                </Text>
                {request.status === "accepted" && request.matchId ? (
                  <TouchableOpacity
                    style={styles.chatButton}
                    onPress={() =>
                      router.push(`/chat?matchId=${request.matchId}`)
                    }
                  >
                    <Text style={styles.chatText}>Open Chat</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No answers yet</Text>
              <Text style={styles.emptyText}>
                When someone accepts or skips your like, it appears here.
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
    maxWidth: 640,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingBottom: 120,
    marginTop: 80,
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
