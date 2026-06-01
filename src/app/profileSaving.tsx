import { completeSessionOnboarding } from "@/services/auth/session";
import { consumePendingOnboardingProfile } from "@/services/onboarding/pendingProfile";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { ThemedBackground } from "@/components/ThemedBackground";
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function ProfileSavingScreen() {
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;
  const [error, setError] = useState("");

  useEffect(() => {
    const spinLoop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 2200,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
    );

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    spinLoop.start();
    pulseLoop.start();
    floatLoop.start();

    return () => {
      spinLoop.stop();
      pulseLoop.stop();
      floatLoop.stop();
    };
  }, [float, pulse, spin]);

  useEffect(() => {
    let isMounted = true;

    async function saveProfile() {
      const profile = consumePendingOnboardingProfile();

      if (!profile) {
        router.replace("/onboarding");
        return;
      }

      const startedAt = Date.now();

      try {
        const updatedUser = await completeSessionOnboarding(profile);
        const elapsed = Date.now() - startedAt;
        const remainingDelay = Math.max(0, 900 - elapsed);

        setTimeout(() => {
          if (!isMounted) {
            return;
          }

          router.replace(updatedUser ? "/discover" : "/welcome");
        }, remainingDelay);
      } catch {
        if (isMounted) {
          setError("Could not save your profile. Please try again.");
        }
      }
    }

    saveProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const rotateZ = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["-7deg", "7deg"],
  });
  const scale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1.04],
  });
  const translateY = float.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -14],
  });

  return (
    <ThemedBackground style={styles.background}>
      <View style={styles.container}>
        <View style={styles.loaderStage}>
          <Animated.View
            style={[
              styles.glow,
              {
                opacity: pulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.36, 0.72],
                }),
                transform: [{ scale }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.cardShadow,
              {
                transform: [
                  { translateY },
                  { perspective: 800 },
                  { rotateZ },
                  { scale },
                ],
              },
            ]}
          >
            <View style={styles.card}>
              <View style={styles.photoShape} />
              <View style={styles.lineWide} />
              <View style={styles.lineShort} />
              <View style={styles.chipRow}>
                <View style={styles.chip} />
                <View style={styles.chip} />
              </View>
            </View>
          </Animated.View>
        </View>

        <Text style={styles.title} adjustsFontSizeToFit numberOfLines={1}>
          Creating your profile
        </Text>
        <Text style={styles.subtitle}>
          Polishing your photos and match details.
        </Text>

        {error ? (
          <>
            <Text style={styles.error}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => router.replace("/onboarding")}
            >
              <Text style={styles.retryText}>Back to Profile</Text>
            </TouchableOpacity>
          </>
        ) : null}
      </View>
    </ThemedBackground>
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
    width: "100%",
    maxWidth: 380,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingTop: 44,
    paddingBottom: 44,
  },

  loaderStage: {
    width: 180,
    height: 180,
    alignItems: "center",
    justifyContent: "center",
  },

  glow: {
    position: "absolute",
    width: 148,
    height: 148,
    borderRadius: 74,
    backgroundColor: "#FF4458",
  },

  cardShadow: {
    width: 112,
    height: 144,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 18,
    },
    shadowOpacity: 0.24,
    shadowRadius: 26,
    elevation: 12,
  },

  card: {
    width: 112,
    height: 144,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    padding: 11,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.96)",
  },

  photoShape: {
    height: 74,
    borderRadius: 18,
    backgroundColor: "#FF4458",
    marginBottom: 11,
  },

  lineWide: {
    width: "78%",
    height: 9,
    borderRadius: 999,
    backgroundColor: "#1C1C1E",
  },

  lineShort: {
    width: "52%",
    height: 7,
    borderRadius: 999,
    backgroundColor: "#C7C7CC",
    marginTop: 8,
  },

  chipRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 12,
  },

  chip: {
    width: 34,
    height: 14,
    borderRadius: 999,
    backgroundColor: "#FFE0E5",
  },

  title: {
    width: "100%",
    maxWidth: 320,
    color: "#111",
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 26,
  },

  subtitle: {
    width: "100%",
    color: "#6E6E73",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginTop: 10,
    maxWidth: Platform.OS === "web" ? 330 : 300,
  },

  error: {
    color: "#FF4458",
    fontSize: 14,
    textAlign: "center",
    marginTop: 22,
  },

  retryButton: {
    height: 52,
    borderRadius: 18,
    backgroundColor: "#111",
    justifyContent: "center",
    paddingHorizontal: 24,
    marginTop: 18,
  },

  retryText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
