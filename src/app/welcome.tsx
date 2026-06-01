import React from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";

import { router } from "expo-router";
import AuthButton from "../components/AuthButton";
import { ThemedBackground } from "../components/ThemedBackground";
import { ThemedLogo } from "../components/ThemedLogo";
import { ThemeToggle } from "../components/ThemeToggle";
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
        <ThemedLogo style={styles.logo} />

        <Image
          source={require("../../assets/people.png")}
          style={styles.people}
        />

        <Text
          style={[
            styles.subtitle,
            {
              backgroundColor: colors.surface,
              color: colors.surfaceMutedText,
            },
          ]}
        >
          Find real love. Build meaningful connections.
        </Text>

        <View style={{ width: "100%" }}>
          <AuthButton
            title="Continue with Google"
            icon={require("../../assets/google.png")}
            onPress={handleGoogleLogin}
          />
          <AuthButton
            title="Sign in with Email or Phone"
            icon={require("../../assets/email.png")}
            onPress={() => router.replace("/login")}
          />
        </View>

        <View style={styles.signupWrap}>
          <Text style={[styles.accountText, { color: colors.mutedText }]}>
            Don't have an account?
          </Text>
          <Text
            style={[styles.signupText, { color: colors.text }]}
            onPress={() => router.replace("/registration")}
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

  themeToggleWrap: {
    position: "absolute",
    top: 54,
    right: 20,
    zIndex: 5,
  },

  people: {
    width: 320,
    height: 350,
    marginBottom: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 32,
  },

  container: {
    flex: 1,
    paddingHorizontal: 24,
    marginBottom: 32,
  },

  logo: {
    width: 220,
    height: 72,
    marginTop: 50,
    marginBottom: 32,
  },
  subtitle: {
    marginBottom: 32,
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    color: "#6E6E73",
    marginTop: 72,
    backgroundColor: "rgba(255, 255, 255, 0.75)",
    borderRadius: 20,
    padding: 20,
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
