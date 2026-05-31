import { BackButton } from "@/components/BackButton";
import {
  getEmailValidationError,
  registerLocalAccount,
} from "@/services/auth/session";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ImageBackground,
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

  async function handleCreateAccount() {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName) {
      setError("Enter your name.");
      return;
    }

    const emailError = getEmailValidationError(trimmedEmail);

    if (emailError) {
      setError(emailError);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    try {
      await registerLocalAccount(
        {
          id: Date.now(),
          email: trimmedEmail,
          name: trimmedName,
          onboardingCompleted: false,
          createdAt: new Date().toISOString(),
        },
        password,
      );
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Account creation failed.",
      );
      return;
    }

    router.replace("/onboarding");
  }

  return (
    <ImageBackground
      source={require("../../assets/bg.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <BackButton to="/welcome" />

          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>
            Start with email, then complete your dating profile.
          </Text>

          <View style={styles.form}>
            <View>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Ivan"
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
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Create password"
                placeholderTextColor="#999"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity style={styles.button} onPress={handleCreateAccount}>
              <Text style={styles.buttonText}>Create Account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
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
    paddingHorizontal: 24,
    paddingTop: 70,
    paddingBottom: 40,
  },

  title: {
    fontSize: 34,
    fontFamily: "Satoshi-Bold",
    color: "#111",
    marginTop: 20,
  },

  subtitle: {
    fontSize: 16,
    fontFamily: "Satoshi-Regular",
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
    fontFamily: "Satoshi-Bold",
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
    fontFamily: "Satoshi-Regular",
    color: "#111",
    borderWidth: 1,
    borderColor: "#E5DED7",
  },

  error: {
    color: "#7A1F1F",
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Satoshi-Bold",
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
    fontFamily: "Satoshi-Bold",
  },
});
