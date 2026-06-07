import { BackButton } from "@/components/BackButton";
import { FadeIn, ScalePressable } from "@/components/Motion";
import { ThemedBackground } from "@/components/ThemedBackground";
import {
  getEmailValidationError,
  signInLocalAccount,
} from "@/services/auth/session";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function LoginScreen() {
  // Данные формы входа
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Состояние загрузки и сообщение об ошибке
  const [isLoading, setIsLoading] = useState(false);
  const [emailMessage, setEmailMessage] = useState("");

  async function handleEmailLogin() {
    const trimmedEmail = email.trim().toLowerCase();
    // Проверяем, заполнены ли поля
    if (!trimmedEmail || !password) {
      setEmailMessage("Gib E-Mail und Passwort ein.");
      return;
    }
    // Проверяем правильность email
    const emailError = getEmailValidationError(trimmedEmail);
    if (emailError) {
      setEmailMessage(emailError);
      return;
    }
    setIsLoading(true);
    setEmailMessage("");
    try {
      // Выполняем вход через Supabase по email и паролю
      const user = await signInLocalAccount(trimmedEmail, password);

      if (!user) {
        setEmailMessage("Kein Konto mit diesen Daten gefunden.");
        return;
      }

      // Направляем пользователя на нужный экран
      router.replace(user.onboardingCompleted ? "/discover" : "/onboarding");
    } catch (error) {
      // Показываем ошибку, которую вернул Supabase
      setEmailMessage(
        error instanceof Error
          ? error.message
          : "Die Anmeldung ist fehlgeschlagen.",
      );
    } finally {
      // Отключаем индикатор загрузки при любом результате
      setIsLoading(false);
    }
  }

  return (
    <ThemedBackground style={styles.background}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <FadeIn style={styles.content} distance={24}>
            <BackButton to="/welcome" />

            <Text style={styles.title}>Einloggen</Text>

            <Text style={styles.subtitle}>
              Schön, dich wieder bei Extasy zu sehen.
            </Text>

            <View style={styles.card}>
              <Text style={styles.label}>E-Mail</Text>

              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                editable={!isLoading}
                onChangeText={(value) => {
                  setEmail(value);
                  setEmailMessage("");
                }}
              />

              <Text style={styles.label}>Passwort</Text>

              <TextInput
                style={styles.input}
                placeholder="Dein Passwort"
                placeholderTextColor="#999"
                secureTextEntry
                autoCapitalize="none"
                value={password}
                editable={!isLoading}
                onChangeText={(value) => {
                  setPassword(value);
                  setEmailMessage("");
                }}
                onSubmitEditing={handleEmailLogin}
              />

              <ScalePressable
                style={styles.button}
                onPress={handleEmailLogin}
                disabled={isLoading}
              >
                <Text style={styles.buttonText}>
                  {isLoading ? "Wird geladen..." : "Einloggen"}
                </Text>
              </ScalePressable>

              {emailMessage ? (
                <Text style={styles.message}>{emailMessage}</Text>
              ) : null}
            </View>
          </FadeIn>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },

  screen: {
    flex: 1,
  },

  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: "#689bff98",
  },

  content: {
    flex: 1,
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    paddingTop: 40,
  },

  title: {
    color: "#ffffff",
    fontSize: 36,
    fontWeight: "700",
  },

  subtitle: {
    color: "#000000",
    fontSize: 16,
    marginTop: 8,
    marginBottom: 28,
  },

  card: {
    width: "100%",
    padding: 20,
    borderRadius: 24,
    backgroundColor: "rgba(0, 0, 0, 0.38)",
  },

  label: {
    color: "#000000b5",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 8,
  },

  input: {
    width: "100%",
    height: 54,
    paddingHorizontal: 16,
    marginBottom: 18,
    borderRadius: 16,
    backgroundColor: "rgba(72, 95, 244, 0.53)",
    color: "#ffffff",
    fontSize: 16,
  },

  button: {
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#000000",
    marginTop: 8,
  },

  disabledButton: {
    opacity: 0.6,
  },

  buttonText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "700",
  },

  message: {
    color: "#ff8a8a",
    fontSize: 14,
    textAlign: "center",
    marginTop: 14,
  },
});
