import { PremiumTag } from "@/components/PremiumUI";
import { ThemedBackground } from "@/components/ThemedBackground";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  premiumColors,
  premiumShadow,
  premiumSpacing,
} from "@/constants/premiumDesign";
import {
  clearSession,
  getSessionUser,
  type SessionUser,
} from "@/services/auth/session";
import { useAppTheme } from "@/services/theme/ThemeContext";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const isWeb = Platform.OS === "web";

export default function SettingsScreen() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { colors } = useAppTheme();
  const surfaceStyle = {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  };

  useEffect(() => {
    let isMounted = true;

    async function loadSettings() {
      const sessionUser = await getSessionUser();

      if (!isMounted) {
        return;
      }

      if (!sessionUser) {
        router.replace("/welcome");
        return;
      }

      setUser(sessionUser);
      setIsLoading(false);
    }

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSignOut() {
    await clearSession();
    router.replace("/welcome");
  }

  if (isLoading) {
    return (
      <ThemedBackground style={styles.background}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.text} />
        </View>
      </ThemedBackground>
    );
  }

  return (
    <ThemedBackground style={styles.background}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text style={[styles.eyebrow, { color: colors.mutedText }]}>
              Extasy
            </Text>
            <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
            <Text style={[styles.subtitle, { color: colors.mutedText }]}>
              Account controls, preferences, and premium experience states.
            </Text>
          </View>
          <ThemeToggle />
        </View>

        <View style={[styles.card, surfaceStyle]}>
          <Text style={[styles.cardTitle, { color: colors.surfaceText }]}>
            {user?.name ?? "Your account"}
          </Text>
          <Text style={[styles.cardText, { color: colors.surfaceMutedText }]}>
            {user?.email ?? user?.phoneNumber ?? "Profile settings"}
          </Text>
          <View style={styles.settingsTags}>
            <PremiumTag label="Premium modal" tone="gold" />
            <PremiumTag label="Bottom sheet ready" tone="navy" />
          </View>
        </View>

        <View style={[styles.card, surfaceStyle]}>
          {["Notifications", "Discovery preferences", "Safety center"].map(
            (label) => (
              <View key={label} style={styles.settingsRow}>
                <Text style={[styles.rowText, { color: colors.surfaceText }]}>
                  {label}
                </Text>
                <Text style={styles.rowChevron}>›</Text>
              </View>
            ),
          )}
        </View>

        <TouchableOpacity
          style={[styles.secondaryButton, surfaceStyle]}
          onPress={() => router.push("/onboarding")}
        >
          <Text style={[styles.secondaryText, { color: colors.surfaceText }]}>
            Edit Profile
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.signOutButton,
            {
              backgroundColor:
                colors.mode === "dark" ? colors.surface : colors.text,
              borderColor: colors.border,
            },
          ]}
          onPress={handleSignOut}
        >
          <Text
            style={[
              styles.signOutText,
              {
                color: colors.mode === "dark" ? colors.surfaceText : "#FFFFFF",
              },
            ]}
          >
            Sign Out
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </ThemedBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
  },

  container: {
    width: "100%",
    maxWidth: isWeb ? 900 : 560,
    alignSelf: "center",
    paddingHorizontal: isWeb ? 34 : premiumSpacing.screenX,
    paddingTop: isWeb ? 34 : premiumSpacing.screenTop,
    paddingBottom: isWeb ? 150 : premiumSpacing.screenBottom,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 8,
  },

  headerCopy: {
    flex: 1,
    minWidth: 0,
  },

  eyebrow: {
    color: "#6E6E73",
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
  },

  title: {
    color: "#111",
    fontSize: 36,
    lineHeight: 40,
    fontWeight: "800",
    marginTop: 4,
  },

  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    paddingRight: 4,
  },

  card: {
    borderRadius: 26,
    backgroundColor: "rgba(255, 255, 255, 0.82)",
    borderWidth: 1,
    padding: 20,
    marginTop: 16,
    ...premiumShadow,
  },

  cardTitle: {
    color: "#111",
    fontSize: 22,
  },

  cardText: {
    color: "#6E6E73",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },

  secondaryButton: {
    height: 56,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.82)",
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },

  secondaryText: {
    color: "#111",
    fontSize: 16,
  },

  signOutButton: {
    height: 58,
    borderRadius: 20,
    backgroundColor: "#111",
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },

  signOutText: {
    color: "#FFF",
    fontSize: 17,
  },

  settingsTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 16,
  },

  settingsRow: {
    minHeight: 52,
    borderBottomWidth: 1,
    borderBottomColor: premiumColors.hairline,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  rowText: {
    fontSize: 15,
    fontWeight: "700",
  },

  rowChevron: {
    color: premiumColors.champagne,
    fontSize: 24,
  },
});
