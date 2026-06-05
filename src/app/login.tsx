import { BackButton } from "@/components/BackButton";
import { ThemedBackground } from "@/components/ThemedBackground";
import {
  getEmailValidationError,
  saveSessionUser,
  signInLocalAccount,
  type SessionUser,
} from "@/services/auth/session";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

const countryOptions = [
  { label: "Afghanistan", code: "+93", placeholder: "70 123 4567" },
  { label: "Albanien", code: "+355", placeholder: "66 123 4567" },
  { label: "Algerien", code: "+213", placeholder: "551 23 45 67" },
  { label: "Argentinien", code: "+54", placeholder: "9 11 2345 6789" },
  { label: "Armenien", code: "+374", placeholder: "77 123456" },
  { label: "Australien", code: "+61", placeholder: "412 345 678" },
  { label: "Österreich", code: "+43", placeholder: "664 1234567" },
  { label: "Aserbaidschan", code: "+994", placeholder: "50 123 45 67" },
  { label: "Belarus", code: "+375", placeholder: "29 123 45 67" },
  { label: "Belgien", code: "+32", placeholder: "470 12 34 56" },
  { label: "Brasilien", code: "+55", placeholder: "11 91234 5678" },
  { label: "Bulgarien", code: "+359", placeholder: "88 123 4567" },
  { label: "Kanada", code: "+1", placeholder: "555 123 4567" },
  { label: "Chile", code: "+56", placeholder: "9 1234 5678" },
  { label: "China", code: "+86", placeholder: "131 2345 6789" },
  { label: "Kolumbien", code: "+57", placeholder: "300 1234567" },
  { label: "Kroatien", code: "+385", placeholder: "91 234 5678" },
  { label: "Zypern", code: "+357", placeholder: "96 123456" },
  { label: "Tschechien", code: "+420", placeholder: "601 123 456" },
  { label: "Dänemark", code: "+45", placeholder: "20 12 34 56" },
  { label: "Ägypten", code: "+20", placeholder: "100 123 4567" },
  { label: "Estland", code: "+372", placeholder: "5123 4567" },
  { label: "Finnland", code: "+358", placeholder: "40 123 4567" },
  { label: "Frankreich", code: "+33", placeholder: "6 12 34 56 78" },
  { label: "Georgien", code: "+995", placeholder: "555 12 34 56" },
  { label: "Deutschland", code: "+49", placeholder: "151 23456789" },
  { label: "Griechenland", code: "+30", placeholder: "691 234 5678" },
  { label: "Ungarn", code: "+36", placeholder: "20 123 4567" },
  { label: "Island", code: "+354", placeholder: "611 1234" },
  { label: "Indien", code: "+91", placeholder: "98765 43210" },
  { label: "Indonesien", code: "+62", placeholder: "812 3456 7890" },
  { label: "Irland", code: "+353", placeholder: "85 123 4567" },
  { label: "Israel", code: "+972", placeholder: "50 123 4567" },
  { label: "Italien", code: "+39", placeholder: "312 345 6789" },
  { label: "Japan", code: "+81", placeholder: "90 1234 5678" },
  { label: "Kasachstan", code: "+7", placeholder: "701 123 4567" },
  { label: "Lettland", code: "+371", placeholder: "21 234 567" },
  { label: "Litauen", code: "+370", placeholder: "612 34567" },
  { label: "Luxemburg", code: "+352", placeholder: "621 123 456" },
  { label: "Mexiko", code: "+52", placeholder: "55 1234 5678" },
  { label: "Moldau", code: "+373", placeholder: "69 123 456" },
  { label: "Niederlande", code: "+31", placeholder: "6 12345678" },
  { label: "Neuseeland", code: "+64", placeholder: "21 123 4567" },
  { label: "Norwegen", code: "+47", placeholder: "412 34 567" },
  { label: "Polen", code: "+48", placeholder: "512 345 678" },
  { label: "Portugal", code: "+351", placeholder: "912 345 678" },
  { label: "Rumänien", code: "+40", placeholder: "712 345 678" },
  { label: "Russland", code: "+7", placeholder: "999 123 45 67" },
  { label: "Serbien", code: "+381", placeholder: "60 1234567" },
  { label: "Slowakei", code: "+421", placeholder: "901 123 456" },
  { label: "Slowenien", code: "+386", placeholder: "31 234 567" },
  { label: "Südafrika", code: "+27", placeholder: "82 123 4567" },
  { label: "Südkorea", code: "+82", placeholder: "10 1234 5678" },
  { label: "Spanien", code: "+34", placeholder: "612 34 56 78" },
  { label: "Schweden", code: "+46", placeholder: "70 123 45 67" },
  { label: "Schweiz", code: "+41", placeholder: "78 123 45 67" },
  { label: "Thailand", code: "+66", placeholder: "81 234 5678" },
  { label: "Türkei", code: "+90", placeholder: "532 123 4567" },
  { label: "Ukraine", code: "+380", placeholder: "67 123 4567" },
  { label: "VAE", code: "+971", placeholder: "50 123 4567" },
  { label: "Vereinigtes Königreich", code: "+44", placeholder: "7400 123456" },
  { label: "USA", code: "+1", placeholder: "555 123 4567" },
  { label: "Usbekistan", code: "+998", placeholder: "90 123 45 67" },
  { label: "Vietnam", code: "+84", placeholder: "91 234 56 78" },
];

