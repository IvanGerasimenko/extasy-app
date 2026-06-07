import { ThemedBackground } from "@/components/ThemedBackground";
import { datingColors, datingShadow } from "@/constants/datingDesign";
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
  Image,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

const systemFont = Platform.select({
  ios: "System",
  web: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif",
});

const systemFontBold = Platform.select({
  ios: "System",
  web: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif",
});

export default function ProfileScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const fullscreenCarouselRef = useRef<ScrollView | null>(null);
  let locationText =
    "Füge Stadt und Land hinzu, damit Menschen in deiner Nähe dich finden können.";
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
              <TouchableOpacity
                style={styles.avatarTapArea}
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
              <Text style={styles.bodyText}>
                Noch keine Interessen vorhanden.
              </Text>
            )}
          </View>
        </View>

        {photos.length ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📸 Fotos</Text>
            <View style={styles.photosGrid}>
              {photos.map((photo, index) => (
                <TouchableOpacity
                  key={`${photo}-${index}`}
                  style={styles.photoTile}
                  onPress={() => {
                    setPhotoIndex(index);
                    setFullscreenOpen(true);
                  }}
                >
                  <Image
                    source={{ uri: photo }}
                    style={[
                      styles.gridPhoto,
                      photoIndex === index && styles.activePhoto,
                    ]}
                  />
                </TouchableOpacity>
              ))}
            </View>
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
                <View
                  key={`${photo}-${index}`}
                  style={[styles.fullscreenSlide, { width: screenWidth }]}
                >
                  <Image
                    source={{ uri: photo }}
                    style={[styles.fullscreenImage, { width: screenWidth }]}
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
    backgroundColor: datingColors.background,
  },

  screen: {
    flex: 1,
  },

  container: {
    width: "100%",
    maxWidth: Platform.OS === "web" ? 760 : 560,
    alignSelf: "center",
    paddingTop: Platform.OS === "web" ? 34 : 58,
    paddingBottom: Platform.OS === "web" ? 150 : 136,
    paddingHorizontal: 26,
  },

  iconButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: datingColors.surface,
    borderWidth: 1,
    borderColor: datingColors.border,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
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
    color: datingColors.text,
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
    position: "relative",
    alignItems: "center",
    height: Platform.OS === "web" ? 620 : 510,
    marginTop: 4,
    marginBottom: 24,
    borderRadius: 32,
    backgroundColor: datingColors.surface,
    borderWidth: 1,
    borderColor: datingColors.border,
    padding: 0,
    overflow: "hidden",
    ...datingShadow,
  },

  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 0,
  },

  avatarTapArea: {
    width: "100%",
    height: "100%",
  },

  avatarWrap: {
    position: "absolute",
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    top: 0,
    left: 0,
    zIndex: 1,
  },

  photoCounter: {
    position: "absolute",
    top: 8,
    right: 8,
    borderRadius: 999,
    backgroundColor: "rgba(7, 16, 23, 0.72)",
    borderWidth: 1,
    paddingHorizontal: 10,
    height: 26,
    justifyContent: "center",
  },

  photoCounterText: {
    color: datingColors.text,
    fontSize: 11,
    fontFamily: systemFontBold,
  },

  avatarPlaceholder: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: datingColors.surfaceSoft,
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
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14,
    width: undefined,
    maxWidth: undefined,
    borderRadius: 26,
    backgroundColor: "rgba(7, 16, 23, 0.88)",
    borderWidth: 1,
    borderColor: datingColors.border,
    padding: 20,
    marginTop: 0,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.09,
    shadowRadius: 24,
    elevation: 8,
  },

  name: {
    color: datingColors.text,
    fontSize: 31,
    fontFamily: systemFontBold,
    fontWeight: "700",
    textAlign: "left",
  },

  meta: {
    marginTop: 6,
    color: datingColors.textMuted,
    fontSize: 15,
    fontFamily: systemFont,
    textAlign: "left",
  },

  summaryLocation: {
    marginTop: 12,
    color: datingColors.text,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: systemFont,
    textAlign: "left",
  },

  moodRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
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
    backgroundColor: datingColors.surfaceSoft,
    borderWidth: 1,
    borderColor: datingColors.border,
    overflow: "hidden",
  },

  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
    maxWidth: Platform.OS === "web" ? 760 : undefined,
    minWidth: 0,
  },

  statBox: {
    flex: 1,
    minWidth: 0,
    minHeight: 88,
    borderRadius: 26,
    backgroundColor: datingColors.surface,
    borderWidth: 1,
    borderColor: datingColors.border,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 7,
  },

  statNumber: {
    color: datingColors.text,
    fontSize: 24,
    fontFamily: systemFontBold,
    fontWeight: "700",
  },

  statLabel: {
    marginTop: 4,
    color: datingColors.textMuted,
    fontSize: 13,
    fontFamily: systemFont,
  },

  section: {
    width: "100%",
    minWidth: 0,
    marginTop: 16,
    maxWidth: Platform.OS === "web" ? 860 : undefined,
    borderRadius: 30,
    backgroundColor: datingColors.surface,
    borderWidth: 1,
    borderColor: datingColors.border,
    padding: 18,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 22,
    elevation: 7,
  },

  sectionTitle: {
    color: datingColors.text,
    fontSize: 18,
    fontFamily: systemFontBold,
    fontWeight: "700",
    marginBottom: 10,
  },

  bodyText: {
    color: datingColors.textMuted,
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
    backgroundColor: datingColors.surfaceSoft,
    borderWidth: 1,
    borderColor: datingColors.border,
  },

  tagText: {
    color: "#FFF",
    fontSize: 13,
    fontFamily: systemFontBold,
    fontWeight: "700",
  },

  photosGrid: {
    width: "100%",
    minWidth: 0,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },

  photoTile: {
    width: "32%",
    minWidth: 0,
    aspectRatio: 1,
  },

  gridPhoto: {
    width: "100%",
    height: "100%",
    borderRadius: 14,
  },

  activePhoto: {
    borderWidth: 2,
    borderColor: datingColors.accent,
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
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },

  fullscreenImage: {
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
