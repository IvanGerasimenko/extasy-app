import { BackButton } from "@/components/BackButton";
import { ThemedBackground } from "@/components/ThemedBackground";
import {
  getEmailValidationError,
  getPasswordStrength,
  registerLocalAccount,
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
  TouchableOpacity,
  View,
} from "react-native";

export default function RegisterScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const passwordStrength = getPasswordStrength(password);
  const passwordStrengthLabel =
    passwordStrength.score <= 1
      ? "Sehr schwach"
      : passwordStrength.score <= 3
        ? "Mittel"
        : passwordStrength.score === 4
          ? "Stark"
          : "Sehr stark";

  async function handleCreateAccount() {
    if (isLoading) return;

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName) {
      setError("Gib deinen Namen ein.");
      return;
    }

    const emailError = getEmailValidationError(trimmedEmail);

    if (emailError) {
      setError(emailError);
      return;
    }

    if (!passwordStrength.isValid) {
      setError("Erfülle alle Passwort-Anforderungen.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      await registerLocalAccount(
        {
          email: trimmedEmail,
          name: trimmedName,
          onboardingCompleted: false,
        },
        password,
      );

      router.replace({
        pathname: "/emailVerification",
        params: { email: trimmedEmail },
      });
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Das Konto konnte nicht erstellt werden.",
      );
    } finally {
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
        >
          <BackButton to="/welcome" />

          <Text style={styles.title}>Konto erstellen</Text>
          <Text style={styles.subtitle}>
            Starte mit deiner E-Mail und vervollständige danach dein
            Dating-Profil.
          </Text>

          <View style={styles.form}>
            <View>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Max"
                placeholderTextColor="#999"
                value={name}
                onChangeText={setName}
              />
            </View>

            <View>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View>
              <Text style={styles.label}>Passwort</Text>
              <TextInput
                style={[
                  styles.input,
                  password.length > 0 &&
                    (passwordStrength.isValid
                      ? styles.validPasswordInput
                      : styles.invalidPasswordInput),
                ]}
                placeholder="Passwort erstellen"
                placeholderTextColor="#999"
                secureTextEntry
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  if (error === "Erfülle alle Passwort-Anforderungen.") {
                    setError("");
                  }
                }}
              />

              <View style={styles.passwordStrength}>
                <View style={styles.strengthHeader}>
                  <Text style={styles.strengthTitle}>Passwortstärke</Text>
                  <Text
                    style={[
                      styles.strengthValue,
                      passwordStrength.isValid && styles.strengthValueValid,
                    ]}
                  >
                    {password ? passwordStrengthLabel : "Noch leer"}
                  </Text>
                </View>

                <View style={styles.strengthBar}>
                  {passwordStrength.checks.map((check) => (
                    <View
                      key={`bar-${check.key}`}
                      style={[
                        styles.strengthSegment,
                        check.passed && styles.strengthSegmentPassed,
                      ]}
                    />
                  ))}
                </View>

                <View style={styles.passwordRules}>
                  {passwordStrength.checks.map((check) => (
                    <View key={check.key} style={styles.passwordRule}>
                      <View
                        style={[
                          styles.ruleIcon,
                          check.passed && styles.ruleIconPassed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.ruleIconText,
                            check.passed && styles.ruleIconTextPassed,
                          ]}
                        >
                          {check.passed ? "✓" : "•"}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.ruleText,
                          check.passed && styles.ruleTextPassed,
                        ]}
                      >
                        {check.label}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[
                styles.button,
                (isLoading || !passwordStrength.isValid) &&
                  styles.buttonDisabled,
              ]}
              onPress={handleCreateAccount}
              disabled={isLoading || !passwordStrength.isValid}
            >
              <Text style={styles.buttonText}>
                {isLoading ? "Code wird gesendet..." : "Konto erstellen"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
    flexGrow: 1,
    width: "100%",
    maxWidth: Platform.OS === "web" ? 920 : 500,
    alignSelf: "center",
    paddingHorizontal: Platform.OS === "web" ? 36 : 24,
    paddingTop: Platform.OS === "web" ? 56 : 70,
    paddingBottom: Platform.OS === "web" ? 160 : 40,
  },

  title: {
    fontSize: 34,
    color: "#111",
    marginTop: 20,
  },

  subtitle: {
    fontSize: 16,
    color: "#6E6E73",
    lineHeight: 24,
    marginTop: 10,
    marginBottom: 28,
  },

  form: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    borderRadius: 20,
    padding: 20,
  },

  label: {
    fontSize: 15,
    color: "#111",
    marginBottom: 10,
    marginTop: 18,
  },

  input: {
    height: 56,
    borderRadius: 37,
    backgroundColor: "#FFF",
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#111",
    borderWidth: 1,
    borderColor: "#E5DED7",
  },

  invalidPasswordInput: {
    borderColor: "#E6A3AD",
  },

  validPasswordInput: {
    borderColor: "#2D9D72",
  },

  passwordStrength: {
    marginTop: 14,
    padding: 15,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderWidth: 1,
    borderColor: "#E5DED7",
  },

  strengthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  strengthTitle: {
    color: "#222",
    fontSize: 13,
    fontWeight: "700",
  },

  strengthValue: {
    color: "#A24B58",
    fontSize: 12,
    fontWeight: "800",
  },

  strengthValueValid: {
    color: "#237A59",
  },

  strengthBar: {
    flexDirection: "row",
    gap: 6,
    marginTop: 11,
  },

  strengthSegment: {
    flex: 1,
    height: 5,
    borderRadius: 4,
    backgroundColor: "#E7E1DC",
  },

  strengthSegmentPassed: {
    backgroundColor: "#2D9D72",
  },

  passwordRules: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
    marginTop: 14,
  },

  passwordRule: {
    minWidth: Platform.OS === "web" ? 180 : "47%",
    flexGrow: 1,
    flexBasis: Platform.OS === "web" ? 180 : "45%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  ruleIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEE8E3",
  },

  ruleIconPassed: {
    backgroundColor: "#DDF3E9",
  },

  ruleIconText: {
    color: "#9C9189",
    fontSize: 12,
    fontWeight: "900",
  },

  ruleIconTextPassed: {
    color: "#237A59",
  },

  ruleText: {
    flexShrink: 1,
    color: "#776E68",
    fontSize: 12,
    lineHeight: 17,
  },

  ruleTextPassed: {
    color: "#237A59",
    fontWeight: "700",
  },

  error: {
    color: "#7A1F1F",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 18,
  },

  button: {
    height: 58,
    borderRadius: 18,
    backgroundColor: "#111",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 28,
  },

  buttonText: {
    color: "#FFF",
    fontSize: 17,
  },

  buttonDisabled: {
    opacity: 0.65,
  },
});
