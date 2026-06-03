import {
  PremiumEmptyState,
  PremiumHeader,
  PremiumLoadingState,
  PremiumSearchBar,
} from "@/components/PremiumUI";
import { ThemedBackground } from "@/components/ThemedBackground";
import {
  premiumColors,
  premiumShadow,
  premiumSpacing,
} from "@/constants/premiumDesign";
import { getCountryLabel } from "@/constants/ukrainianLabels";
import {
  getCurrentUserMatches,
  getSessionUser,
  getUserKey,
  type MatchRecord,
} from "@/services/auth/session";
import { router, usePathname } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
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

export default function ChatsScreen() {
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [currentUserKey, setCurrentUserKey] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const pathname = usePathname();

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
  }, [pathname]);

  if (isLoading) {
    return (
      <ThemedBackground style={styles.background}>
        <PremiumLoadingState label="Завантажуємо розмови" />
      </ThemedBackground>
    );
  }

  const visibleMatches = matches.filter((match) => {
    const otherUser = getOtherUser(match, currentUserKey);
    return (otherUser?.name ?? "Пара")
      .toLowerCase()
      .includes(query.trim().toLowerCase());
  });

  return (
    <ThemedBackground style={styles.background}>
      <ScrollView contentContainerStyle={styles.container}>
        <PremiumHeader
          eyebrow="Вхідні"
          title="Розмови"
          subtitle="Спокійний простір для уважних повідомлень після взаємної симпатії."
        />
        <PremiumSearchBar value={query} onChangeText={setQuery} />

        {visibleMatches.length ? (
          visibleMatches.map((match, index) => {
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
                  <View style={styles.chatTitleRow}>
                    <Text style={styles.chatName}>
                      {otherUser?.name ?? "Пара"}
                    </Text>
                    <Text style={styles.timeText}>
                      {index ? "Учора" : "Зараз"}
                    </Text>
                  </View>
                  {otherUser?.city && otherUser.country ? (
                    <Text style={styles.chatLocation} numberOfLines={1}>
                      {otherUser.city}, {getCountryLabel(otherUser.country)}
                    </Text>
                  ) : null}
                  <Text style={styles.chatPreview}>
                    {index
                      ? "На вас чекає змістовна розмова."
                      : "У вас взаємна симпатія. Привітайтесь щиро."}
                  </Text>
                </View>

                {!index ? <View style={styles.unreadBadge} /> : null}
              </TouchableOpacity>
            );
          })
        ) : (
          <PremiumEmptyState
            title="Чатів поки немає"
            text="Коли симпатія стане взаємною, розмова з'явиться тут."
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
  },

  container: {
    width: "100%",
    maxWidth: isWeb ? 980 : undefined,
    alignSelf: "center",
    paddingHorizontal: isWeb ? 34 : premiumSpacing.screenX,
    paddingTop: isWeb ? 34 : premiumSpacing.screenTop,
    paddingBottom: isWeb ? 150 : premiumSpacing.screenBottom,
    gap: 14,
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
    borderRadius: 22,
    backgroundColor: premiumColors.white,
    borderWidth: 1,
    borderColor: premiumColors.hairline,
    flexDirection: "row",
    alignItems: "center",
    padding: isWeb ? 16 : 14,
    ...premiumShadow,
  },

  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: premiumColors.champagneSoft,
  },

  avatarPlaceholder: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: premiumColors.navy,
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
    color: premiumColors.ink,
    fontSize: 18,
    fontWeight: "800",
  },

  timeText: {
    color: premiumColors.muted,
    fontSize: 11,
    fontWeight: "700",
  },

  chatPreview: {
    color: premiumColors.muted,
    fontSize: 14,
    marginTop: 4,
  },

  chatLocation: {
    color: premiumColors.navy,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
  },

  unreadBadge: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: premiumColors.emerald,
    marginLeft: 10,
  },
});
