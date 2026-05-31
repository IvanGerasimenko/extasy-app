import {
  getLikedUserKeysForCurrentUser,
  getLocalAccountUsers,
  getSessionUser,
  getUserKey,
  recordProfileLike,
  type SessionUser,
} from "@/services/auth/session";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ImageSourcePropType,
} from "react-native";

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

export default function DiscoverScreen() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [deck, setDeck] = useState<DiscoverProfile[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [reaction, setReaction] = useState("");
  const [matchChatId, setMatchChatId] = useState<string | null>(null);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

  const activeMatch = useMemo(
    () => deck[activeIndex] ?? null,
    [activeIndex, deck],
  );

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
      const discoverProfiles = localUsers
        .filter((localUser) => hasCompleteProfile(localUser))
        .filter((localUser) => !isSameUser(localUser, sessionUser))
        .filter((localUser) => isCompatibleMatch(sessionUser, localUser))
        .filter((localUser) => isNearbyProfile(sessionUser, localUser))
        .filter((localUser) => !likedUserKeys.includes(getUserKey(localUser)))
        .map(profileFromUser);

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

  async function handleDecision(nextReaction: string) {
    setReaction(nextReaction);
    setMatchChatId(null);

    if (nextReaction === "Liked" && activeMatch) {
      let likeResult = null;

      try {
        likeResult = await recordProfileLike(activeMatch.user);
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
        setReaction(`It's a match with ${activeMatch.name}`);
        setMatchChatId(likeResult.match.id);
      } else {
        setReaction(`${activeMatch.name} received your like`);
      }
    }

    setPhotoIndex(0);
    setActiveIndex((currentIndex) => currentIndex + 1);
  }

  function resetDeck() {
    if (!user) {
      return;
    }

    getLocalAccountUsers().then(async (localUsers) => {
      const likedUserKeys = await getLikedUserKeysForCurrentUser();
      const discoverProfiles = localUsers
        .filter((localUser) => hasCompleteProfile(localUser))
        .filter((localUser) => !isSameUser(localUser, user))
        .filter((localUser) => isCompatibleMatch(user, localUser))
        .filter((localUser) => isNearbyProfile(user, localUser))
        .filter((localUser) => !likedUserKeys.includes(getUserKey(localUser)))
        .map(profileFromUser);

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
      <ImageBackground
        source={require("../../../assets/bg.png")}
        style={styles.background}
        resizeMode="cover"
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
      resizeMode="cover"
    >
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
        </View>

        {activeMatch ? (
          <View key={activeMatch.id} style={styles.matchCard}>
            <Image
              source={activeMatch.photos[photoIndex] ?? activeMatch.photos[0]}
              style={styles.profileImage}
            />
            <View style={styles.imageShade} />

            <TouchableOpacity
              style={styles.expandButton}
              onPress={() => setFullscreenOpen(true)}
            >
              <Text style={styles.expandText}>Open Photo</Text>
            </TouchableOpacity>

            {activeMatch.photos.length > 1 ? (
              <>
                <TouchableOpacity
                  style={[styles.photoNavButton, styles.photoNavLeft]}
                  onPress={() => changePhoto(-1)}
                >
                  <Text style={styles.photoNavText}>‹</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.photoNavButton, styles.photoNavRight]}
                  onPress={() => changePhoto(1)}
                >
                  <Text style={styles.photoNavText}>›</Text>
                </TouchableOpacity>
                <View style={styles.photoCounter}>
                  <Text style={styles.photoCounterText}>
                    {photoIndex + 1} / {activeMatch.photos.length}
                  </Text>
                </View>
              </>
            ) : null}

            <View style={styles.matchInfo}>
              <View style={styles.matchTopRow}>
                <Text style={styles.matchName}>
                  {activeMatch.name}, {activeMatch.age}
                </Text>
                <View style={styles.onlineBadge}>
                  <Text style={styles.onlineText}>Online</Text>
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

              <Text style={styles.about}>{activeMatch.about}</Text>

              <View style={styles.tags}>
                {activeMatch.interests.slice(0, 6).map((interest) => (
                  <View key={interest} style={styles.tag}>
                    <Text style={styles.tagText}>{interest}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
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

        {activeMatch?.photos.length ? (
          <View style={styles.gallerySection}>
            <Text style={styles.sectionTitle}>Photos</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.galleryRow}
            >
              {activeMatch.photos.map((photo, index) => (
                <TouchableOpacity
                  key={`${activeMatch.id}-${index}`}
                  onPress={() => setPhotoIndex(index)}
                >
                  <Image
                    source={photo}
                    style={[
                      styles.galleryPhoto,
                      photoIndex === index && styles.activeGalleryPhoto,
                    ]}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : null}

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

      <View style={styles.floatingActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.passButton]}
          onPress={() => handleDecision("Passed for now")}
          disabled={!activeMatch}
        >
          <Text style={styles.passText}>×</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.likeButton]}
          onPress={() => handleDecision("Liked")}
          disabled={!activeMatch}
        >
          <Image
            source={require("../../../assets/lovesearch.png")}
            style={styles.likeIcon}
          />
        </TouchableOpacity>
      </View>

      <Modal visible={fullscreenOpen} transparent animationType="fade">
        <View style={styles.fullscreen}>
          <TouchableOpacity
            style={styles.fullscreenClose}
            onPress={() => setFullscreenOpen(false)}
          >
            <Text style={styles.fullscreenCloseText}>Close</Text>
          </TouchableOpacity>

          {activeMatch?.photos[photoIndex] ? (
            <Image
              source={activeMatch.photos[photoIndex]}
              style={styles.fullscreenImage}
              resizeMode="contain"
            />
          ) : null}

          {activeMatch && activeMatch.photos.length > 1 ? (
            <View style={styles.fullscreenControls}>
              <TouchableOpacity
                style={styles.fullscreenNav}
                onPress={() => changePhoto(-1)}
              >
                <Text style={styles.fullscreenNavText}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.fullscreenCounter}>
                {photoIndex + 1} / {activeMatch.photos.length}
              </Text>
              <TouchableOpacity
                style={styles.fullscreenNav}
                onPress={() => changePhoto(1)}
              >
                <Text style={styles.fullscreenNavText}>›</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </Modal>
    </ImageBackground>
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 22,
  },

  eyebrow: {
    color: "#6E6E73",
    fontSize: 13,
    letterSpacing: 0,
  },

  title: {
    fontSize: 36,
    color: "#111",
  },

  headerActions: {
    flexDirection: "row",
    gap: 10,
  },

  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.78)",
    alignItems: "center",
    justifyContent: "center",
  },

  headerIcon: {
    width: 22,
    height: 22,
  },

  matchCard: {
    height: 580,
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: "#111",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 14,
    },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 10,
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

  imageShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.18)",
  },

  photoNavButton: {
    position: "absolute",
    top: "45%",
    width: 44,
    height: 58,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.82)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },

  photoNavLeft: {
    left: 14,
  },

  photoNavRight: {
    right: 14,
  },

  photoNavText: {
    color: "#111",
    fontSize: 34,
    lineHeight: 38,
  },

  photoCounter: {
    position: "absolute",
    top: 16,
    alignSelf: "center",
    borderRadius: 999,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    paddingHorizontal: 12,
    height: 30,
    justifyContent: "center",
    zIndex: 2,
  },

  photoCounterText: {
    color: "#FFF",
    fontSize: 12,
  },

  expandButton: {
    position: "absolute",
    top: 16,
    alignSelf: "center",
    borderRadius: 999,
    backgroundColor: "rgba(0, 0, 0, 0.48)",
    paddingHorizontal: 14,
    height: 32,
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
    padding: 22,
    backgroundColor: "rgba(0, 0, 0, 0.15)",
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
    fontSize: 34,
  },

  onlineBadge: {
    backgroundColor: "#DDFCE7",
    borderRadius: 999,
    paddingHorizontal: 12,
    height: 30,
    justifyContent: "center",
  },

  onlineText: {
    color: "#126B36",
    fontSize: 12,
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
    lineHeight: 22,
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
    backgroundColor: "rgba(255, 255, 255, 0.9)",
  },

  tagText: {
    color: "#111",
    fontSize: 12,
  },

  floatingActions: {
    position: "absolute",
    right: 18,
    top: "43%",
    zIndex: 12,
    gap: 12,
    alignItems: "center",
  },

  gallerySection: {
    marginTop: 24,
  },

  sectionTitle: {
    color: "#111",
    fontSize: 18,
    marginBottom: 12,
  },

  galleryRow: {
    gap: 12,
    paddingRight: 4,
  },

  galleryPhoto: {
    width: 112,
    height: 136,
    borderRadius: 22,
    backgroundColor: "#E8E2DC",
  },

  activeGalleryPhoto: {
    borderWidth: 3,
    borderColor: "#111",
  },

  actionButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.9)",
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
    backgroundColor: "rgba(255, 255, 255, 0.84)",
  },

  likeButton: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#111",
  },

  passText: {
    color: "#111",
    fontSize: 30,
    lineHeight: 32,
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
    width: "100%",
    height: "76%",
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

  fullscreenControls: {
    position: "absolute",
    bottom: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
  },

  fullscreenNav: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    alignItems: "center",
    justifyContent: "center",
  },

  fullscreenNavText: {
    color: "#FFF",
    fontSize: 36,
    lineHeight: 40,
  },

  fullscreenCounter: {
    color: "#FFF",
    fontSize: 15,
  },
});
