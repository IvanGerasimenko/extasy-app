import {
  getCurrentUserMatches,
  getSessionUser,
  getUserKey,
  type MatchRecord,
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

function getOtherUser(match: MatchRecord, currentUserKey: string) {
  const otherUserKey = match.userKeys.find(
    (userKey) => userKey !== currentUserKey,
  );
  return otherUserKey ? match.users[otherUserKey] : null;
}

export default function ChatsScreen() {
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [currentUserKey, setCurrentUserKey] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadChats() {
      const user = await getSessionUser();

      if (!user) {
        router.replace("/welcome");
        return;
      }

      const userMatches = await getCurrentUserMatches();

      if (!isMounted) {
        return;
      }

      setCurrentUserKey(getUserKey(user));
      setMatches(userMatches);
      setIsLoading(false);
    }

    loadChats();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <ImageBackground
        source={require("../../../assets/bg.png")}
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
      source={require("../../../assets/bg.png")}
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
          <Text style={styles.title}>Chats</Text>
        </View>

        {matches.length ? (
          matches.map((match) => {
            const otherUser = getOtherUser(match, currentUserKey);
            const photo = otherUser?.photos?.[0] ?? otherUser?.picture;

            return (
              <TouchableOpacity
                key={match.id}
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
                  <Text style={styles.chatName}>
                    {otherUser?.name ?? "Match"}
                  </Text>
                  {otherUser?.city && otherUser.country ? (
                    <Text style={styles.chatLocation} numberOfLines={1}>
                      {otherUser.city}, {otherUser.country}
                    </Text>
                  ) : null}
                  <Text style={styles.chatPreview}>
                    You matched. Say hello.
                  </Text>
                </View>

                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No chats yet</Text>
            <Text style={styles.emptyText}>
              When both people like each other, a chat appears here.
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
    paddingBottom: 120,
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

  chatRow: {
    minHeight: 86,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.82)",
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    marginBottom: 12,
  },

  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#E8E2DC",
  },

  avatarPlaceholder: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarInitial: {
    color: "#FFF",
    fontSize: 22,
    fontFamily: "Satoshi-Bold",
  },

  chatCopy: {
    flex: 1,
    marginLeft: 14,
  },

  chatName: {
    color: "#111",
    fontSize: 18,
    fontFamily: "Satoshi-Bold",
  },

  chatPreview: {
    color: "#6E6E73",
    fontSize: 14,
    fontFamily: "Satoshi-Regular",
    marginTop: 4,
  },

  chatLocation: {
    color: "#111",
    fontSize: 12,
    fontFamily: "Satoshi-Bold",
    marginTop: 4,
  },

  chevron: {
    color: "#111",
    fontSize: 32,
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
