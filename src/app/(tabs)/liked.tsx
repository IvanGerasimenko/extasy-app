import {
  PremiumEmptyState,
  PremiumHeader,
  PremiumLoadingState,
} from "@/components/PremiumUI";
import { ThemedBackground } from "@/components/ThemedBackground";
import {
  premiumColors,
  premiumShadow,
  premiumSpacing,
} from "@/constants/premiumDesign";
import { getCountryLabel } from "@/constants/germanLabels";
import {
  getLikedProfilesForCurrentUser,
  getUserKey,
  openAcceptedLikedProfileChat,
  type LikedProfileRecord,
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
  useWindowDimensions,
  View,
} from "react-native";

const isWeb = Platform.OS === "web";

export default function LikedScreen() {
  const { width } = useWindowDimensions();
  const [likedProfiles, setLikedProfiles] = useState<LikedProfileRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();
  const isCompactWeb = isWeb && width < 620;

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
  }, [pathname]);

  async function handleOpenRecord(record: LikedProfileRecord) {
    if (record.status === "accepted") {
      const match = await openAcceptedLikedProfileChat(getUserKey(record.user));

      if (match) {
        router.push(`/chat?matchId=${match.id}`);
        return;
      }
    }

    router.push(`/userProfile?userKey=${getUserKey(record.user)}`);
  }

  if (isLoading) {
    return (
      <ThemedBackground style={styles.background}>
        <PremiumLoadingState label="Matches werden geladen" />
      </ThemedBackground>
    );
  }

  return (
    <ThemedBackground style={styles.background}>
      <ScrollView contentContainerStyle={styles.container}>
        <PremiumHeader
          eyebrow="Matches"
          title="Kontakte"
          subtitle="Profile, die du gespeichert hast oder mit denen du gematcht hast, inklusive Status."
        />

        {likedProfiles.length ? (
          likedProfiles.map((record) => {
            const photo = record.user.photos?.[0] ?? record.user.picture;
            let statusLabel;

            if (record.status === "accepted") {
              statusLabel = "Angenommen";
            } else if (record.status === "skipped") {
              statusLabel = "Übersprungen";
            } else {
              statusLabel = "Wartet";
            }

            return (
              <TouchableOpacity
                key={record.user.id}
                style={[
                  styles.likedCard,
                  isCompactWeb && styles.compactLikedCard,
                ]}
                onPress={() => handleOpenRecord(record)}
              >
                <View style={styles.cardMain}>
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
                    <Text style={styles.name} numberOfLines={2}>
                      {record.user.name}, {record.user.age}
                    </Text>
                    {record.user.city && record.user.country ? (
                      <Text style={styles.location} numberOfLines={1}>
                        {record.user.city},{" "}
                        {getCountryLabel(record.user.country)}
                      </Text>
                    ) : null}
                    <Text style={styles.about} numberOfLines={2}>
                      {record.user.about}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardActions}>
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
                    <TouchableOpacity
                      style={styles.chatButton}
                      onPress={() => handleOpenRecord(record)}
                    >
                      <Text style={styles.chatText}>Chat</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <PremiumEmptyState
            title="Noch keine Matches"
            text="Profile, mit denen du Kontakt aufnimmst, erscheinen hier mit ihrem Status."
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
    maxWidth: isWeb ? 980 : 640,
    alignSelf: "center",
    paddingHorizontal: isWeb ? 34 : premiumSpacing.screenX,
    paddingTop: isWeb ? 34 : premiumSpacing.screenTop,
    paddingBottom: isWeb ? 150 : premiumSpacing.screenBottom,
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
    color: "#727171",
    fontSize: 34,
    lineHeight: 36,
  },

  title: {
    color: "#b4b2b2",
    fontSize: 36,
  },

  subtitle: {
    color: "#888787",
    fontSize: 15,
    marginTop: 6,
  },

  likedCard: {
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

  compactLikedCard: {
    alignItems: "stretch",
    flexDirection: "column",
    gap: 12,
  },

  cardMain: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  cardActions: {
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
  },

  avatar: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: premiumColors.champagneSoft,
  },

  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: premiumColors.navy,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarInitial: {
    color: "#FFF",
    fontSize: 22,
  },

  copy: {
    flex: 1,
    minWidth: 0,
  },

  name: {
    color: premiumColors.ink,
    fontSize: 17,
    fontWeight: "800",
    flexShrink: 1,
  },

  about: {
    color: premiumColors.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },

  location: {
    color: premiumColors.navy,
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

  chatButton: {
    height: 36,
    borderRadius: 14,
    backgroundColor: premiumColors.ink,
    justifyContent: "center",
    paddingHorizontal: 14,
  },

  chatText: {
    color: "#FFF",
    fontSize: 13,
  },

});