type PhoneAuthResponse = {
  user: SessionUser;
  isNewUser: boolean;
};

export default function LoginScreen() {
  const [authMode, setAuthMode] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(() => countryOptions.find((country) => country.code === "+49") ?? countryOptions[0]);
  const [countrySelectOpen, setCountrySelectOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [emailMessage, setEmailMessage] = useState("");

  async function handleEmailLogin() {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !password.trim()) {
      setEmailMessage("Gib E-Mail und Passwort ein.");
      return;
    }

    const emailError = getEmailValidationError(trimmedEmail);

    if (emailError) {
      setEmailMessage(emailError);
      return;
    }

    const user = await signInLocalAccount(trimmedEmail, password);

    if (!user) {
      setEmailMessage("Kein Konto mit diesen Daten gefunden.");
      return;
    }

    router.replace(user.onboardingCompleted ? "/discover" : "/onboarding");
  }

  async function requestCode() {
    if (!API_URL) {
      setMessage("API-URL fehlt.");
      return;
    }

    if (!phoneNumber.trim()) {
      setMessage("Gib deine Telefonnummer ein.");
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/auth/phone/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          countryCode: selectedCountry.code,
          phoneNumber,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Der Code konnte nicht gesendet werden.");
      }

      setCodeSent(true);
      setMessage(
        data?.devCode
          ? `Code gesendet. Testcode: ${data.devCode}`
          : "Code gesendet.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Der Code konnte nicht gesendet werden.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function verifyCode() {
    if (!API_URL) {
      setMessage("API-URL fehlt.");
      return;
    }

    if (!verificationCode.trim()) {
      setMessage("Gib den Bestätigungscode ein.");
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/auth/phone/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          countryCode: selectedCountry.code,
          phoneNumber,
          code: verificationCode,
        }),
      });

      const data = (await response.json()) as PhoneAuthResponse & {
        message?: string;
      };

      if (!response.ok) {
        throw new Error(data?.message || "Der Code konnte nicht bestätigt werden.");
      }

      await saveSessionUser(data.user);

      router.replace(
        data.user.onboardingCompleted ? "/discover" : "/onboarding",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Der Code konnte nicht bestätigt werden.",
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

          <Text style={styles.title}>Einloggen</Text>
          <Text style={styles.subtitle}>Schön, dich wieder bei Extasy zu sehen.</Text>

          <View style={styles.modeRow}>
            <TouchableOpacity
              style={[
                styles.modeButton,
                authMode === "email" && styles.activeModeButton,
              ]}
              onPress={() => setAuthMode("email")}
            >
              <Text
                style={[
                  styles.modeText,
                  authMode === "email" && styles.activeModeText,
                ]}
              >
                Email
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modeButton,
                authMode === "phone" && styles.activeModeButton,
              ]}
              onPress={() => setAuthMode("phone")}
            >
              <Text
                style={[
                  styles.modeText,
                  authMode === "phone" && styles.activeModeText,
                ]}
              >
                Telefon
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            {authMode === "email" ? (
              <>
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

                <Text style={styles.label}>Passwort</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Dein Passwort"
                  placeholderTextColor="#ffffff"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />

                <TouchableOpacity
                  style={styles.button}
                  onPress={handleEmailLogin}
                >
                  <Text style={styles.buttonText}>Einloggen</Text>
                </TouchableOpacity>

                {emailMessage ? (
                  <Text style={styles.message}>{emailMessage}</Text>
                ) : null}
              </>
            ) : (
              <>
                <Text style={styles.label}>Ländercode</Text>
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => setCountrySelectOpen(true)}
                  disabled={isLoading || codeSent}
                >
                  <Text style={styles.selectText}>
                    {selectedCountry.label} ({selectedCountry.code})
                  </Text>
                  <Text style={styles.selectArrow}>v</Text>
                </TouchableOpacity>

                <Text style={styles.label}>Telefonnummer</Text>
                <TextInput
                  style={styles.input}
                  placeholder={selectedCountry.placeholder}
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  editable={!codeSent && !isLoading}
                />

                {codeSent ? (
                  <>
                    <Text style={styles.label}>Bestätigungscode</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="6-stelliger Code"
                      placeholderTextColor="#999"
                      keyboardType="number-pad"
                      value={verificationCode}
                      onChangeText={setVerificationCode}
                      editable={!isLoading}
                      maxLength={6}
                    />
                  </>
                ) : null}

                {message ? <Text style={styles.message}>{message}</Text> : null}

                <TouchableOpacity
                  style={[styles.button, isLoading && styles.disabledButton]}
                  onPress={codeSent ? verifyCode : requestCode}
                  disabled={isLoading}
                >
                  <Text style={styles.buttonText}>
                    {isLoading
                      ? "Bitte warten..."
                      : codeSent
                        ? "Code bestätigen"
                        : "Code senden"}
                  </Text>
                </TouchableOpacity>

                {codeSent ? (
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => {
                      setCodeSent(false);
                      setVerificationCode("");
                      setMessage("");
                    }}
                    disabled={isLoading}
                  >
                    <Text style={styles.secondaryText}>
                      Telefonnummer ändern
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        animationType="slide"
        transparent
        visible={countrySelectOpen}
        onRequestClose={() => setCountrySelectOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Land auswählen</Text>
              <TouchableOpacity onPress={() => setCountrySelectOpen(false)}>
                <Text style={styles.modalClose}>Schließen</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {countryOptions.map((country) => (
                <TouchableOpacity
                  key={`${country.label}-${country.code}`}
                  style={styles.countryOption}
                  onPress={() => {
                    setSelectedCountry(country);
                    setCountrySelectOpen(false);
                  }}
                >
                  <Text style={styles.countryOptionName}>{country.label}</Text>
                  <Text style={styles.countryOptionCode}>{country.code}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    lineHeight: 24,
    color: "#ffffff",
    marginTop: 10,
    marginBottom: 28,
  },

  card: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: Platform.OS === "web" ? 28 : 20,
  },

  modeRow: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 4,
    marginBottom: 18,
  },

  modeButton: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  activeModeButton: {
    backgroundColor: "#111",
  },

  modeText: {
    fontSize: 15,
    color: "#111",
  },

  activeModeText: {
    color: "#FFF",
  },

  label: {
    fontSize: 15,
    color: "#111",
    marginBottom: 10,
    marginTop: 18,
  },

  selectButton: {
    flexDirection: "row",
    height: 56,
    borderRadius: 37,
    backgroundColor: "#FFF",
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E5DED7",
    alignItems: "center",
    justifyContent: "space-between",
  },

  selectText: {
    flex: 1,
    fontSize: 16,
    color: "#111",
  },

  selectArrow: {
    fontSize: 22,
    color: "#111",
    marginLeft: 12,
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

  message: {
    fontSize: 13,
    lineHeight: 20,
    color: "#111",
    marginTop: 18,
  },

  button: {
    height: 58,
    borderRadius: 18,
    backgroundColor: "#111",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 34,
  },

  disabledButton: {
    opacity: 0.65,
  },

  buttonText: {
    color: "#FFF",
    fontSize: 17,
  },

  secondaryButton: {
    alignItems: "center",
    marginTop: 18,
  },

  secondaryText: {
    color: "#111",
    fontSize: 15,
    textDecorationLine: "underline",
  },

  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.35)",
  },

  modalSheet: {
    maxHeight: "78%",
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 30,
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  modalTitle: {
    fontSize: 20,
    color: "#111",
  },

  modalClose: {
    fontSize: 15,
    color: "#111",
  },

  countryOption: {
    minHeight: 52,
    borderBottomWidth: 1,
    borderBottomColor: "#F0ECE8",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  countryOptionName: {
    flex: 1,
    fontSize: 15,
    color: "#111",
  },

  countryOptionCode: {
    fontSize: 15,
    color: "#111",
  },
});
