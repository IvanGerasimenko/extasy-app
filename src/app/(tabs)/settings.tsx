import {
  clearSession,
  getSessionUser,
  type SessionUser,
} from "@/services/auth/session";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function SettingsScreen() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadSettings() {
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

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSignOut() {
    await clearSession();
    router.replace("/welcome");
  }

  if (isLoading) {
    return (
      <ImageBackground
        source={require("../../../assets/bg.png")}
        style={styles.background}
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
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.eyebrow}>Extasy</Text>
        <Text style={styles.title}>Settings</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{user?.name ?? "Your account"}</Text>
          <Text style={styles.cardText}>
            {user?.email ?? user?.phoneNumber ?? "Profile settings"}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push("/onboarding")}
        >
          <Text style={styles.secondaryText}>Edit Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
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

  eyebrow: {
    color: "#6E6E73",
    fontSize: 13,
  },

  title: {
    color: "#111",
    fontSize: 36,
    marginTop: 4,
  },

  card: {
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.82)",
    padding: 20,
    marginTop: 24,
  },

  cardTitle: {
    color: "#111",
    fontSize: 22,
  },

  cardText: {
    color: "#6E6E73",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },

  secondaryButton: {
    height: 56,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.82)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },

  secondaryText: {
    color: "#111",
    fontSize: 16,
  },

  signOutButton: {
    height: 58,
    borderRadius: 18,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },

  signOutText: {
    color: "#FFF",
    fontSize: 17,
  },
});
