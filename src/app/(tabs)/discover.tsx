import {
  getLikedUserKeysForCurrentUser,
  getLocalAccountUsers,
  getSessionUser,
  getUserKey,
  recordProfileLike,
  type SessionUser,
} from "@/services/auth/session";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ThemedBackground } from "@/components/ThemedBackground";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ImageSourcePropType,
} from "react-native";

const screenWidth = Dimensions.get("window").width;
const isCompactViewport = screenWidth < 500;

type DiscoverProfile = {
  id: string;
  name: string;
  age: string;
  about: string;
  city: string;
  country: string;
  gender: string;
  lookingFor: string;
  interests: string[];
  photos: ImageSourcePropType[];
  user: SessionUser;
};

function hasCompleteProfile(user: SessionUser | null) {
  return Boolean(
    user?.onboardingCompleted &&
    user.name &&
    user.age &&
    user.about &&
    (user.picture || user.photos?.[0]) &&
    user.gender &&
    user.lookingFor &&
    user.interests &&
    user.interests.length >= 3,
  );
}

function isSameUser(firstUser: SessionUser, secondUser: SessionUser) {
  return Boolean(
    firstUser.id === secondUser.id ||
    (firstUser.email &&
      secondUser.email &&
      firstUser.email.toLowerCase() === secondUser.email.toLowerCase()) ||
    (firstUser.googleId && firstUser.googleId === secondUser.googleId) ||
    (firstUser.phoneNumber && firstUser.phoneNumber === secondUser.phoneNumber),
  );
}

function normalizeGender(value?: string) {
  const normalizedValue = value?.trim().toLowerCase();

  if (normalizedValue === "women" || normalizedValue === "woman") {
    return "woman";
  }

  if (normalizedValue === "men" || normalizedValue === "man") {
    return "man";
  }

  if (normalizedValue === "non-binary") {
    return "non-binary";
  }

  if (normalizedValue === "everyone") {
    return "everyone";
  }

  return normalizedValue ?? "";
}

function acceptsGender(lookingFor?: string, gender?: string) {
  const normalizedLookingFor = normalizeGender(lookingFor);
  const normalizedGender = normalizeGender(gender);

  return (
    normalizedLookingFor === "everyone" ||
    normalizedLookingFor === normalizedGender
  );
}

function isCompatibleMatch(currentUser: SessionUser, localUser: SessionUser) {
  return (
    acceptsGender(currentUser.lookingFor, localUser.gender) &&
    acceptsGender(localUser.lookingFor, currentUser.gender)
  );
}

function isNearbyProfile(currentUser: SessionUser, localUser: SessionUser) {
  if (!currentUser.country || !localUser.country) {
    return true;
  }

  return (
    currentUser.country?.trim().toLowerCase() ===
    localUser.country?.trim().toLowerCase()
  );
}

function profileFromUser(user: SessionUser): DiscoverProfile {
  let rawPhotos: string[] = [];

  if (user.photos?.length) {
    rawPhotos = user.photos;
  } else if (user.picture) {
    rawPhotos = [user.picture];
  }

  return {
    id: `user-${user.id}`,
    name: user.name ?? "You",
    age: user.age ?? "",
    about: user.about ?? "",
    city: user.city ?? "",
    country: user.country ?? "",
    gender: user.gender ?? "",
    lookingFor: user.lookingFor ?? "",
    interests: user.interests ?? [],
    photos: rawPhotos.map((photo) => ({ uri: photo })),
    user,
  };
}

function getDiscoverProfiles(
  currentUser: SessionUser,
  localUsers: SessionUser[],
  likedUserKeys: string[],
) {
  const availableProfiles = localUsers
    .filter((localUser) => hasCompleteProfile(localUser))
    .filter((localUser) => !isSameUser(localUser, currentUser))
    .filter((localUser) => !likedUserKeys.includes(getUserKey(localUser)));

  const genderMatchedProfiles = availableProfiles.filter((localUser) =>
    acceptsGender(currentUser.lookingFor, localUser.gender),
  );

  const preferredProfiles = genderMatchedProfiles.filter(
    (localUser) =>
      acceptsGender(localUser.lookingFor, currentUser.gender) &&
      isNearbyProfile(currentUser, localUser),
  );

  return (
    preferredProfiles.length ? preferredProfiles : genderMatchedProfiles
  ).map(profileFromUser);
}

