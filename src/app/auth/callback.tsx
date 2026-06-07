import { ThemedBackground } from "@/components/ThemedBackground";
import { getSessionUser } from "@/services/auth/session";
import { createGoogleSessionFromUrl } from "@/services/auth/googleAuth";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function AuthCallbackScreen() {
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function finishGoogleLogin() {
      try {
        const callbackUrl =
          Platform.OS === "web" && typeof window !== "undefined"
            ? window.location.href
            : "";

        if (!callbackUrl) {
          throw new Error("OAuth callback URL fehlt.");
        }

        await createGoogleSessionFromUrl(callbackUrl);
        const user = await getSessionUser();

        if (!user) {
          throw new Error("Das Supabase-Profil wurde nicht erstellt.");
        }

        router.replace(
          user.onboardingCompleted ? "/discover" : "/onboarding",
        );
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Google-Anmeldung ist fehlgeschlagen.",
          );
        }
      }
    }

    finishGoogleLogin();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <ThemedBackground style={styles.background}>
      <View style={styles.container}>
        {errorMessage ? (
          <>
            <Text style={styles.error}>{errorMessage}</Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => router.replace("/welcome")}
            >
              <Text style={styles.buttonText}>Zurück zur Anmeldung</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color="#111" />
            <Text style={styles.text}>Anmeldung wird abgeschlossen...</Text>
          </>
        )}
      </View>
    </ThemedBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  text: {
    color: "#111",
    fontSize: 16,
    marginTop: 16,
  },
  error: {
    color: "#8A3434",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#111",
    borderRadius: 16,
    marginTop: 22,
    paddingHorizontal: 22,
    paddingVertical: 15,
  },
  buttonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
