import { FadeIn } from "@/components/Motion";
import React from "react";
import {
  Animated,
  Easing,
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
  const { signInWithGoogle, isLoading, errorMessage } = useGoogleAuth();
  const { colors } = useAppTheme();
  const heroFloat = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(heroFloat, {
          toValue: 1,
          duration: 4200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(heroFloat, {
          toValue: 0,
          duration: 4200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [heroFloat]);

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
        <FadeIn delay={60}>
          <Animated.View
            style={[
              styles.hero,
              {
                transform: [
                  {
                    translateY: heroFloat.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -7],
                    }),
                  },
                ],
              },
            ]}
          >
            <Image
              source={require("../../assets/logolight.png")}
              style={styles.logo}
            />
            <View style={styles.peopleWrapper}>
              <Image
                source={require("../../assets/people.png")}
                style={styles.people}
                resizeMethod="resize"
                resizeMode="cover"
              />
            </View>
            <View style={styles.heroOverlay}>
              <Text style={styles.heroTitle}>
                Kostenlos Dates in Deutschland.
              </Text>
              <Text style={styles.subtitle}>
                Geprüfte Profile, sichere Kontakte und Gespräche, die sich schon
                ab der ersten Nachricht echt anfühlen.
              </Text>
              <View style={styles.heroTags}>
                <PremiumTag label="Geprüfte Profile" tone="gold" />
                <PremiumTag label="Sichere Kontakte" tone="emerald" />
              </View>
            </View>
          </Animated.View>
        </FadeIn>

        <FadeIn delay={180} style={styles.authActions}>
          <AuthButton
            title={
              isLoading ? "Google wird geöffnet..." : "Mit Google fortfahren"
            }
            icon={require("../../assets/google.png")}
            onPress={handleGoogleLogin}
          />
          {errorMessage ? (
            <Text style={styles.authError}>{errorMessage}</Text>
          ) : null}
          <AuthButton
            title="Einloggen"
            icon={require("../../assets/email.png")}
            onPress={() => router.push("/login")}
          />
        </FadeIn>

        <FadeIn delay={300} style={styles.signupWrap}>
          <Text style={[styles.accountText, { color: colors.mutedText }]}>
            Noch kein Konto?
          </Text>
          <Text
            style={[styles.signupText]}
            onPress={() => router.push("/registration")}
          >
            Registrieren
          </Text>
        </FadeIn>
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
    backgroundColor: premiumColors.navy,
  },

  container: {
    marginBottom: Platform.OS === "web" ? 30 : 20,
    maxWidth: "100%",
    paddingHorizontal: Platform.OS === "web" ? 10 : 16,
    marginTop: Platform.OS === "web" ? 54 : 30,
  },
  authActions: {
    width: "80%",
    justifyContent: "center",
    alignSelf: "center",
  },

  authError: {
    color: "#9E2A2B",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
    paddingHorizontal: 8,
    textAlign: "center",
  },

  themeToggleWrap: {
    position: "absolute",
    top: 54,
    right: 20,
    zIndex: 5,
  },

  peopleWrapper: {
    width: "100%",
    maxWidth: Platform.OS === "web" ? 900 : "100%",
    minHeight: Platform.OS === "web" ? 500 : 400,
    aspectRatio: 16 / 9,
    alignSelf: "center",
    borderRadius: 34,
    overflow: "hidden",
  },

  people: {
    width: "100%",
    height: "100%",
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
    backgroundColor: "rgba(0, 0, 0, 0.32)",
  },

  heroTitle: {
    color: premiumColors.white,
    fontSize: 31,
    lineHeight: 36,
    fontWeight: "900",
    backgroundColor: "rgba(0, 0, 0, 0.48)",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },

  heroTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 16,
  },

  subtitle: {
    marginTop: 10,
    backgroundColor: "rgba(0, 0, 0, 0.48)",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
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
    color: "#ffffff",
    fontSize: 15,
    lineHeight: 22,
  },

  signupText: {
    color: "#ffffffd0",
    fontSize: 16,
    textDecorationLine: "underline",
    marginTop: 4,
  },
});
