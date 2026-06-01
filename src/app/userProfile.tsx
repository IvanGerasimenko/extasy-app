import BottomMenu from "@/components/BottomMenu";
import {
  getLocalAccountUsers,
  getUserKey,
  type SessionUser,
} from "@/services/auth/session";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ImageBackground,
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

export default function UserProfileScreen() {
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

    return user.photos?.length ? user.photos : user.picture ? [user.picture] : [];
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
          return photos.length > 1 && horizontalMove > 24 && horizontalMove > verticalMove * 1.3;
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
      <ImageBackground source={require("../../assets/bg.png")} style={styles.background}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#111" />
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground source={require("../../assets/bg.png")} style={styles.background}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity style={styles.navButton} onPress={() => router.back()}>
          <Text style={styles.navText}>‹</Text>
        </TouchableOpacity>

        {!user ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Profile not found</Text>
          </View>
        ) : (
          <>
            <View style={styles.heroCard} {...swipeResponder.panHandlers}>
              {photos[0] ? (
                <Image
                  source={{ uri: photos[photoIndex] ?? photos[0] }}
                  style={styles.heroImage}
                />
              ) : null}
              <View style={styles.heroShade} />

              {photos.length > 1 ? (
                <View style={styles.photoCounter}>
                  <Text style={styles.photoCounterText}>
                    {photoIndex + 1} / {photos.length}
                  </Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={styles.expandButton}
                onPress={() => setFullscreenOpen(true)}
              >
                <Text style={styles.expandText}>Open Photo</Text>
              </TouchableOpacity>

              <View style={styles.heroCopy}>
                <Text style={styles.name}>
                  {user.name}, {user.age}
                </Text>
                <Text style={styles.meta}>
                  {user.gender} looking for {user.lookingFor}
                </Text>
                {user.city && user.country ? (
                  <Text style={styles.locationText}>
                    {user.city}, {user.country}
                  </Text>
                ) : null}
              </View>
            </View>

            {user.city && user.country ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Location</Text>
                <Text style={styles.bodyText}>
                  {user.city}, {user.country}
                </Text>
              </View>
            ) : null}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.bodyText}>{user.about}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Interests</Text>
              <View style={styles.tags}>
                {user.interests?.map((interest) => (
                  <View key={interest} style={styles.tag}>
                    <Text style={styles.tagText}>{interest}</Text>
                  </View>
                ))}
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
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
  },

  container: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 120,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  navButton: {
    width: 44,
    height: 44,
    alignSelf: "flex-start",
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.78)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },

  navText: {
    color: "#111",
    fontSize: 34,
    lineHeight: 36,
    fontFamily: systemFontBold,
  },

  heroCard: {
    height: 540,
    borderRadius: 30,
    overflow: "hidden",
    backgroundColor: "#111",
  },

  heroImage: {
    ...StyleSheet.absoluteFill,
    width: "100%",
    height: "100%",
  },

  heroShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
  },

  heroCopy: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 18,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.72)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.84)",
    padding: 18,
  },

  name: {
    color: "#111",
    fontSize: 34,
    fontFamily: systemFontBold,
    fontWeight: "700",
  },

  meta: {
    color: "#6E6E73",
    fontSize: 15,
    fontFamily: systemFont,
    marginTop: 8,
  },

  locationText: {
    color: "#111",
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
    borderRadius: 999,
    backgroundColor: "rgba(0, 0, 0, 0.48)",
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
    fontFamily: systemFontBold,
  },

  section: {
    marginTop: 22,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.68)",
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

  emptyCard: {
    minHeight: 280,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.82)",
    alignItems: "center",
    justifyContent: "center",
    padding: 26,
  },

  emptyTitle: {
    color: "#111",
    fontSize: 26,
    fontFamily: systemFontBold,
    textAlign: "center",
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
});
