import { ThemedBackground } from "@/components/ThemedBackground";
import { getSessionUser, type SessionUser } from "@/services/auth/session";
import { router } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const screenWidth = Dimensions.get("window").width;

const systemFont = Platform.select({
  ios: "System",
  web: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif",
});

const systemFontBold = Platform.select({
  ios: "System",
  web: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif",
});

export default function ProfileScreen() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const fullscreenCarouselRef = useRef<ScrollView | null>(null);
  let locationText = "Add your city and country so nearby people can find you.";
  if (user?.city && user?.country) {
    locationText = `${user.city}, ${user.country}`;
  }

  const photos = useMemo(() => {
    if (!user) {
      return [];
    }
    if (user.photos?.length) {
      return user.photos;
    }

    if (user.picture) {
      return [user.picture];
    }

    return [];
  }, [user]);

  const changePhoto = useCallback(
    (direction: -1 | 1) => {
      if (!photos.length) {
        return;
      }

      setPhotoIndex((currentIndex) => {
        const photoCount = photos.length;
        return (currentIndex + direction + photoCount) % photoCount;
      });
    },
    [photos.length],
  );

  const swipeResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => {
          const horizontalMove = Math.abs(gestureState.dx);
          const verticalMove = Math.abs(gestureState.dy);
          return (
            photos.length > 1 &&
            horizontalMove > 24 &&
            horizontalMove > verticalMove * 1.3
          );
        },
        onPanResponderRelease: (_, gestureState) => {
          if (Math.abs(gestureState.dx) < 45) {
            return;
          }

          changePhoto(gestureState.dx > 0 ? -1 : 1);
        },
      }),
    [changePhoto, photos.length],
  );

  useEffect(() => {
    if (fullscreenOpen) {
      const frame = requestAnimationFrame(() => {
        fullscreenCarouselRef.current?.scrollTo({
          x: photoIndex * screenWidth,
          animated: false,
        });
      });

      return () => cancelAnimationFrame(frame);
    }
  }, [fullscreenOpen, photoIndex]);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      const sessionUser = await getSessionUser();

      if (!isMounted) {
        return;
      }

      if (!sessionUser) {
        router.replace("/welcome");
        return;
      }

      setUser(sessionUser);
      setIsLoading(false);
    }

    loadProfile();

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
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topbar}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push("/onboarding")}
          >
            <Image
              source={require("../../../assets/edit.png")}
              style={styles.iconImage}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.hero}>
          {photos[0] ? (
            <View style={styles.avatarWrap} {...swipeResponder.panHandlers}>
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => setFullscreenOpen(true)}
              >
                <Image
                  source={{ uri: photos[photoIndex] ?? photos[0] }}
                  style={styles.avatar}
                />
              </TouchableOpacity>
              {photos.length > 1 ? (
                <View style={styles.photoCounter}>
                  <Text style={styles.photoCounterText}>
                    {photoIndex + 1} / {photos.length}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>
                {user?.name?.slice(0, 1).toUpperCase() ?? "E"}
              </Text>
            </View>
          )}

          <View style={styles.summaryCard}>
            <Text style={styles.name}>
              {user?.name ?? "Your profile"}
              {user?.age ? `, ${user.age}` : ""}
            </Text>
            <Text style={styles.meta}>
              {user?.gender ?? "Profile"} looking for{" "}
              {user?.lookingFor ?? "matches"}
            </Text>
            <Text style={styles.summaryLocation}>{locationText}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{user?.likesCount ?? 0}</Text>
            <Text style={styles.statLabel}>Likes</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{user?.matchesCount ?? 0}</Text>
            <Text style={styles.statLabel}>Matches</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{photos.length}</Text>
            <Text style={styles.statLabel}>Photos</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.bodyText}>
            {user?.about ??
              "Add a short bio so people know what makes you you."}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          <Text style={styles.bodyText}>
            {user?.city && user.country
              ? `${user.city}, ${user.country}`
              : "Add your city and country so nearby people can find you."}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Interests</Text>
          <View style={styles.tags}>
            {user?.interests?.length ? (
              user.interests.map((interest) => (
                <View key={interest} style={styles.tag}>
                  <Text style={styles.tagText}>{interest}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.bodyText}>No interests yet.</Text>
            )}
          </View>
        </View>

        {photos.length ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photos</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.photosRow}
            >
              {photos.map((photo, index) => (
                <TouchableOpacity
                  key={`${photo}-${index}`}
                  onPress={() => {
                    setPhotoIndex(index);
                    setFullscreenOpen(true);
                  }}
                >
                  <Image
                    source={{ uri: photo }}
                    style={[
                      styles.photo,
                      photoIndex === index && styles.activePhoto,
                    ]}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : null}
      </ScrollView>

      <Modal visible={fullscreenOpen} transparent animationType="fade">
        <View style={styles.fullscreen}>
          <TouchableOpacity
            style={styles.fullscreenClose}
            onPress={() => setFullscreenOpen(false)}
          >
            <Text style={styles.fullscreenCloseText}>Close</Text>
          </TouchableOpacity>

          {photos.length ? (
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

                if (nextIndex >= 0 && nextIndex < photos.length) {
                  setPhotoIndex(nextIndex);
                }
              }}
            >
              {photos.map((photo, index) => (
                <View key={`${photo}-${index}`} style={styles.fullscreenSlide}>
                  <Image
                    source={{ uri: photo }}
                    style={styles.fullscreenImage}
                    resizeMode="contain"
                  />
                </View>
              ))}
            </ScrollView>
          ) : null}

          {photos.length > 1 ? (
            <View style={styles.fullscreenCounterWrap}>
              <Text style={styles.fullscreenCounter}>
                {photoIndex + 1} / {photos.length}
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
    maxWidth: Platform.OS === "web" ? 860 : 560,
    alignSelf: "center",
    paddingHorizontal: Platform.OS === "web" ? 34 : 20,
    paddingTop: Platform.OS === "web" ? 34 : 64,
    paddingBottom: Platform.OS === "web" ? 150 : 120,
  },

  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.78)",
    alignItems: "center",
    justifyContent: "center",
  },

  iconImage: {
    width: 22,
    height: 22,
    resizeMode: "contain",
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  topbar: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },

  topbarButton: {
    height: 42,
    borderRadius: 16,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255, 255, 255, 0.78)",
    justifyContent: "center",
  },

  topbarText: {
    color: "#111",
    fontSize: 14,
    fontFamily: systemFontBold,
  },

  hero: {
    alignItems: Platform.OS === "web" ? "flex-start" : "center",
    marginTop: 16,
    marginBottom: 24,
  },

  avatar: {
    width: Platform.OS === "web" ? 220 : 150,
    height: Platform.OS === "web" ? 220 : 150,
    borderRadius: Platform.OS === "web" ? 28 : 64,
    backgroundColor: "#E8E2DC",
  },

  avatarWrap: {
    width: Platform.OS === "web" ? 240 : 168,
    height: Platform.OS === "web" ? 240 : 168,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    minWidth: Platform.OS === "web" ? undefined : "100%",
    borderRadius: Platform.OS === "web" ? 32 : 24,
    shadowColor: "#1E1306",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: Platform.OS === "web" ? 0.1 : 0,
    shadowRadius: 22,
  },

  photoCounter: {
    position: "absolute",
    top: 8,
    right: 8,
    borderRadius: 999,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    paddingHorizontal: 10,
    height: 26,
    justifyContent: "center",
  },

  photoCounterText: {
    color: "#FFF",
    fontSize: 11,
    fontFamily: systemFontBold,
  },

  avatarPlaceholder: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarInitial: {
    color: "#FFF",
    fontSize: 44,
    fontFamily: systemFontBold,
  },

  summaryCard: {
    width: "100%",
    maxWidth: Platform.OS === "web" ? 680 : undefined,
    borderRadius: 26,
    backgroundColor: "rgb(255, 255, 255)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.82)",
    padding: 18,
    marginTop: 16,
  },

  name: {
    color: "#111",
    fontSize: 31,
    fontFamily: systemFontBold,
    fontWeight: "700",
    textAlign: "center",
  },

  meta: {
    marginTop: 6,
    color: "#6E6E73",
    fontSize: 15,
    fontFamily: systemFont,
    textAlign: "center",
  },

  summaryLocation: {
    marginTop: 12,
    color: "#111",
    fontSize: 14,
    lineHeight: 20,
    fontFamily: systemFont,
    textAlign: "center",
  },

  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
    maxWidth: Platform.OS === "web" ? 760 : undefined,
  },

  statBox: {
    flex: 1,
    minHeight: 82,
    borderRadius: 18,
    backgroundColor: "rgb(255, 255, 255)",
    alignItems: "center",
    justifyContent: "center",
  },

  statNumber: {
    color: "#111",
    fontSize: 24,
    fontFamily: systemFontBold,
    fontWeight: "700",
  },

  statLabel: {
    marginTop: 4,
    color: "#6E6E73",
    fontSize: 13,
    fontFamily: systemFont,
  },

  section: {
    marginTop: 18,
    maxWidth: Platform.OS === "web" ? 860 : undefined,
    borderRadius: 24,
    backgroundColor: "rgb(255, 255, 255)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.82)",
    padding: 16,
  },

  sectionTitle: {
    color: "#111",
    fontSize: 18,
    fontFamily: systemFontBold,
    fontWeight: "700",
    marginBottom: 10,
  },

  bodyText: {
    color: "#111",
    fontSize: 15,
    lineHeight: 22,
    fontFamily: systemFont,
  },

  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  tag: {
    minHeight: 38,
    borderRadius: 999,
    paddingHorizontal: 14,
    justifyContent: "center",
    backgroundColor: "#111",
  },

  tagText: {
    color: "#FFF",
    fontSize: 13,
    fontFamily: systemFontBold,
    fontWeight: "700",
  },

  photosRow: {
    gap: 12,
    paddingRight: 4,
  },

  photo: {
    width: 118,
    height: 146,
    borderRadius: 22,
    backgroundColor: "#E8E2DC",
  },

  activePhoto: {
    borderWidth: 3,
    borderColor: "#111",
  },

  fullscreen: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.96)",
    alignItems: "center",
    justifyContent: "center",
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

  fullscreenImage: {
    width: screenWidth,
    height: "100%",
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
    fontFamily: systemFontBold,
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
    fontFamily: systemFontBold,
  },

  primaryButton: {
    height: 56,
    borderRadius: 18,
    backgroundColor: "#111",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 30,
  },

  primaryText: {
    color: "#FFF",
    fontSize: 16,
    fontFamily: systemFontBold,
  },

  secondaryButton: {
    height: 50,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.78)",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
  },

  secondaryText: {
    color: "#111",
    fontSize: 15,
    fontFamily: systemFontBold,
  },
});
