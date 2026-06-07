import { BackButton } from "@/components/BackButton";
import { ThemedBackground } from "@/components/ThemedBackground";
import { resendSignupEmail, verifySignupEmail } from "@/services/auth/session";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function EmailVerificationScreen() {
  const params = useLocalSearchParams<{ email?: string | string[] }>();
  const email = useMemo(() => {
    const value = Array.isArray(params.email) ? params.email[0] : params.email;
    return value?.trim().toLowerCase() ?? "";
  }, [params.email]);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  async function handleVerify() {
    const normalizedCode = code.replace(/\D/g, "").slice(0, 6);

    if (!email) {
      setMessage("Die E-Mail-Adresse fehlt. Registriere dich erneut.");
      return;
    }

    if (normalizedCode.length !== 6) {
      setMessage("Gib den sechsstelligen Code aus der E-Mail ein.");
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const user = await verifySignupEmail(email, normalizedCode);
      router.replace(user.onboardingCompleted ? "/discover" : "/onboarding");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Der Code ist ungültig oder abgelaufen.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResend() {
    if (!email || isResending) {
      return;
    }

    setIsResending(true);
    setMessage("");

    try {
      await resendSignupEmail(email);
      setMessage("Ein neuer Code wurde gesendet.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Der Code konnte nicht erneut gesendet werden.",
      );
    } finally {
      setIsResending(false);
    }
  }

  return (
    <ThemedBackground style={styles.background}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.container}>
          <BackButton to="/registration" />

          <Text style={styles.eyebrow}>E-Mail bestätigen</Text>
          <Text style={styles.title}>Gib deinen Code ein</Text>
          <Text style={styles.subtitle}>
            Wir haben einen sechsstelligen Bestätigungscode an{" "}
            <Text style={styles.email}>{email || "deine E-Mail"}</Text>{" "}
            gesendet.
          </Text>

          <TextInput
            style={styles.codeInput}
            value={code}
            onChangeText={(value) =>
              setCode(value.replace(/\D/g, "").slice(0, 6))
            }
            placeholder="000000"
            placeholderTextColor="#AAA"
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            maxLength={6}
            autoFocus
          />

          {message ? <Text style={styles.message}>{message}</Text> : null}

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleVerify}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? "Code wird geprüft..." : "E-Mail bestätigen"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resendButton}
            onPress={handleResend}
            disabled={isResending}
          >
            <Text style={styles.resendText}>
              {isResending ? "Code wird gesendet..." : "Code erneut senden"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ThemedBackground>
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
    flex: 1,
    width: "100%",
    maxWidth: Platform.OS === "web" ? 560 : 430,
    alignSelf: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingBottom: 60,
  },
  eyebrow: {
    color: "#FF5D6C",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 34,
    textTransform: "uppercase",
  },
  title: {
    color: "#111",
    fontSize: 34,
    fontWeight: "800",
    marginTop: 10,
  },
  subtitle: {
    color: "#6E6E73",
    fontSize: 16,
    lineHeight: 24,
    marginTop: 12,
  },
  email: {
    color: "#111",
    fontWeight: "700",
  },
  codeInput: {
    height: 72,
    borderRadius: 22,
    backgroundColor: "#FFF",
    borderColor: "#E5DED7",
    borderWidth: 1,
    color: "#111",
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: 12,
    marginTop: 32,
    paddingHorizontal: 22,
    textAlign: "center",
  },
  message: {
    color: "#8A3434",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 14,
    textAlign: "center",
  },
  button: {
    height: 58,
    borderRadius: 18,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonText: {
    color: "#FFF",
    fontSize: 17,
    fontWeight: "700",
  },
  resendButton: {
    alignItems: "center",
    paddingVertical: 18,
  },
  resendText: {
    color: "#111",
    fontSize: 15,
    fontWeight: "700",
  },
});
