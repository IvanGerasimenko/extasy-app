import {
  clearSession,
  getIncomingLikeRequestsForCurrentUser,
  getLikeResponseNotificationsForCurrentUser,
  getSessionUser,
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
} from "react-native";

export default function ProfileScreen() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

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

      const [incomingLikes, likeResponses] = await Promise.all([
        getIncomingLikeRequestsForCurrentUser(),
        getLikeResponseNotificationsForCurrentUser(),
      ]);

      setUser(sessionUser);
      setNotificationCount(incomingLikes.length + likeResponses.length);
      setIsLoading(false);
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleLogout() {
    await clearSession();
    router.replace("/welcome");
  }

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
      <ImageBackground
        source={require("../../assets/bg.png")}
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
      source={require("../../assets/bg.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topbar}>
          <TouchableOpacity style={styles.iconButton} onPress={handleLogout}>
            <Image
              source={require("../../assets/logout.png")}
              style={styles.iconButton}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.hero}>
          {photos[0] ? (
            <View style={styles.avatarWrap}>
              <Image
                source={{ uri: photos[photoIndex] ?? photos[0] }}
                style={styles.avatar}
              />
              <TouchableOpacity
                style={styles.expandButton}
                onPress={() => setFullscreenOpen(true)}
              >
                <Text style={styles.expandText}>Open</Text>
              </TouchableOpacity>
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
                  <View style={styles.photoCounter}>
                    <Text style={styles.photoCounterText}>
                      {photoIndex + 1} / {photos.length}
                    </Text>
                  </View>
                </>
              ) : null}
            </View>
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>
                {user?.name?.slice(0, 1).toUpperCase() ?? "E"}
              </Text>
            </View>
          )}

          <Text style={styles.name}>
            {user?.name ?? "Your profile"}
            {user?.age ? `, ${user.age}` : ""}
          </Text>
          <Text style={styles.meta}>
            {user?.gender ?? "Profile"} looking for{" "}
            {user?.lookingFor ?? "matches"}
          </Text>
          {user?.city && user.country ? (
            <Text style={styles.locationText}>
              {user.city}, {user.country}
            </Text>
          ) : null}
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

        <View style={styles.sectionbuttons}>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => router.push("/notifications")}
          >
            <Text style={styles.notificationButtonText}>
              Notifications{notificationCount ? ` (${notificationCount})` : ""}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.chatButton}
            onPress={() => router.push("/chats")}
          >
            <Text style={styles.chatButtonText}>Open Chats</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.likedButton}
            onPress={() => router.push("/liked")}
          >
            <Text style={styles.likedButtonText}>Liked Profiles</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.primaryText}>Search for love</Text>
          </TouchableOpacity>
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
                  onPress={() => setPhotoIndex(index)}
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

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push("/onboarding")}
        >
          <Text style={styles.primaryText}>Edit Profile</Text>
        </TouchableOpacity>
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

  screen: {
    flex: 1,
  },

  container: {
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 40,
  },

  sectionbuttons: {
    marginTop: 25,
    marginBottom: 23,
  },
  iconButton: {
    width: 22,
    height: 22,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.78)",
    alignItems: "center",
    justifyContent: "center",
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
    fontFamily: "Satoshi-Bold",
  },

  hero: {
    alignItems: "center",
    marginTop: 16,
    marginBottom: 24,
  },

  avatar: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: "#E8E2DC",
  },

  avatarWrap: {
    width: 168,
    height: 168,
    alignItems: "center",
    justifyContent: "center",
  },

  photoNavButton: {
    position: "absolute",
    top: 55,
    width: 36,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.82)",
    alignItems: "center",
    justifyContent: "center",
  },

  photoNavLeft: {
    left: 0,
  },

  photoNavRight: {
    right: 0,
  },

  photoNavText: {
    color: "#111",
    fontSize: 28,
    fontFamily: "Satoshi-Bold",
    lineHeight: 32,
  },

  photoCounter: {
    position: "absolute",
    bottom: 6,
    borderRadius: 999,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    paddingHorizontal: 10,
    height: 26,
    justifyContent: "center",
  },

  photoCounterText: {
    color: "#FFF",
    fontSize: 11,
    fontFamily: "Satoshi-Bold",
  },

  expandButton: {
    position: "absolute",
    bottom: 8,
    borderRadius: 999,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    paddingHorizontal: 12,
    height: 28,
    justifyContent: "center",
  },

  expandText: {
    color: "#FFF",
    fontSize: 12,
    fontFamily: "Satoshi-Bold",
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
    fontFamily: "Satoshi-Bold",
  },

  name: {
    marginTop: 16,
    color: "#111",
    fontSize: 32,
    fontFamily: "Satoshi-Bold",
    textAlign: "center",
  },

  meta: {
    marginTop: 6,
    color: "#6E6E73",
    fontSize: 15,
    fontFamily: "Satoshi-Regular",
    textAlign: "center",
  },

  locationText: {
    marginTop: 8,
    color: "#111",
    fontSize: 14,
    fontFamily: "Satoshi-Bold",
    textAlign: "center",
  },

  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },

  chatButton: {
    height: 54,
    borderRadius: 18,
    backgroundColor: "#111",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 5,
  },

  notificationButton: {
    height: 54,
    borderRadius: 18,
    backgroundColor: "#111",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },

  notificationButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontFamily: "Satoshi-Bold",
  },

  chatButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontFamily: "Satoshi-Bold",
  },

  likedButton: {
    height: 54,
    borderRadius: 18,
    backgroundColor: "#111",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    marginTop: 22,
  },

  likedButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontFamily: "Satoshi-Bold",
  },

  statBox: {
    flex: 1,
    minHeight: 82,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.78)",
    alignItems: "center",
    justifyContent: "center",
  },

  statNumber: {
    color: "#111",
    fontSize: 24,
    fontFamily: "Satoshi-Bold",
  },

  statLabel: {
    marginTop: 4,
    color: "#6E6E73",
    fontSize: 13,
    fontFamily: "Satoshi-Bold",
  },

  section: {
    marginTop: 18,
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
    fontFamily: "Satoshi-Bold",
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
    fontFamily: "Satoshi-Bold",
  },
});
