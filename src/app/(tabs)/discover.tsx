import {
  CompatibilityBadge,
  PremiumEmptyState,
  PremiumLoadingState,
  PremiumTag,
} from "@/components/PremiumUI";
import { ThemedBackground } from "@/components/ThemedBackground";
import {
  getCountryLabel,
  getGenderLabel,
  getInterestLabel,
  getLookingForLabel,
} from "@/constants/germanLabels";
import {
  premiumColors,
  premiumShadow,
  premiumSpacing,
} from "@/constants/premiumDesign";
import {
  getLocalAccountUsers,
  getSessionUser,
  getUnavailableDiscoverUserKeysForCurrentUser,
  getUserKey,
  recordProfileLike,
  type SessionUser,
} from "@/services/auth/session";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  type ImageSourcePropType,
} from "react-native";

const initialScreenWidth = Dimensions.get("window").width;
const isCompactViewport = initialScreenWidth < 500;
const isWeb = Platform.OS === "web";

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
    (firstUser.googleId && firstUser.googleId === secondUser.googleId),
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
    name: user.name ?? "Du",
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
  unavailableUserKeys: string[],
) {
  return (
    localUsers
      // Оставляем только доступные и подходящие профили
      .filter(
        (localUser) =>
          hasCompleteProfile(localUser) &&
          !localUser.isDiscoverHidden &&
          !isSameUser(localUser, currentUser) &&
          !unavailableUserKeys.includes(getUserKey(localUser)) &&
          acceptsGender(currentUser.lookingFor, localUser.gender),
      )
      // Рассчитываем полезный для сортировки рейтинг
      .map((localUser) => ({
        localUser,
        score:
          (isCompatibleMatch(currentUser, localUser) ? 4 : 0) +
          (isNearbyProfile(currentUser, localUser) ? 1 : 0),
      }))
      // Сначала показываем наиболее подходящие профили
      .sort(
        (firstProfile, secondProfile) =>
          secondProfile.score - firstProfile.score,
      )
      // Преобразуем пользователя в итоговую модель профиля
      .map(({ localUser }) => profileFromUser(localUser))
  );
}

