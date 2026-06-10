import { ThemedBackground } from "@/components/ThemedBackground";
import { datingColors, datingShadow } from "@/constants/datingDesign";
import {
  getCountryLabel,
  getGenderLabel,
  getInterestLabel,
  getLookingForLabel,
} from "@/constants/Labels";
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
  Animated,
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
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";

const systemFont = Platform.select({
  ios: "System",
  web: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif",
});

const systemFontBold = Platform.select({
  ios: "System",
  web: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif",
});

function ZoomableFullscreenImage({
  uri,
  width,
  height,
  onZoomChange,
}: {
  uri: string;
  width: number;
  height: number;
  onZoomChange: (isZoomed: boolean) => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const currentScale = useRef(1);
  const currentTranslateX = useRef(0);
  const currentTranslateY = useRef(0);
  const pinchStartScale = useRef(1);
  const panStartX = useRef(0);
  const panStartY = useRef(0);
  const [isZoomed, setIsZoomed] = useState(false);

  const setZoomed = useCallback(
    (nextZoomed: boolean) => {
      setIsZoomed(nextZoomed);
      onZoomChange(nextZoomed);
    },
    [onZoomChange],
  );

  const clampTranslation = useCallback(
    (value: number, axisSize: number, nextScale = currentScale.current) => {
      const limit = Math.max(0, (axisSize * (nextScale - 1)) / 2);
      return Math.min(limit, Math.max(-limit, value));
    },
    [],
  );

  const animateScale = useCallback(
    (nextScale: number) => {
      currentScale.current = nextScale;
      const nextZoomed = nextScale > 1.01;
      const nextX = nextZoomed
        ? clampTranslation(currentTranslateX.current, width, nextScale)
        : 0;
      const nextY = nextZoomed
        ? clampTranslation(currentTranslateY.current, height, nextScale)
        : 0;

      currentTranslateX.current = nextX;
      currentTranslateY.current = nextY;
      setZoomed(nextZoomed);
      Animated.parallel([
        Animated.spring(scale, {
          toValue: nextScale,
          friction: 8,
          tension: 90,
          useNativeDriver: true,
        }),
        Animated.spring(translateX, {
          toValue: nextX,
          friction: 8,
          tension: 90,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: nextY,
          friction: 8,
          tension: 90,
          useNativeDriver: true,
        }),
      ]).start();
    },
    [clampTranslation, height, scale, setZoomed, translateX, translateY, width],
  );

  const zoomGesture = useMemo(() => {
    const pinchGesture = Gesture.Pinch()
      .runOnJS(true)
      .onBegin(() => {
        pinchStartScale.current = currentScale.current;
      })
      .onUpdate((event) => {
        const nextScale = Math.min(
          4,
          Math.max(1, pinchStartScale.current * event.scale),
        );
        scale.setValue(nextScale);
        setZoomed(nextScale > 1.01);
      })
      .onEnd((event) => {
        const nextScale = Math.min(
          4,
          Math.max(1, pinchStartScale.current * event.scale),
        );
        animateScale(nextScale < 1.08 ? 1 : nextScale);
      });

    const panGesture = Gesture.Pan()
      .enabled(isZoomed)
      .runOnJS(true)
      .onBegin(() => {
        panStartX.current = currentTranslateX.current;
        panStartY.current = currentTranslateY.current;
      })
      .onUpdate((event) => {
        translateX.setValue(
          clampTranslation(panStartX.current + event.translationX, width),
        );
        translateY.setValue(
          clampTranslation(panStartY.current + event.translationY, height),
        );
      })
      .onEnd((event) => {
        currentTranslateX.current = clampTranslation(
          panStartX.current + event.translationX,
          width,
        );
        currentTranslateY.current = clampTranslation(
          panStartY.current + event.translationY,
          height,
        );
      });

    const doubleTapGesture = Gesture.Tap()
      .numberOfTaps(2)
      .runOnJS(true)
      .onEnd(() => {
        animateScale(currentScale.current > 1.01 ? 1 : 2.5);
      });

    return isZoomed
      ? Gesture.Simultaneous(pinchGesture, panGesture, doubleTapGesture)
      : Gesture.Simultaneous(pinchGesture, doubleTapGesture);
  }, [
    animateScale,
    clampTranslation,
    height,
    isZoomed,
    scale,
    setZoomed,
    translateX,
    translateY,
    width,
  ]);

  useEffect(() => {
    return () => onZoomChange(false);
  }, [onZoomChange]);

  return (
    <GestureDetector gesture={zoomGesture}>
      <Animated.View style={styles.zoomSurface}>
        <Animated.View
          style={[
            styles.zoomSurface,
            {
              transform: [{ translateX }, { translateY }, { scale }],
            },
          ]}
        >
          <Image
            source={{ uri }}
            style={[styles.fullscreenImage, { width }]}
            resizeMode="contain"
          />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

export default function ProfileScreen() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [fullscreenWidth, setFullscreenWidth] = useState(screenWidth);
  const [fullscreenZoomed, setFullscreenZoomed] = useState(false);
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

  function openFullscreen(index = photoIndex) {
    const viewportWidth =
      Platform.OS === "web" && typeof window !== "undefined"
        ? (window.visualViewport?.width ?? window.innerWidth)
        : screenWidth;

    setPhotoIndex(index);
    setFullscreenWidth(viewportWidth);
    setFullscreenZoomed(false);
    setFullscreenOpen(true);
  }

  function showFullscreenPhoto(direction: -1 | 1) {
    if (fullscreenZoomed || photos.length < 2) {
      return;
    }

    const nextIndex = (photoIndex + direction + photos.length) % photos.length;
    setPhotoIndex(nextIndex);
    fullscreenCarouselRef.current?.scrollTo({
      x: nextIndex * fullscreenWidth,
      animated: true,
    });
  }

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
          x: photoIndex * fullscreenWidth,
          animated: false,
        });
      });

      return () => cancelAnimationFrame(frame);
    }
  }, [fullscreenOpen, fullscreenWidth, photoIndex]);

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
    <ThemedBackground nativeID="profile-screen" style={styles.background}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topbar}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push("/onboarding?edit=1")}
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
                onPress={() => openFullscreen()}
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
            <View style={styles.avatarWrap}>
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {user?.name?.slice(0, 1).toUpperCase() ?? "E"}
                </Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.name}>
            {user?.name ?? "Dein Profil"}
            {user?.age ? `, ${user.age}` : ""}
          </Text>
          <Text style={styles.meta}>
              {getGenderLabel(user?.gender) || "Profil"} sucht{" "}
              {user?.lookingFor?.length
                ? user.lookingFor.map((value) => getLookingForLabel(value)).join(", ")
                : "Matches"}
            </Text>
          <Text style={styles.summaryLocation}>{locationText}</Text>
          <View style={styles.moodRow}>
            <Text style={styles.moodChip}>🩶</Text>
            <Text style={styles.moodChip}>🌙</Text>
            <Text style={styles.moodChip}>☕️</Text>
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
                  onPress={() => openFullscreen(index)}
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
        <GestureHandlerRootView
          nativeID="profile-fullscreen"
          style={styles.fullscreen}
        >
          <TouchableOpacity
            style={styles.fullscreenClose}
            onPress={() => setFullscreenOpen(false)}
          >
            <Text style={styles.fullscreenCloseText}>✖️</Text>
          </TouchableOpacity>

          {photos.length ? (
            <ScrollView
              ref={fullscreenCarouselRef}
              horizontal
              pagingEnabled
              scrollEnabled={!fullscreenZoomed}
              bounces={false}
              decelerationRate="fast"
              showsHorizontalScrollIndicator={false}
              style={styles.fullscreenImageWrap}
              contentOffset={{ x: photoIndex * fullscreenWidth, y: 0 }}
              onMomentumScrollEnd={(event) => {
                const nextIndex = Math.round(
                  event.nativeEvent.contentOffset.x / fullscreenWidth,
                );

                if (nextIndex >= 0 && nextIndex < photos.length) {
                  setPhotoIndex(nextIndex);
                }
              }}
            >
              {photos.map((photo, index) => (
                <View
                  key={`${photo}-${index}`}
                  style={[styles.fullscreenSlide, { width: fullscreenWidth }]}
                >
                  <ZoomableFullscreenImage
                    uri={photo}
                    width={fullscreenWidth}
                    height={screenHeight * 0.76}
                    onZoomChange={
                      index === photoIndex
                        ? setFullscreenZoomed
                        : () => undefined
                    }
                  />
                </View>
              ))}
            </ScrollView>
          ) : null}

          {photos.length > 1 && !fullscreenZoomed ? (
            <>
              <TouchableOpacity
                style={[styles.fullscreenArrow, styles.fullscreenArrowLeft]}
                onPress={() => showFullscreenPhoto(-1)}
              >
                <Text style={styles.fullscreenArrowText}>‹</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.fullscreenArrow, styles.fullscreenArrowRight]}
                onPress={() => showFullscreenPhoto(1)}
              >
                <Text style={styles.fullscreenArrowText}>›</Text>
              </TouchableOpacity>
            </>
          ) : null}

          {photos.length > 1 ? (
            <View style={styles.fullscreenCounterWrap}>
              <Text style={styles.fullscreenCounter}>
                {photoIndex + 1} / {photos.length}
              </Text>
            </View>
          ) : null}
        </GestureHandlerRootView>
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
    height: Platform.OS === "web" ? 300 : 230,
    marginTop: 4,
    marginBottom: Platform.OS === "web" ? 104 : 88,
    borderRadius: 32,
    overflow: "visible",
  },

  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 999,
    borderColor: "#ffffff",
    borderWidth: 3,
  },

  avatarTapArea: {
    width: "100%",
    height: "100%",
    borderRadius: 999,
    overflow: "hidden",
  },

  avatarWrap: {
    position: "absolute",
    width: Platform.OS === "web" ? 210 : 170,
    height: Platform.OS === "web" ? 210 : 170,
    alignItems: "center",
    justifyContent: "center",
    left: "50%",
    transform: [{ translateX: Platform.OS === "web" ? -105 : -85 }],
    bottom: Platform.OS === "web" ? -82 : -68,
    zIndex: 1,
    borderRadius: 999,
    borderWidth: Platform.OS === "web" ? 7 : 6,
    borderColor: datingColors.background,
    backgroundColor: datingColors.surfaceSoft,
    ...datingShadow,
  },

  photoCounter: {
    position: "absolute",
    top: 8,
    right: 8,
    borderRadius: 999,
    backgroundColor: "rgba(7, 16, 23, 0.95)",
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
    width: "100%",
    height: "100%",
    borderRadius: 999,
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
    width: "100%",
    borderRadius: 26,
    backgroundColor: datingColors.surface,
    borderWidth: 1,
    borderColor: datingColors.border,
    padding: 20,
    marginBottom: 24,
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

  zoomSurface: {
    width: "100%",
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

  fullscreenArrow: {
    position: "absolute",
    top: "50%",
    zIndex: 3,
    width: 48,
    height: 56,
    marginTop: -28,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    alignItems: "center",
    justifyContent: "center",
  },

  fullscreenArrowLeft: {
    left: 14,
  },

  fullscreenArrowRight: {
    right: 14,
  },

  fullscreenArrowText: {
    color: "#FFF",
    fontSize: 42,
    lineHeight: 46,
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
