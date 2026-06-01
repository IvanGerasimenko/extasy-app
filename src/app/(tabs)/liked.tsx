import { ThemedBackground } from "@/components/ThemedBackground";
import {
  getLikedProfilesForCurrentUser,
  getUserKey,
  type LikedProfileRecord,
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

export default function LikedScreen() {
  const [likedProfiles, setLikedProfiles] = useState<LikedProfileRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadLikedProfiles() {
      const records = await getLikedProfilesForCurrentUser();

      if (!isMounted) {
        return;
      }

      setLikedProfiles(records);
      setIsLoading(false);
    }

    loadLikedProfiles();

    return () => {
      isMounted = false;
    };
  }, []);

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
        <View style={styles.header}>
          <Text style={styles.title}>Liked</Text>
          <Text style={styles.subtitle}>People you already liked.</Text>
        </View>

        {likedProfiles.length ? (
          likedProfiles.map((record) => {
            const photo = record.user.photos?.[0] ?? record.user.picture;
            let statusLabel;

            if (record.status === "accepted") {
              statusLabel = "Accepted";
            } else if (record.status === "skipped") {
              statusLabel = "Skipped";
            } else {
              statusLabel = "Waiting";
            }

            return (
              <TouchableOpacity
                key={record.user.id}
                style={styles.likedCard}
                onPress={() =>
                  router.push(`/userProfile?userKey=${getUserKey(record.user)}`)
                }
              >
                <TouchableOpacity
                  onPress={() =>
                    router.push(
                      `/userProfile?userKey=${getUserKey(record.user)}`,
                    )
                  }
                >
                  {photo ? (
                    <Image source={{ uri: photo }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarInitial}>
                        {record.user.name?.slice(0, 1).toUpperCase() ?? "E"}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                <View style={styles.copy}>
                  <Text style={styles.name}>
                    {record.user.name}, {record.user.age}
                  </Text>
                  {record.user.city && record.user.country ? (
                    <Text style={styles.location} numberOfLines={1}>
                      {record.user.city}, {record.user.country}
                    </Text>
                  ) : null}
                  <Text style={styles.about} numberOfLines={2}>
                    {record.user.about}
                  </Text>
                </View>

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

                {record.status === "accepted" && record.matchId ? (
                  <TouchableOpacity
                    style={styles.chatButton}
                    onPress={() =>
                      router.push(`/chat?matchId=${record.matchId}`)
                    }
                  >
                    <Text style={styles.chatText}>Chat</Text>
                  </TouchableOpacity>
                ) : null}
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No likes yet</Text>
            <Text style={styles.emptyText}>
              Profiles you like will appear here with their match status.
            </Text>
          </View>
        )}
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
  logo: {
    flex: 1,
    width: 220,
    height: 120,
    resizeMode: "contain",
    marginTop: 24,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  header: {
    marginBottom: 24,
  },

  navButton: {
    width: 44,
    height: 44,
    alignSelf: "flex-start",
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.60)",
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
    color: "#111",
    fontSize: 36,
  },

  subtitle: {
    color: "#888787",
    fontSize: 15,
    marginTop: 6,
  },

  likedCard: {
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.84)",
    padding: 14,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  avatar: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "#E8E2DC",
  },

  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 20,
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

  about: {
    color: "#6E6E73",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },

  location: {
    color: "#111",
    fontSize: 12,
    marginTop: 4,
  },

  statusBadge: {
    minHeight: 32,
    borderRadius: 999,
    paddingHorizontal: 10,
    justifyContent: "center",
  },

  mutualBadge: {
    backgroundColor: "#DDFCE7",
  },

  waitingBadge: {
    backgroundColor: "#F4E8CA",
  },

  skippedBadge: {
    backgroundColor: "#F2D9D9",
  },

  statusText: {
    fontSize: 12,
  },

  mutualText: {
    color: "#126B36",
  },

  waitingText: {
    color: "#7A5A12",
  },

  skippedText: {
    color: "#7A1F1F",
  },

  chatButton: {
    height: 36,
    borderRadius: 14,
    backgroundColor: "#111",
    justifyContent: "center",
    paddingHorizontal: 14,
  },

  chatText: {
    color: "#FFF",
    fontSize: 13,
  },

  emptyCard: {
    minHeight: 280,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.82)",
    alignItems: "center",
    justifyContent: "center",
    padding: 26,
  },

  emptyTitle: {
    color: "#111",
    fontSize: 26,
    textAlign: "center",
  },

  emptyText: {
    color: "#6E6E73",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginTop: 10,
  },
});
