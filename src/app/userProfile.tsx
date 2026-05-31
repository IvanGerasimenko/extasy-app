import {
  getLocalAccountUsers,
  getUserKey,
  type SessionUser,
} from "@/services/auth/session";
import { router, useLocalSearchParams } from "expo-router";
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
} from "react-native";

export default function UserProfileScreen() {
  const { userKey } = useLocalSearchParams<{ userKey?: string }>();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

  const photos = useMemo(() => {
    if (!user) {
      return [];
    }

    return user.photos?.length ? user.photos : user.picture ? [user.picture] : [];
  }, [user]);

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

  function changePhoto(direction: -1 | 1) {
    if (!photos.length) {
      return;
    }

    setPhotoIndex((currentIndex) => {
      const photoCount = photos.length;
      return (currentIndex + direction + photoCount) % photoCount;
    });
  }

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
          <Text style={styles.navText}>Back</Text>
        </TouchableOpacity>

        {!user ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Profile not found</Text>
          </View>
        ) : (
          <>
            <View style={styles.heroCard}>
              {photos[0] ? (
                <Image
                  source={{ uri: photos[photoIndex] ?? photos[0] }}
                  style={styles.heroImage}
                />
              ) : null}
              <View style={styles.heroShade} />

              {photos.length > 1 ? (
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
                </>
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
              </View>
            </View>

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

      <Modal visible={fullscreenOpen} transparent animationType="fade">
        <View style={styles.fullscreen}>
          <TouchableOpacity
            style={styles.fullscreenClose}
            onPress={() => setFullscreenOpen(false)}
          >
            <Text style={styles.fullscreenCloseText}>Close</Text>
          </TouchableOpacity>

          {photos[photoIndex] ? (
            <Image
              source={{ uri: photos[photoIndex] }}
              style={styles.fullscreenImage}
              resizeMode="contain"
            />
          ) : null}

          {photos.length > 1 ? (
            <View style={styles.fullscreenControls}>
              <TouchableOpacity
                style={styles.fullscreenNav}
                onPress={() => changePhoto(-1)}
              >
                <Text style={styles.fullscreenNavText}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.fullscreenCounter}>
                {photoIndex + 1} / {photos.length}
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

  container: {
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 40,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  navButton: {
    height: 40,
    alignSelf: "flex-start",
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.78)",
    justifyContent: "center",
    paddingHorizontal: 16,
    marginBottom: 18,
  },

  navText: {
    color: "#111",
    fontSize: 14,
    fontFamily: "Satoshi-Bold",
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
    flex: 1,
    justifyContent: "flex-end",
    padding: 22,
  },

  name: {
    color: "#FFF",
    fontSize: 34,
    fontFamily: "Satoshi-Bold",
  },

  meta: {
    color: "rgba(255, 255, 255, 0.84)",
    fontSize: 15,
    fontFamily: "Satoshi-Bold",
    marginTop: 8,
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
    fontFamily: "Satoshi-Bold",
    lineHeight: 38,
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
    fontFamily: "Satoshi-Bold",
  },

  section: {
    marginTop: 22,
  },

  sectionTitle: {
    color: "#111",
    fontSize: 18,
    fontFamily: "Satoshi-Bold",
    marginBottom: 10,
  },

  bodyText: {
    color: "#111",
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Satoshi-Regular",
    backgroundColor: "rgba(255, 255, 255, 0.72)",
    borderRadius: 18,
    padding: 16,
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
    fontFamily: "Satoshi-Bold",
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
    fontFamily: "Satoshi-Bold",
    textAlign: "center",
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
    fontFamily: "Satoshi-Bold",
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
    fontFamily: "Satoshi-Bold",
    lineHeight: 40,
  },

  fullscreenCounter: {
    color: "#FFF",
    fontSize: 15,
    fontFamily: "Satoshi-Bold",
  },
});
