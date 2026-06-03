import { ThemedLogo } from "@/components/ThemedLogo";
import { getSessionUser } from "@/services/auth/session";
import { router } from "expo-router";
import React, { useEffect } from "react";
import {
  ActivityIndicator,
  ImageBackground,
  StyleSheet,
  View,
} from "react-native";

export default function IndexScreen() {
  useEffect(() => {
    let isMounted = true;

    async function routeAfterSplash() {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (!isMounted) {
        return;
      }

      const user = await getSessionUser();

      if (!user) {
        router.replace("/welcome");
        return;
      }

      if (!user.onboardingCompleted) {
        router.replace("/onboarding");
        return;
      }

      router.replace("/discover");
    }

    routeAfterSplash();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <ImageBackground
      source={require("../../assets/bgparis.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.container}>
        <ThemedLogo style={styles.logo} />

        <ActivityIndicator size="large" color="#ffffff" style={styles.loader} />
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    minHeight: "100%",
  },

  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  logo: {
    width: 250,
    height: 72,
    borderRadius: 40,
  },

  loader: {
    marginTop: 28,
  },
});
