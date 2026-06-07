import BottomMenu from "@/components/BottomMenu";
import {
  PremiumEmptyState,
  PremiumLoadingState,
  PremiumTag,
} from "@/components/PremiumUI";
import { ThemedBackground } from "@/components/ThemedBackground";
import { premiumColors, premiumShadow } from "@/constants/premiumDesign";
import {
  getCountryLabel,
  getGenderLabel,
  getInterestLabel,
  getLookingForLabel,
} from "@/constants/germanLabels";
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

export default function UserProfileScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const { userKey } = useLocalSearchParams<{ userKey?: string }>();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
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
                  onPress={() => setFullscreenOpen(true)}
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
                  <PremiumTag
                    key={interest}
                    label={getInterestLabel(interest)}
                    tone="emerald"
                  />
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
          </>
        )}
      </ScrollView>

      <BottomMenu />

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
  },

  container: {
    width: "100%",
    minWidth: 0,
    maxWidth: Platform.OS === "web" ? 860 : 560,
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
    backgroundColor: premiumColors.white,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },

  navText: {
    color: premiumColors.ink,
    fontSize: 34,
    lineHeight: 36,
    fontFamily: systemFontBold,
  },

  heroCard: {
    width: "100%",
    minWidth: 0,
    height: Platform.OS === "web" ? 420 : 340,
    maxWidth: Platform.OS === "web" ? 760 : undefined,
    borderRadius: 30,
    overflow: "hidden",
    backgroundColor: premiumColors.navy,
    ...premiumShadow,
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
    backgroundColor: "rgba(16, 24, 32, 0.10)",
  },

  heroCopy: {
    width: "100%",
    minWidth: 0,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    backgroundColor: "rgba(255, 252, 247)",
    padding: 18,
    marginTop: 30,
  },

  heroCopyContent: {
    flex: 1,
    minWidth: 0,
    maxWidth: "100%",
  },

  name: {
    color: premiumColors.ink,
    fontSize: Platform.OS === "web" ? 30 : 28,
    lineHeight: Platform.OS === "web" ? 36 : 34,
    fontFamily: systemFontBold,
    fontWeight: "700",
    flexShrink: 1,
    maxWidth: "100%",
  },

  meta: {
    color: premiumColors.charcoal,
    fontSize: 15,
    fontFamily: systemFont,
    marginTop: 8,
  },

  locationText: {
    color: premiumColors.ink,
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
    backgroundColor: "rgba(16, 24, 32, 0.58)",
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
    backgroundColor: "rgba(255, 252, 247, 0.9)",
    borderWidth: 1,
    borderColor: premiumColors.hairline,
    padding: 16,
    ...premiumShadow,
  },

  sectionTitle: {
    color: premiumColors.ink,
    fontSize: 18,
    fontFamily: systemFontBold,
    fontWeight: "700",
    marginBottom: 10,
  },

  bodyText: {
    color: premiumColors.muted,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: systemFont,
  },

  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
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
    borderRadius: 10,
    backgroundColor: premiumColors.champagneSoft,
  },

  activePhoto: {
    borderWidth: 3,
    borderColor: premiumColors.champagne,
  },

  compatibilityBlock: {
    marginTop: 18,
    maxWidth: Platform.OS === "web" ? 860 : undefined,
    borderRadius: 26,
    backgroundColor: premiumColors.navy,
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
    backgroundColor: premiumColors.champagne,
  },

  starterCard: {
    borderRadius: 18,
    backgroundColor: premiumColors.navySoft,
    borderWidth: 1,
    borderColor: "#CEDAE5",
    padding: 14,
    marginTop: 10,
  },

  starterText: {
    color: premiumColors.navy,
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
});
