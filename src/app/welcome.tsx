import React from "react";
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { router } from "expo-router";
import AuthButton from "../components/AuthButton";
import { PremiumTag } from "../components/PremiumUI";
import { ThemedBackground } from "../components/ThemedBackground";
import { ThemeToggle } from "../components/ThemeToggle";
import { premiumColors, premiumShadow } from "../constants/premiumDesign";
import { useGoogleAuth } from "../services/auth/googleAuth";
import { useAppTheme } from "../services/theme/ThemeContext";

export default function WelcomeScreen() {
  const { signInWithGoogle } = useGoogleAuth();
  const { colors } = useAppTheme();

  const handleGoogleLogin = async () => {
    const result = await signInWithGoogle();

    console.log("LOGIN SUCCESS:", Boolean(result));

    if (!result) {
      return;
    }

    router.replace(
      result.dbUser.user.onboardingCompleted ? "/discover" : "/onboarding",
    );
  };

  return (
    <ThemedBackground style={styles.background}>
      <View style={styles.themeToggleWrap}>
        <ThemeToggle />
      </View>
      <ScrollView style={styles.container}>
        <View style={styles.hero}>
          <Image
            source={require("../../assets/logolight.png")}
            style={styles.logo}
          />
          <Image
            source={require("../../assets/people.png")}
            style={styles.people}
          />
          <View style={styles.heroOverlay}>
            <Text style={styles.heroTitle}>
              Meaningful matches, quietly curated.
            </Text>
            <Text style={styles.subtitle}>
              Quality profiles, safer connections, and conversations that feel
              intentional from the first message.
            </Text>
            <View style={styles.heroTags}>
              <PremiumTag label="Quality profiles" tone="gold" />
              <PremiumTag label="Safer connections" tone="emerald" />
            </View>
          </View>
        </View>

        <View style={{ width: "100%" }}>
          <AuthButton
            title="Continue with Google"
            icon={require("../../assets/google.png")}
            onPress={handleGoogleLogin}
          />
          <AuthButton
            title="Sign in with Email or Phone"
            icon={require("../../assets/email.png")}
            onPress={() => router.push("/login")}
          />
        </View>

        <View style={styles.signupWrap}>
          <Text style={[styles.accountText, { color: colors.mutedText }]}>
            Don't have an account?
          </Text>
          <Text
            style={[styles.signupText, { color: colors.text }]}
            onPress={() => router.push("/registration")}
          >
            Sign Up
          </Text>
        </View>
      </ScrollView>
    </ThemedBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    minHeight: "100%",
  },

  container: {
    width: "100%",
    maxWidth: Platform.OS === "web" ? 1120 : 380,
    paddingHorizontal: Platform.OS === "web" ? 36 : 10,
  },

  themeToggleWrap: {
    position: "absolute",
    top: 54,
    right: 20,
    zIndex: 5,
  },

  people: {
    width: "100%",
    height: Platform.OS === "web" ? 560 : 430,
    borderRadius: 34,
    opacity: 0.94,
  },

  logo: {
    width: 178,
    height: 58,
    marginBottom: 18,
    borderRadius: 12,
    opacity: 0.98,
    paddingTop: 14,
    paddingHorizontal: 14,
  },

  hero: {
    marginTop: Platform.OS === "web" ? 34 : 82,
    marginBottom: 22,
    borderRadius: 34,
    overflow: "hidden",
    backgroundColor: premiumColors.navy,
    ...premiumShadow,
    padding: Platform.OS === "web" ? 23 : 8,
  },

  heroOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: "flex-end",
    padding: 22,
    backgroundColor: "rgba(16, 24, 32, 0.46)",
  },

  heroTitle: {
    color: premiumColors.white,
    fontSize: 31,
    lineHeight: 36,
    fontWeight: "900",
  },

  heroTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 16,
  },

  subtitle: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 24,
    color: "rgba(255, 255, 255, 0.84)",
  },

  signupWrap: {
    alignItems: "center",
    marginTop: 10,
    marginBottom: 24,
  },

  accountText: {
    color: "#6E6E73",
    fontSize: 15,
    lineHeight: 22,
  },

  signupText: {
    color: "#111",
    fontSize: 16,
    textDecorationLine: "underline",
    marginTop: 4,
  },
});
