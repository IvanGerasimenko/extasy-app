import { BackButton } from "@/components/BackButton";
import {
  saveSessionUser,
  signInLocalAccount,
  type SessionUser,
} from "@/services/auth/session";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ImageBackground,
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
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const countryOptions = [
  { label: "Afghanistan", code: "+93", placeholder: "70 123 4567" },
  { label: "Albania", code: "+355", placeholder: "66 123 4567" },
  { label: "Algeria", code: "+213", placeholder: "551 23 45 67" },
  { label: "Argentina", code: "+54", placeholder: "9 11 2345 6789" },
  { label: "Armenia", code: "+374", placeholder: "77 123456" },
  { label: "Australia", code: "+61", placeholder: "412 345 678" },
  { label: "Austria", code: "+43", placeholder: "664 1234567" },
  { label: "Azerbaijan", code: "+994", placeholder: "50 123 45 67" },
  { label: "Belarus", code: "+375", placeholder: "29 123 45 67" },
  { label: "Belgium", code: "+32", placeholder: "470 12 34 56" },
  { label: "Brazil", code: "+55", placeholder: "11 91234 5678" },
  { label: "Bulgaria", code: "+359", placeholder: "88 123 4567" },
  { label: "Canada", code: "+1", placeholder: "555 123 4567" },
  { label: "Chile", code: "+56", placeholder: "9 1234 5678" },
  { label: "China", code: "+86", placeholder: "131 2345 6789" },
  { label: "Colombia", code: "+57", placeholder: "300 1234567" },
  { label: "Croatia", code: "+385", placeholder: "91 234 5678" },
  { label: "Cyprus", code: "+357", placeholder: "96 123456" },
  { label: "Czech Republic", code: "+420", placeholder: "601 123 456" },
  { label: "Denmark", code: "+45", placeholder: "20 12 34 56" },
  { label: "Egypt", code: "+20", placeholder: "100 123 4567" },
  { label: "Estonia", code: "+372", placeholder: "5123 4567" },
  { label: "Finland", code: "+358", placeholder: "40 123 4567" },
  { label: "France", code: "+33", placeholder: "6 12 34 56 78" },
  { label: "Georgia", code: "+995", placeholder: "555 12 34 56" },
  { label: "Germany", code: "+49", placeholder: "151 23456789" },
  { label: "Greece", code: "+30", placeholder: "691 234 5678" },
  { label: "Hungary", code: "+36", placeholder: "20 123 4567" },
  { label: "Iceland", code: "+354", placeholder: "611 1234" },
  { label: "India", code: "+91", placeholder: "98765 43210" },
  { label: "Indonesia", code: "+62", placeholder: "812 3456 7890" },
  { label: "Ireland", code: "+353", placeholder: "85 123 4567" },
  { label: "Israel", code: "+972", placeholder: "50 123 4567" },
  { label: "Italy", code: "+39", placeholder: "312 345 6789" },
  { label: "Japan", code: "+81", placeholder: "90 1234 5678" },
  { label: "Kazakhstan", code: "+7", placeholder: "701 123 4567" },
  { label: "Latvia", code: "+371", placeholder: "21 234 567" },
  { label: "Lithuania", code: "+370", placeholder: "612 34567" },
  { label: "Luxembourg", code: "+352", placeholder: "621 123 456" },
  { label: "Mexico", code: "+52", placeholder: "55 1234 5678" },
  { label: "Moldova", code: "+373", placeholder: "69 123 456" },
  { label: "Netherlands", code: "+31", placeholder: "6 12345678" },
  { label: "New Zealand", code: "+64", placeholder: "21 123 4567" },
  { label: "Norway", code: "+47", placeholder: "412 34 567" },
  { label: "Poland", code: "+48", placeholder: "512 345 678" },
  { label: "Portugal", code: "+351", placeholder: "912 345 678" },
  { label: "Romania", code: "+40", placeholder: "712 345 678" },
  { label: "Russia", code: "+7", placeholder: "999 123 45 67" },
  { label: "Serbia", code: "+381", placeholder: "60 1234567" },
  { label: "Slovakia", code: "+421", placeholder: "901 123 456" },
  { label: "Slovenia", code: "+386", placeholder: "31 234 567" },
  { label: "South Africa", code: "+27", placeholder: "82 123 4567" },
  { label: "South Korea", code: "+82", placeholder: "10 1234 5678" },
  { label: "Spain", code: "+34", placeholder: "612 34 56 78" },
  { label: "Sweden", code: "+46", placeholder: "70 123 45 67" },
  { label: "Switzerland", code: "+41", placeholder: "78 123 45 67" },
  { label: "Thailand", code: "+66", placeholder: "81 234 5678" },
  { label: "Turkey", code: "+90", placeholder: "532 123 4567" },
  { label: "Ukraine", code: "+380", placeholder: "67 123 4567" },
  { label: "United Arab Emirates", code: "+971", placeholder: "50 123 4567" },
  { label: "United Kingdom", code: "+44", placeholder: "7400 123456" },
  { label: "United States", code: "+1", placeholder: "555 123 4567" },
  { label: "Uzbekistan", code: "+998", placeholder: "90 123 45 67" },
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
  const [selectedCountry, setSelectedCountry] = useState(countryOptions[0]);
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
      setEmailMessage("Enter your email and password.");
      return;
    }

    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setEmailMessage("Enter a valid email address.");
      return;
    }

    const user = await signInLocalAccount(trimmedEmail, password);

    if (!user) {
      setEmailMessage("No account found for these login details.");
      return;
    }

    router.replace(user.onboardingCompleted ? "/discover" : "/onboarding");
  }

  async function requestCode() {
    if (!API_URL) {
      setMessage("API URL is missing.");
      return;
    }

    if (!phoneNumber.trim()) {
      setMessage("Enter your phone number.");
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
        throw new Error(data?.message || "Failed to send code.");
      }

      setCodeSent(true);
      setMessage(
        data?.devCode ? `Code sent. Test code: ${data.devCode}` : "Code sent.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Failed to send code.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function verifyCode() {
    if (!API_URL) {
      setMessage("API URL is missing.");
      return;
    }

    if (!verificationCode.trim()) {
      setMessage("Enter the verification code.");
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
        throw new Error(data?.message || "Code verification failed.");
      }

      await saveSessionUser(data.user);

      router.replace(
        data.user.onboardingCompleted ? "/discover" : "/onboarding",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Code verification failed.",
      );
    } finally {
      setIsLoading(false);
    }
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

          <Text style={styles.title}>Log In</Text>
          <Text style={styles.subtitle}>Welcome back to Extasy.</Text>

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
                Phone
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

                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Your password"
                  placeholderTextColor="#999"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />

                <TouchableOpacity
                  style={styles.button}
                  onPress={handleEmailLogin}
                >
                  <Text style={styles.buttonText}>Log In</Text>
                </TouchableOpacity>

                {emailMessage ? (
                  <Text style={styles.message}>{emailMessage}</Text>
                ) : null}
              </>
            ) : (
              <>
                <Text style={styles.label}>Country code</Text>
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

                <Text style={styles.label}>Phone number</Text>
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
                    <Text style={styles.label}>Verification code</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="6-digit code"
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
                      ? "Please wait..."
                      : codeSent
                        ? "Verify Code"
                        : "Send Code"}
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
                      Change phone number
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
              <Text style={styles.modalTitle}>Select country</Text>
              <TouchableOpacity onPress={() => setCountrySelectOpen(false)}>
                <Text style={styles.modalClose}>Close</Text>
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
    lineHeight: 24,
    fontFamily: "Satoshi-Regular",
    color: "#6E6E73",
    marginTop: 10,
    marginBottom: 28,
  },

  card: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    borderRadius: 20,
    padding: 20,
  },

  modeRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.55)",
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
    fontFamily: "Satoshi-Bold",
    color: "#111",
  },

  activeModeText: {
    color: "#FFF",
  },

  label: {
    fontSize: 15,
    fontFamily: "Satoshi-Bold",
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
    fontFamily: "Satoshi-Regular",
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
    fontFamily: "Satoshi-Regular",
    color: "#111",
    borderWidth: 1,
    borderColor: "#E5DED7",
  },

  message: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Satoshi-Regular",
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
    fontFamily: "Satoshi-Bold",
  },

  secondaryButton: {
    alignItems: "center",
    marginTop: 18,
  },

  secondaryText: {
    color: "#111",
    fontSize: 15,
    fontFamily: "Satoshi-Bold",
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
    fontFamily: "Satoshi-Bold",
    color: "#111",
  },

  modalClose: {
    fontSize: 15,
    fontFamily: "Satoshi-Bold",
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
    fontFamily: "Satoshi-Regular",
    color: "#111",
  },

  countryOptionCode: {
    fontSize: 15,
    fontFamily: "Satoshi-Bold",
    color: "#111",
  },
});
