import BottomMenu from "@/components/BottomMenu";
import { PremiumEmptyState, PremiumLoadingState } from "@/components/PremiumUI";
import { ThemedBackground } from "@/components/ThemedBackground";
import { datingColors, datingShadow } from "@/constants/datingDesign";
import {
  getCountryLabel,
  getGenderLabel,
  getInterestLabel,
  getLookingForLabel,
} from "@/constants/germanLabels";
import { premiumColors, premiumShadow } from "@/constants/premiumDesign";
import {
  getLocalAccountUsers,
  getUserKey,
  type SessionUser,
} from "@/services/auth/session";
import { router, useLocalSearchParams } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
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
    [
      clampTranslation,
      height,
      scale,
      setZoomed,
      translateX,
      translateY,
      width,
    ],
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

export default function UserProfileScreen() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { userKey } = useLocalSearchParams<{ userKey?: string }>();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [fullscreenWidth, setFullscreenWidth] = useState(screenWidth);
  const [fullscreenZoomed, setFullscreenZoomed] = useState(false);
  const fullscreenCarouselRef = useRef<ScrollView | null>(null);

  const photos = useMemo(() => {
    if (!user) {
      return [];
    }

    return user.photos?.length
      ? user.photos
      : user.picture
        ? [user.picture]
        : [];
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

    const nextIndex =
      (photoIndex + direction + photos.length) % photos.length;
    setPhotoIndex(nextIndex);
    fullscreenCarouselRef.current?.scrollTo({
      x: nextIndex * fullscreenWidth,
      animated: true,
    });
  }

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

    async function loadUser() {
      const users = await getLocalAccountUsers();
      const foundUser = users.find((item) => getUserKey(item) === userKey);

      if (!isMounted) {
        return;
      }

      setUser(foundUser ?? null);
      setIsLoading(false);
    }

    loadUser();

    return () => {
      isMounted = false;
    };
  }, [userKey]);

  if (isLoading) {
    return (
      <ThemedBackground style={styles.background}>
        <PremiumLoadingState label="Profil wird geladen" />
      </ThemedBackground>
    );
  }

  return (
    <ThemedBackground style={styles.background}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => router.back()}
        >
          <Text style={styles.navText}>‹</Text>
        </TouchableOpacity>

        {!user ? (
          <PremiumEmptyState
            title="Profil nicht gefunden"
            text="Dieses Profil ist nicht mehr verfügbar."
          />
        ) : (
          <>
            <View style={styles.heroCard} {...swipeResponder.panHandlers}>
              {photos[0] ? (
                <TouchableOpacity
                  activeOpacity={0.94}
                  style={styles.photoTapArea}
                  onPress={() => openFullscreen()}
                >
                  <Image
                    source={{ uri: photos[photoIndex] ?? photos[0] }}
                    style={styles.heroImage}
                  />
                </TouchableOpacity>
              ) : null}
              <View pointerEvents="none" style={styles.heroShade} />

              {photos.length > 1 ? (
                <View style={styles.photoCounter}>
                  <Text style={styles.photoCounterText}>
                    {photoIndex + 1} / {photos.length}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.heroCopy}>
              <View style={styles.heroCopyContent}>
                <Text style={styles.name} numberOfLines={3}>
                  {user.name}
                  {user.age ? `, ${user.age}` : ""}
                </Text>
                <Text style={styles.meta}>
                  {getGenderLabel(user.gender)} sucht{" "}
                  {getLookingForLabel(user.lookingFor)}
                </Text>
                {user.city && user.country ? (
                  <Text style={styles.locationText}>
                    {user.city}, {getCountryLabel(user.country)}
                  </Text>
                ) : null}
              </View>
            </View>

            {user.city && user.country ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Standort</Text>
                <Text style={styles.bodyText}>
                  {user.city}, {getCountryLabel(user.country + "  📍")}
                </Text>
              </View>
            ) : null}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Über mich</Text>
              <Text style={styles.bodyText}>{user.about}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Interessen</Text>
              <View style={styles.tags}>
                {user.interests?.map((interest) => (
                  <View key={interest} style={styles.interestTag}>
                    <Text style={styles.interestTagText}>
                      {getInterestLabel(interest)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {photos.length ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Fotos</Text>
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
          </>
        )}
      </ScrollView>

      <BottomMenu />

      <Modal visible={fullscreenOpen} transparent animationType="fade">
        <GestureHandlerRootView
          nativeID="user-profile-fullscreen"
          style={styles.fullscreen}
        >
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

  container: {
    width: "100%",
    marginBottom: Platform.OS === "web" ? 30 : 20,
    minWidth: 0,
    maxWidth: Platform.OS === "web" ? 760 : 560,
    alignSelf: "center",
    paddingHorizontal: Platform.OS === "web" ? 34 : 20,
    paddingTop: Platform.OS === "web" ? 34 : 64,
    paddingBottom: Platform.OS === "web" ? 150 : 170,
  },

  navButton: {
    width: 44,
    height: 44,
    alignSelf: "flex-start",
    borderRadius: 18,
    backgroundColor: datingColors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },

  navText: {
    color: datingColors.text,
    fontSize: 34,
    lineHeight: 36,
    fontFamily: systemFontBold,
  },

  heroCard: {
    width: "100%",
    minWidth: 0,
    height: Platform.OS === "web" ? 590 : 470,
    maxWidth: Platform.OS === "web" ? 760 : undefined,
    borderRadius: 30,
    overflow: "hidden",
    backgroundColor: datingColors.surface,
    ...datingShadow,
  },

  heroImage: {
    ...StyleSheet.absoluteFill,
    width: "100%",
    height: "100%",
  },

  photoTapArea: {
    ...StyleSheet.absoluteFill,
  },

  heroShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(3, 8, 12, 0.18)",
  },

  heroCopy: {
    width: "100%",
    minWidth: 0,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    backgroundColor: "rgba(7, 16, 23, 0.88)",
    borderWidth: 1,
    borderColor: datingColors.border,
    padding: 10,
    marginTop: -100,
    marginBottom: 20,
    zIndex: 4,
    ...datingShadow,
  },

  heroCopyContent: {
    flex: 1,
    minWidth: 0,
    maxWidth: "100%",
  },

  name: {
    color: datingColors.text,
    fontSize: Platform.OS === "web" ? 30 : 28,
    lineHeight: Platform.OS === "web" ? 36 : 34,
    fontFamily: systemFontBold,
    fontWeight: "700",
    flexShrink: 1,
    maxWidth: "100%",
  },

  meta: {
    color: datingColors.textMuted,
    fontSize: 15,
    fontFamily: systemFont,
    marginTop: 8,
  },

  locationText: {
    color: datingColors.text,
    fontSize: 14,
    fontFamily: systemFont,
    marginTop: 8,
  },

  photoCounter: {
    position: "absolute",
    top: 16,
    right: 16,
    minWidth: 54,
    height: 32,
    backgroundColor: "rgba(7, 16, 23, 0.72)",
    borderRadius: 999,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },

  photoCounterText: {
    color: "#FFF",
    fontSize: 12,
    fontFamily: systemFontBold,
  },

  section: {
    width: "100%",
    minWidth: 0,
    marginTop: 22,
    maxWidth: Platform.OS === "web" ? 860 : undefined,
    borderRadius: 24,
    backgroundColor: datingColors.surface,
    borderWidth: 1,
    borderColor: datingColors.border,
    padding: 16,
    ...datingShadow,
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

  interestTag: {
    minHeight: 40,
    borderRadius: 20,
    paddingHorizontal: 14,
    backgroundColor: datingColors.surfaceSoft,
    borderWidth: 1,
    borderColor: datingColors.border,
    alignItems: "center",
    justifyContent: "center",
  },

  interestTagText: {
    color: datingColors.text,
    fontSize: 13,
    fontWeight: "800",
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
    backgroundColor: datingColors.surfaceSoft,
  },

  activePhoto: {
    borderWidth: 3,
    borderColor: datingColors.accent,
  },

  compatibilityBlock: {
    marginTop: 18,
    maxWidth: Platform.OS === "web" ? 860 : undefined,
    borderRadius: 26,
    backgroundColor: datingColors.surface,
    padding: 18,
    ...premiumShadow,
  },

  compatibilityTitle: {
    color: premiumColors.white,
    fontSize: 20,
    fontFamily: systemFontBold,
    fontWeight: "800",
  },

  compatibilityText: {
    color: "rgba(255, 255, 255, 0.74)",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },

  compatibilityTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    marginTop: 16,
  },

  compatibilityFill: {
    width: "86%",
    height: "100%",
    borderRadius: 4,
    backgroundColor: datingColors.accent,
  },

  starterCard: {
    borderRadius: 18,
    backgroundColor: datingColors.surfaceSoft,
    borderWidth: 1,
    borderColor: datingColors.border,
    padding: 14,
    marginTop: 10,
  },

  starterText: {
    color: datingColors.text,
    fontSize: 14,
    fontFamily: systemFontBold,
  },

  stickyAction: {
    position: "absolute",
    left: Platform.OS === "web" ? 0 : 20,
    right: Platform.OS === "web" ? undefined : 20,
    width: Platform.OS === "web" ? 420 : undefined,
    alignSelf: Platform.OS === "web" ? "center" : undefined,
    bottom: 92,
    zIndex: 18,
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
});
