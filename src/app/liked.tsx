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
  ImageBackground,
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

  return (
    <ImageBackground
      source={require("../../assets/bg.png")}
      style={styles.background}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => router.back()}
          >
            <Text style={styles.navText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Liked</Text>
          <Text style={styles.subtitle}>People you already liked.</Text>
        </View>

        {likedProfiles.length ? (
          likedProfiles.map((record) => {
            const photo = record.user.photos?.[0] ?? record.user.picture;

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
                  <Text style={styles.about} numberOfLines={2}>
                    {record.user.about}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    record.isMutual ? styles.mutualBadge : styles.waitingBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      record.isMutual ? styles.mutualText : styles.waitingText,
                    ]}
                  >
                    {record.isMutual ? "Matched" : "Waiting"}
                  </Text>
                </View>

                {record.isMutual && record.matchId ? (
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
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
  },

  container: {
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 40,
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
    height: 40,
    alignSelf: "flex-start",
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.78)",
    justifyContent: "center",
    paddingHorizontal: 16,
    marginBottom: 18,
  },

  navText: {
    color: "#111",
    fontSize: 14,
    fontFamily: "Satoshi-Bold",
  },

  title: {
    color: "#111",
    fontSize: 36,
    fontFamily: "Satoshi-Bold",
  },

  subtitle: {
    color: "#6E6E73",
    fontSize: 15,
    fontFamily: "Satoshi-Regular",
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
    fontFamily: "Satoshi-Bold",
  },

  copy: {
    flex: 1,
  },

  name: {
    color: "#111",
    fontSize: 17,
    fontFamily: "Satoshi-Bold",
  },

  about: {
    color: "#6E6E73",
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Satoshi-Regular",
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

  statusText: {
    fontSize: 12,
    fontFamily: "Satoshi-Bold",
  },

  mutualText: {
    color: "#126B36",
  },

  waitingText: {
    color: "#7A5A12",
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
    fontFamily: "Satoshi-Bold",
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
    fontFamily: "Satoshi-Bold",
    textAlign: "center",
  },

  emptyText: {
    color: "#6E6E73",
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Satoshi-Regular",
    textAlign: "center",
    marginTop: 10,
  },
});