export default function DiscoverScreen() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [deck, setDeck] = useState<DiscoverProfile[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [reaction, setReaction] = useState("");
  const [matchChatId, setMatchChatId] = useState<string | null>(null);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [isDeciding, setIsDeciding] = useState(false);
  const cardTranslateX = useRef(new Animated.Value(0)).current;
  const isDecidingRef = useRef(false);
  const fullscreenCarouselRef = useRef<ScrollView | null>(null);

  const activeMatch = useMemo(
    () => deck[activeIndex] ?? null,
    [activeIndex, deck],
  );
  const remainingProfiles = Math.max(0, deck.length - activeIndex);

  const cardRotate = cardTranslateX.interpolate({
    inputRange: [-screenWidth, 0, screenWidth],
    outputRange: ["-10deg", "0deg", "10deg"],
    extrapolate: "clamp",
  });

  useEffect(() => {
    if (fullscreenOpen && activeMatch) {
      const frame = requestAnimationFrame(() => {
        fullscreenCarouselRef.current?.scrollTo({
          x: photoIndex * screenWidth,
          animated: false,
        });
      });

      return () => cancelAnimationFrame(frame);
    }
  }, [activeMatch, fullscreenOpen, photoIndex]);

  useEffect(() => {
    cardTranslateX.stopAnimation();
    cardTranslateX.setValue(0);
  }, [activeIndex, cardTranslateX]);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      const sessionUser = await getSessionUser();

      if (!isMounted) {
        return;
      }

      if (!sessionUser || !hasCompleteProfile(sessionUser)) {
        router.replace("/onboarding");
        return;
      }

      const localUsers = await getLocalAccountUsers();
      const likedUserKeys = await getLikedUserKeysForCurrentUser();
      const discoverProfiles = getDiscoverProfiles(
        sessionUser,
        localUsers,
        likedUserKeys,
      );

      setUser(sessionUser);
      setDeck(discoverProfiles);
      setActiveIndex(0);
      setPhotoIndex(0);
      setIsLoading(false);
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  async function persistDecision(
    nextReaction: string,
    decidedMatch: DiscoverProfile,
  ) {
    if (nextReaction !== "Liked") {
      return;
    }

    let likeResult = null;

    try {
      likeResult = await recordProfileLike(decidedMatch.user);
    } catch (error) {
      setReaction(
        error instanceof Error
          ? error.message
          : "Could not save this like. Try again.",
      );
      return;
    }

    if (likeResult?.user) {
      setUser(likeResult.user);
    }

    if (likeResult?.isMatch && likeResult.match) {
      setReaction(`It's a match with ${decidedMatch.name}`);
      setMatchChatId(likeResult.match.id);
    } else {
      setReaction(`${decidedMatch.name} received your like`);
    }
  }

  function animateDecision(nextReaction: string) {
    const decidedMatch = activeMatch;

    if (!decidedMatch || isDecidingRef.current) {
      return;
    }

    isDecidingRef.current = true;
    setIsDeciding(true);
    setReaction(nextReaction === "Liked" ? "Liked" : "");
    setMatchChatId(null);

    Animated.timing(cardTranslateX, {
      toValue:
        nextReaction === "Liked" ? screenWidth * 1.15 : -screenWidth * 1.15,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      cardTranslateX.setValue(0);
      setPhotoIndex(0);
      setActiveIndex((currentIndex) => Math.min(currentIndex + 1, deck.length));
      requestAnimationFrame(() => {
        isDecidingRef.current = false;
        setIsDeciding(false);
      });
      void persistDecision(nextReaction, decidedMatch);
    });
  }

  function resetDeck() {
    if (!user) {
      return;
    }

    getLocalAccountUsers().then(async (localUsers) => {
      const likedUserKeys = await getLikedUserKeysForCurrentUser();
      const discoverProfiles = getDiscoverProfiles(
        user,
        localUsers,
        likedUserKeys,
      );

      setDeck(discoverProfiles);
      setActiveIndex(0);
      setPhotoIndex(0);
      setReaction("");
      setMatchChatId(null);
    });
  }

  function changePhoto(direction: -1 | 1) {
    if (!activeMatch?.photos.length) {
      return;
    }

    setPhotoIndex((currentIndex) => {
      const photoCount = activeMatch.photos.length;
      return (currentIndex + direction + photoCount) % photoCount;
    });
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
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>Extasy</Text>
            <Text style={styles.title}>Discover</Text>
          </View>
          <View style={styles.headerPill}>
            <Text style={styles.headerPillText}>
              {remainingProfiles} nearby
            </Text>
          </View>
        </View>

        {activeMatch ? (
          <Animated.View
            key={`${activeMatch.id}-${activeIndex}`}
            style={[
              styles.matchCard,
              {
                transform: [
                  { translateX: cardTranslateX },
                  { rotate: cardRotate },
                ],
              },
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.95}
              style={styles.cardTouchable}
              onPress={() => {
                if (!isDeciding) {
                  changePhoto(1);
                }
              }}
              onLongPress={() => {
                if (!isDeciding) {
                  setFullscreenOpen(true);
                }
              }}
            >
              <Image
                source={activeMatch.photos[photoIndex] ?? activeMatch.photos[0]}
                style={styles.profileImage}
              />
              <View style={styles.imageShadeTop} />
              <View style={styles.imageShadeBottom} />

              {activeMatch.photos.length > 1 ? (
                <View style={styles.photoDots}>
                  {activeMatch.photos.map((_, index) => (
                    <View
                      key={`${activeMatch.id}-dot-${index}`}
                      style={[
                        styles.photoDot,
                        index === photoIndex && styles.activePhotoDot,
                      ]}
                    />
                  ))}
                </View>
              ) : null}

              <TouchableOpacity
                style={styles.expandButton}
                onPress={() => setFullscreenOpen(true)}
              >
                <Text style={styles.expandText}>View</Text>
              </TouchableOpacity>

              <View style={styles.matchInfo}>
                <View style={styles.matchTopRow}>
                  <Text style={styles.matchName}>
                    {activeMatch.name}, {activeMatch.age}
                  </Text>
                  <View style={styles.onlineBadge}>
                    <Text style={styles.onlineText}>Active</Text>
                  </View>
                </View>

                <Text style={styles.matchMeta}>
                  {activeMatch.gender} looking for {activeMatch.lookingFor}
                </Text>

                {activeMatch.city && activeMatch.country ? (
                  <Text style={styles.locationText}>
                    {activeMatch.city}, {activeMatch.country}
                  </Text>
                ) : null}

                <Text style={styles.about} numberOfLines={3}>
                  {activeMatch.about}
                </Text>

                <View style={styles.tags}>
                  {activeMatch.interests.slice(0, 5).map((interest) => (
                    <View key={interest} style={styles.tag}>
                      <Text style={styles.tagText}>{interest}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No more profiles</Text>
            <Text style={styles.emptyText}>
              You have seen everyone near you for now.
            </Text>
            <TouchableOpacity style={styles.resetButton} onPress={resetDeck}>
              <Text style={styles.resetText}>Start Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {reaction ? <Text style={styles.reactionText}>{reaction}</Text> : null}

        {matchChatId ? (
          <TouchableOpacity
            style={styles.chatButton}
            onPress={() => router.push(`/chat?matchId=${matchChatId}`)}
          >
            <Text style={styles.chatButtonText}>Open Chat</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      {activeMatch ? (
        <View style={styles.floatingActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.passButton]}
            onPress={() => animateDecision("Passed for now")}
            disabled={isDeciding}
          >
            <Text style={styles.passText}>×</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.likeButton]}
            onPress={() => animateDecision("Liked")}
            disabled={isDeciding}
          >
            <Image
              source={require("../../../assets/liked.png")}
              style={styles.likeIcon}
            />
          </TouchableOpacity>
        </View>
      ) : null}

      <Modal visible={fullscreenOpen} transparent animationType="fade">
        <View style={styles.fullscreen}>
          <TouchableOpacity
            style={styles.fullscreenClose}
            onPress={() => setFullscreenOpen(false)}
          >
            <Text style={styles.fullscreenCloseText}>Close</Text>
          </TouchableOpacity>

          {activeMatch?.photos.length ? (
            <ScrollView
              ref={fullscreenCarouselRef}
              horizontal
              pagingEnabled
              bounces={false}
              decelerationRate="fast"
              showsHorizontalScrollIndicator={false}
              style={styles.fullscreenImageWrap}
              contentOffset={{ x: photoIndex * screenWidth, y: 0 }}
              onMomentumScrollEnd={(event) => {
                const nextIndex = Math.round(
                  event.nativeEvent.contentOffset.x / screenWidth,
                );

                if (nextIndex >= 0 && nextIndex < activeMatch.photos.length) {
                  setPhotoIndex(nextIndex);
                }
              }}
            >
              {activeMatch.photos.map((photo, index) => (
                <View
                  key={`${activeMatch.id}-fullscreen-${index}`}
                  style={styles.fullscreenSlide}
                >
                  <Image
                    source={photo}
                    style={styles.fullscreenImage}
                    resizeMode="contain"
                  />
                </View>
              ))}
            </ScrollView>
          ) : null}

          {activeMatch && activeMatch.photos.length > 1 ? (
            <View style={styles.fullscreenCounterWrap}>
              <Text style={styles.fullscreenCounter}>
                {photoIndex + 1} / {activeMatch.photos.length}
              </Text>
            </View>
          ) : null}
        </View>
      </Modal>
    </ThemedBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
  },

  screen: {
    flex: 1,
  },

  container: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    paddingHorizontal: isCompactViewport ? 14 : Platform.OS === "web" ? 24 : 16,
    paddingTop: isCompactViewport ? 42 : Platform.OS === "web" ? 34 : 58,
    paddingBottom: isCompactViewport ? 168 : 138,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: isCompactViewport ? 12 : 16,
  },

  eyebrow: {
    color: "#FF4458",
    fontSize: 13,
    letterSpacing: 0,
    fontWeight: "700",
  },

  title: {
    fontSize: isCompactViewport ? 31 : 34,
    color: "#111",
    fontWeight: "800",
    marginTop: 2,
  },

  headerPill: {
    height: 38,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.86)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.92)",
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  headerPillText: {
    color: "#3C3C43",
    fontSize: 13,
    fontWeight: "700",
  },

  matchCard: {
    height: isCompactViewport ? 510 : Platform.OS === "web" ? 660 : 590,
    borderRadius: isCompactViewport ? 30 : 34,
    overflow: "hidden",
    backgroundColor: "#161616",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 20,
    },
    shadowOpacity: 0.24,
    shadowRadius: 30,
    elevation: 12,
  },

  cardTouchable: {
    flex: 1,
  },

  emptyCard: {
    minHeight: 420,
    borderRadius: 28,
    backgroundColor: "rgba(255, 255, 255, 0.82)",
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },

  emptyTitle: {
    color: "#111",
    fontSize: 28,
    textAlign: "center",
  },

  emptyText: {
    color: "#6E6E73",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginTop: 10,
  },

  resetButton: {
    height: 50,
    borderRadius: 18,
    backgroundColor: "#111",
    justifyContent: "center",
    paddingHorizontal: 24,
    marginTop: 22,
  },

  resetText: {
    color: "#FFF",
    fontSize: 15,
  },

  profileImage: {
    ...StyleSheet.absoluteFill,
    width: "100%",
    height: "100%",
  },

  imageShadeTop: {
    ...StyleSheet.absoluteFill,
    bottom: undefined,
    height: 170,
    backgroundColor: "rgba(0, 0, 0, 0.18)",
  },

  imageShadeBottom: {
    ...StyleSheet.absoluteFill,
    top: undefined,
    height: "56%",
    backgroundColor: "rgba(0, 0, 0, 0.58)",
  },

  photoDots: {
    position: "absolute",
    top: 14,
    left: 16,
    right: 16,
    flexDirection: "row",
    gap: 6,
    zIndex: 2,
  },

  photoDot: {
    flex: 1,
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.36)",
  },

  activePhotoDot: {
    backgroundColor: "#FFF",
  },

  expandButton: {
    position: "absolute",
    top: 28,
    right: 16,
    borderRadius: 999,
    backgroundColor: "rgba(0, 0, 0, 0.34)",
    paddingHorizontal: 14,
    height: 34,
    justifyContent: "center",
    zIndex: 3,
  },

  expandText: {
    color: "#FFF",
    fontSize: 12,
  },

  matchInfo: {
    flex: 1,
    justifyContent: "flex-end",
    padding: isCompactViewport ? 18 : 22,
    paddingBottom: isCompactViewport ? 24 : 30,
  },

  matchTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  matchName: {
    flex: 1,
    color: "#FFF",
    fontSize: isCompactViewport ? 30 : Platform.OS === "web" ? 38 : 34,
    fontWeight: "800",
  },

  onlineBadge: {
    backgroundColor: "rgba(48, 209, 88, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(48, 209, 88, 0.45)",
    borderRadius: 999,
    paddingHorizontal: 12,
    height: 30,
    justifyContent: "center",
  },

  onlineText: {
    color: "#DDFCE7",
    fontSize: 12,
    fontWeight: "800",
  },

  matchMeta: {
    marginTop: 8,
    color: "rgba(255, 255, 255, 0.82)",
    fontSize: 15,
  },

  locationText: {
    marginTop: 8,
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 14,
  },

  about: {
    marginTop: 14,
    color: "#FFF",
    fontSize: 15,
    lineHeight: 21,
  },

  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 16,
  },

  tag: {
    minHeight: 34,
    borderRadius: 999,
    paddingHorizontal: 13,
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
  },

  tagText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "700",
  },

  floatingActions: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: isCompactViewport ? 88 : 92,
    zIndex: 12,
    gap: 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },

  actionButton: {
    width: isCompactViewport ? 58 : 64,
    height: isCompactViewport ? 58 : 64,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.72)",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 8,
  },

  passButton: {
    backgroundColor: "#FFF",
  },

  likeButton: {
    width: isCompactViewport ? 66 : 72,
    height: isCompactViewport ? 66 : 72,
    borderRadius: 999,
    backgroundColor: "#FF4458",
  },

  passText: {
    color: "#FF4458",
    fontSize: 34,
    lineHeight: 36,
    fontWeight: "300",
  },

  likeIcon: {
    width: 25,
    height: 25,
    resizeMode: "contain",
    tintColor: "#FFF",
  },

  reactionText: {
    marginTop: 16,
    textAlign: "center",
    color: "#111",
    fontSize: 15,
  },

  chatButton: {
    height: 56,
    alignSelf: "center",
    borderRadius: 18,
    paddingHorizontal: 34,
    backgroundColor: "#111",
    justifyContent: "center",
    marginTop: 16,
  },

  chatButtonText: {
    color: "#FFF",
    fontSize: 16,
  },

  fullscreen: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.96)",
    alignItems: "center",
    justifyContent: "center",
  },

  fullscreenImage: {
    width: screenWidth,
    height: "100%",
  },

  fullscreenImageWrap: {
    width: "100%",
    height: "76%",
  },

  fullscreenSlide: {
    width: screenWidth,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },

  fullscreenClose: {
    position: "absolute",
    top: 56,
    right: 20,
    zIndex: 3,
    height: 42,
    borderRadius: 16,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    justifyContent: "center",
  },

  fullscreenCloseText: {
    color: "#FFF",
    fontSize: 14,
  },

  fullscreenCounterWrap: {
    position: "absolute",
    bottom: 42,
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },

  fullscreenCounter: {
    color: "#FFF",
    fontSize: 15,
  },
});
