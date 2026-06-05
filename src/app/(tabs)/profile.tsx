import { ThemedBackground } from "@/components/ThemedBackground";
import {
  getCountryLabel,
  getGenderLabel,
  getInterestLabel,
  getLookingForLabel,
} from "@/constants/germanLabels";
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
  let locationText = "Füge Stadt und Land hinzu, damit Menschen in deiner Nähe dich finden können.";
  if (user?.city && user?.country) {
    locationText = `${user.city}, ${getCountryLabel(user.country)}`;
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
            <Text style={styles.editEmoji}>✎</Text>
            <Image
              source={require("../../../assets/edit.png")}
              style={styles.iconImage}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.hero}>
          {photos[0] ? (
            <View style={styles.avatarWrap} {...swipeResponder.panHandlers}>
              <TouchableOpacity onPress={() => setFullscreenOpen(true)}>
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
              {user?.name ?? "Dein Profil"}
              {user?.age ? `, ${user.age}` : ""}
            </Text>
            <Text style={styles.meta}>
              {getGenderLabel(user?.gender) || "Profil"} sucht{" "}
              {getLookingForLabel(user?.lookingFor) || "Matches"}
            </Text>
            <Text style={styles.summaryLocation}>{locationText}</Text>
            <View style={styles.moodRow}>
              <Text style={styles.moodChip}>🩶</Text>
              <Text style={styles.moodChip}>🌙</Text>
              <Text style={styles.moodChip}>☕️</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{user?.likesCount ?? 0}</Text>
            <Text style={styles.statLabel}>👍 Likes</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{user?.matchesCount ?? 0}</Text>
            <Text style={styles.statLabel}>👩‍❤️‍💋‍👨 Matches</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{photos.length}</Text>
            <Text style={styles.statLabel}>📸 Fotos</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🪞 Über mich</Text>
          <Text style={styles.bodyText}>
            {user?.about ??
              "Füge eine kurze Beschreibung hinzu, damit andere besser verstehen, wer du bist."}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📍 Standort</Text>
          <Text style={styles.bodyText}>
            {user?.city && user.country
              ? `${user.city}, ${getCountryLabel(user.country)}`
              : "Füge Stadt und Land hinzu, damit Menschen in deiner Nähe dich finden können."}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💫 Interessen</Text>
          <View style={styles.tags}>
            {user?.interests?.length ? (
              user.interests.map((interest) => (
                <View key={interest} style={styles.tag}>
                  <Text style={styles.tagText}>
                    {getInterestLabel(interest)}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.bodyText}>Noch keine Interessen vorhanden.</Text>
            )}
          </View>
        </View>

        {photos.length ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📸 Fotos</Text>
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
            <Text style={styles.fullscreenCloseText}>Schließen</Text>
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
    maxWidth: Platform.OS === "web" ? 900 : 560,
    alignSelf: "center",
    paddingTop: Platform.OS === "web" ? 34 : 58,
    paddingBottom: Platform.OS === "web" ? 150 : 136,
  },

  iconButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255, 255, 255, 0.48)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.78)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#101820",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
  },

  iconImage: {
    position: "absolute",
    width: 18,
    height: 18,
    resizeMode: "contain",
    opacity: 0,
  },

  editEmoji: {
    color: "#101820",
    fontSize: 25,
    fontFamily: systemFontBold,
    lineHeight: 28,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  topbar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 12,
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
    alignItems: "center",
    marginTop: 4,
    marginBottom: 24,
    borderRadius: 38,
    backgroundColor: "rgba(255, 255, 255, 0.34)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.72)",
    padding: Platform.OS === "web" ? 24 : 16,
    overflow: "hidden",
    shadowColor: "#101820",
    shadowOffset: { width: 0, height: 26 },
    shadowRadius: 38,
    elevation: 14,
  },

  avatar: {
    width: Platform.OS === "web" ? 236 : 184,
    height: Platform.OS === "web" ? 236 : 184,
    borderRadius: Platform.OS === "web" ? 40 : 900,
    borderWidth: 2,
    borderColor: "rgba(228, 205, 255, 0.8)",
  },

  avatarWrap: {
    width: Platform.OS === "web" ? 262 : 214,
    height: Platform.OS === "web" ? 262 : 214,
    alignItems: "center",
    justifyContent: "center",
    minWidth: Platform.OS === "web" ? undefined : "100%",
    shadowColor: "#101820",
    shadowOffset: { width: 0, height: 18 },
    position: "relative",
    top: Platform.OS === "web" ? -12 : 50,
    elevation: 10,
    zIndex: 1,
  },

  photoCounter: {
    position: "absolute",
    top: 8,
    right: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.56)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.76)",
    paddingHorizontal: 10,
    height: 26,
    justifyContent: "center",
  },

  photoCounterText: {
    color: "#101820",
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

  floatingEmoji: {
    position: "absolute",
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(255, 255, 255, 0.56)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.8)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#101820",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.13,
    shadowRadius: 18,
    elevation: 8,
  },

  floatingEmojiTop: {
    top: 20,
    left: Platform.OS === "web" ? -16 : 18,
  },

  floatingEmojiBottom: {
    right: Platform.OS === "web" ? -14 : 18,
    bottom: 24,
  },

  floatingEmojiText: {
    fontSize: 23,
    lineHeight: 28,
  },

  avatarInitial: {
    color: "#FFF",
    fontSize: 44,
    fontFamily: systemFontBold,
  },

  summaryCard: {
    width: "100%",
    maxWidth: Platform.OS === "web" ? 680 : undefined,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.76)",
    padding: 20,
    marginTop: 18,
    shadowColor: "#101820",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.09,
    shadowRadius: 24,
    elevation: 8,
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

  moodRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginTop: 16,
  },

  moodChip: {
    width: 42,
    height: 42,
    borderRadius: 21,
    textAlign: "center",
    lineHeight: 40,
    fontSize: 21,
    backgroundColor: "rgba(255, 255, 255, 0.58)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.82)",
    overflow: "hidden",
  },

  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
    maxWidth: Platform.OS === "web" ? 760 : undefined,
  },

  statBox: {
    flex: 1,
    minHeight: 88,
    borderRadius: 26,
    backgroundColor: "rgba(255, 255, 255, 0.46)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.76)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#101820",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 7,
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
    marginTop: 16,
    maxWidth: Platform.OS === "web" ? 860 : undefined,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.46)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.76)",
    padding: 18,
    shadowColor: "#101820",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 22,
    elevation: 7,
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
    backgroundColor: "rgba(16, 24, 32, 0.78)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
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