export default function DiscoverScreen() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [deck, setDeck] = useState<DiscoverProfile[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [reaction, setReaction] = useState("");
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
  const isDesktopWeb = isWeb && screenWidth >= 768;
  const desktopCardHeight = Math.max(400, Math.min(620, screenHeight - 190));
  const desktopCardWidth = Math.min(540, desktopCardHeight * 0.78);

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

      if (!sessionUser || !sessionUser.onboardingCompleted) {
        router.replace("/onboarding");
        return;
      }

      const localUsers = await getLocalAccountUsers();
      const unavailableUserKeys =
        await getUnavailableDiscoverUserKeysForCurrentUser();
      const discoverProfiles = getDiscoverProfiles(
        sessionUser,
        localUsers,
        unavailableUserKeys,
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
          : "Der Like konnte nicht gespeichert werden. Bitte versuche es erneut.",
      );
      return;
    }

    if (likeResult?.user) {
      setUser(likeResult.user);
    }

    if (likeResult?.isMatch && likeResult.match) {
      setReaction(`Ihr habt ein Match mit ${decidedMatch.name}`);
    } else {
      setReaction(`${decidedMatch.name} hat dein Like erhalten`);
    }
  }

  function animateDecision(nextReaction: string) {
    const decidedMatch = activeMatch;

    if (!decidedMatch || isDecidingRef.current) {
      return;
    }

    isDecidingRef.current = true;
    setIsDeciding(true);
    setReaction(nextReaction === "Liked" ? "Like" : "");

    Animated.timing(cardTranslateX, {
      toValue:
        nextReaction === "Liked" ? screenWidth * 1.15 : -screenWidth * 1.15,
      duration: 320,
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
      const unavailableUserKeys =
        await getUnavailableDiscoverUserKeysForCurrentUser();
      const discoverProfiles = getDiscoverProfiles(
        user,
        localUsers,
        unavailableUserKeys,
      );

      setDeck(discoverProfiles);
      setActiveIndex(0);
      setPhotoIndex(0);
      setReaction("");
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
        <PremiumLoadingState />
      </ThemedBackground>
    );
  }

  return (
    <ThemedBackground style={styles.background}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[
          styles.container,
          isDesktopWeb && styles.desktopContainer,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={
            isDesktopWeb
              ? { width: desktopCardWidth, alignSelf: "center" }
              : undefined
          }
        >
          <Text style={styles.extasytitle}>Extasy</Text>
        </View>
        <View
          style={[
            styles.headerPill,
            isDesktopWeb && {
              width: desktopCardWidth,
              alignSelf: "center",
            },
          ]}
        >
          <Text style={styles.headerPillText}>
            {remainingProfiles} verfügbar
          </Text>
        </View>

        {activeMatch ? (
          <Animated.View
            key={`${activeMatch.id}-${activeIndex}`}
            style={[
              styles.matchCard,
              isDesktopWeb && {
                width: desktopCardWidth,
                height: desktopCardHeight,
                minHeight: desktopCardHeight,
                alignSelf: "center",
              },
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
                <Text style={styles.expandText}>Galerie</Text>
              </TouchableOpacity>

              <View style={styles.matchInfo}>
                <View style={styles.matchTopRow}>
                  <Text style={styles.matchName}>
                    {activeMatch.name}, {activeMatch.age}
                  </Text>
                  <CompatibilityBadge value="86%" />
                </View>

                <View style={styles.matchMetaRow}>
                  <Text style={styles.matchMeta}>
                    {getGenderLabel(activeMatch.gender)} sucht{" "}
                    {getLookingForLabel(activeMatch.lookingFor)}
                  </Text>
                  <Text style={styles.intentPill}>Bewusst</Text>
                </View>

                {activeMatch.city && activeMatch.country ? (
                  <Text style={styles.locationText}>
                    {activeMatch.city}, {getCountryLabel(activeMatch.country)}
                  </Text>
                ) : null}

                <Text style={styles.about} numberOfLines={3}>
                  {activeMatch.about}
                </Text>

                <View style={styles.tags}>
                  {activeMatch.interests.slice(0, 5).map((interest) => (
                    <PremiumTag
                      key={interest}
                      label={getInterestLabel(interest)}
                      tone="gold"
                    />
                  ))}
                </View>
              </View>
            </TouchableOpacity>

            <View style={styles.floatingActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.passButton]}
                onPress={() => animateDecision("Übersprungen")}
                disabled={isDeciding}
              >
                <Text style={styles.passText}>×</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.saveButton]}
                onPress={() => setReaction(`${activeMatch.name} gespeichert`)}
                disabled={isDeciding}
              >
                <Text style={styles.saveText}>☆</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.likeButton]}
                onPress={() => animateDecision("Liked")}
                disabled={isDeciding}
              >
                <Image
                  source={require("@/assets/liked.png")}
                  style={styles.connectIcon}
                />
              </TouchableOpacity>
            </View>
          </Animated.View>
        ) : (
          <PremiumEmptyState
            title="Keine Profile mehr"
            text="Du hast aktuell alle verfügbaren vollständigen Profile gesehen."
            action="Auswahl aktualisieren"
            onAction={resetDeck}
          />
        )}

        {reaction ? (
          <View style={styles.toast}>
            <Text style={styles.reactionText}>{reaction}</Text>
          </View>
        ) : null}
      </ScrollView>

      <Modal visible={fullscreenOpen} transparent animationType="fade">
        <View style={styles.fullscreen}>
          <TouchableOpacity
            style={styles.fullscreenClose}
            onPress={() => setFullscreenOpen(false)}
          >
            <Text style={styles.fullscreenCloseText}>Schließen</Text>
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
                  style={[styles.fullscreenSlide, { width: screenWidth }]}
                >
                  <Image
                    source={photo}
                    style={[styles.fullscreenImage, { width: screenWidth }]}
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
    maxWidth: isWeb ? 680 : 560,
    alignSelf: "center",
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 200,
  },

  desktopContainer: {
    justifyContent: "center",
    paddingTop: 0,
  },

  headerPill: {
    height: 40,
    borderRadius: 18,
    backgroundColor: premiumColors.white,
    borderWidth: 1,
    borderColor: premiumColors.hairline,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  extasytitle: {
    color: "#ff9189",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 20,
    marginTop: 20,
  },

  headerPillText: {
    color: premiumColors.navy,
    fontSize: 13,
    fontWeight: "800",
  },

  matchCard: {
    minHeight: isWeb ? 560 : isCompactViewport ? 580 : 360,
    maxWidth: isWeb ? 540 : undefined,
    width: "100%",
    marginTop: 20,

    alignSelf: "center",
    marginBottom: isCompactViewport ? 50 : 48,
    borderRadius: premiumSpacing.cardRadius,
    overflow: "visible",
    backgroundColor: premiumColors.ink,
    ...premiumShadow,
  },

  cardTouchable: {
    flex: 1,
    borderRadius: premiumSpacing.cardRadius,
    overflow: "hidden",
    backgroundColor: premiumColors.ink,
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
    backgroundColor: "rgba(16, 24, 32, 0.18)",
  },

  imageShadeBottom: {
    ...StyleSheet.absoluteFill,
    top: undefined,
    height: "56%",
    backgroundColor: "rgba(16, 24, 32, 0.66)",
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
    backgroundColor: "rgba(255, 255, 255, 0.34)",
  },

  activePhotoDot: {
    backgroundColor: "#FFF",
  },

  expandButton: {
    position: "absolute",
    top: 28,
    right: 16,
    borderRadius: 999,
    backgroundColor: "rgba(16, 24, 32, 0.52)",
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
    fontSize: isCompactViewport ? 30 : Platform.OS === "web" ? 31 : 34,
    fontWeight: "800",
  },

  matchMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },

  matchMeta: {
    color: "rgba(255, 255, 255, 0.82)",
    fontSize: 13,
    fontWeight: "700",
  },

  intentPill: {
    color: premiumColors.champagneSoft,
    fontSize: 11,
    fontWeight: "900",
    backgroundColor: "rgba(199, 167, 108, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(199, 167, 108, 0.38)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
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

  floatingActions: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: isCompactViewport ? -32 : -36,
    zIndex: 12,
    gap: 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },

  actionButton: {
    width: isCompactViewport ? 52 : 58,
    height: isCompactViewport ? 52 : 58,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
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
    backgroundColor: premiumColors.white,
  },

  passText: {
    color: premiumColors.muted,
    fontSize: 30,
    lineHeight: 32,
    fontWeight: "300",
  },

  saveButton: {
    backgroundColor: premiumColors.white,
  },

  saveText: {
    color: premiumColors.champagne,
    fontSize: 26,
    lineHeight: 28,
  },

  connectIcon: {
    width: isCompactViewport ? 34 : 36,
    height: isCompactViewport ? 34 : 36,
    resizeMode: "contain",
  },

  toast: {
    alignSelf: "center",
    minHeight: 44,
    borderRadius: 18,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: premiumColors.white,
    borderWidth: 1,
    borderColor: premiumColors.hairline,
    ...premiumShadow,
  },

  reactionText: {
    textAlign: "center",
    color: premiumColors.ink,
    fontSize: 15,
    fontWeight: "800",
  },

  fullscreen: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.96)",
    alignItems: "center",
    justifyContent: "center",
  },

  fullscreenImage: {
    width: initialScreenWidth,
    height: "100%",
  },

  fullscreenImageWrap: {
    width: "100%",
    height: "76%",
  },

  fullscreenSlide: {
    width: initialScreenWidth,
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
