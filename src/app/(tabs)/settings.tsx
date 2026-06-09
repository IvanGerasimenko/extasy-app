import { PremiumTag } from "@/components/PremiumUI";
import { ThemedBackground } from "@/components/ThemedBackground";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  premiumColors,
  premiumShadow,
  premiumSpacing,
} from "@/constants/premiumDesign";
import {
  blockMatchContact,
  clearSession,
  getCurrentUserMatches,
  getSessionUser,
  getUserKey,
  submitReport,
  updateSessionDiscoverVisibility,
  type MatchRecord,
  type SessionUser,
} from "@/services/auth/session";
import { useAppTheme } from "@/services/theme/ThemeContext";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const isWeb = Platform.OS === "web";

export default function SettingsScreen() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [messageRequestsLimited, setMessageRequestsLimited] = useState(true);
  const [profileVisibilityLimited, setProfileVisibilityLimited] =
    useState(false);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [safetyMessage, setSafetyMessage] = useState("");
  const [reportReasonOpen, setReportReasonOpen] = useState(false);
  const [selectedReportReason, setSelectedReportReason] = useState<
    string | null
  >(null);
  const [customProblemText, setCustomProblemText] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  const reportReasons = [
    "Fehler in der App",
    "Problem beim Login",
    "Discover funktioniert nicht richtig",
    "Chats oder Nachrichten verschwinden",
    "Problem mit Premium",
    "Sicherheits- oder Datenschutzfrage",
    "Anderes Problem",
  ];
  const { colors } = useAppTheme();
  const surfaceStyle = {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  };
  const settingActions = [
    {
      emoji: "🎯",
      title: "Suchpräferenzen",
      text: "Geschlecht, Land, Interessen und Profil.",
      status: "Ändern",
      onPress: () => router.push("/onboarding?edit=1"),
    },
    {
      emoji: "🛡️",
      title: "Sicherheitscenter",
      text: "Ruhiges Dating und Kontrolle über Kontakte.",
      status: "Aktiviert",
      onPress: () => setSafetyOpen(true),
    },
  ];

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
      setProfileVisibilityLimited(Boolean(sessionUser.isDiscoverHidden));
      setMatches(await getCurrentUserMatches());
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

  async function handleBlockContact(match: MatchRecord) {
    const result = await blockMatchContact(match.id);

    if (!result) {
      setSafetyMessage("Moderation: Der Kontakt konnte nicht blockiert werden.");
      return;
    }

    setMatches((currentMatches) =>
      currentMatches.filter(
        (item) => !item.userKeys.includes(result.blockedUserKey),
      ),
    );
    setSafetyMessage(
      `Moderation: ${result.blockedUser?.name ?? "Kontakt"} wurde blockiert. Chat und Nachrichten wurden gelöscht.`,
    );
  }

  function toggleMessageFilter() {
    setMessageRequestsLimited((currentValue) => {
      const nextValue = !currentValue;
      setSafetyMessage(
        nextValue
          ? "Moderation: Nachrichtenfilter aktiviert. Verdächtige Kontakte werden stummgeschaltet."
          : "Moderation: Nachrichtenfilter deaktiviert. Du siehst mehr Nachrichten.",
      );
      return nextValue;
    });
  }

  async function toggleProfileVisibility() {
    const nextValue = !profileVisibilityLimited;
    const updatedUser = await updateSessionDiscoverVisibility(nextValue);

    if (updatedUser) {
      setUser(updatedUser);
    }

    setProfileVisibilityLimited(nextValue);
    setSafetyMessage(
      nextValue
        ? "Moderation: Sichtbarkeit eingeschränkt. Dein Profil wird in Discover nicht angezeigt."
        : "Moderation: Sichtbarkeit wiederhergestellt. Dein Profil kann wieder in Discover erscheinen.",
    );
  }

  async function handleReportReason(reason: string) {
    setSelectedReportReason(reason);

    if (reason === "Anderes Problem") {
      return;
    }

    setIsSubmittingReport(true);

    try {
      await submitReport({ category: reason });
      setCustomProblemText("");
      setReportReasonOpen(false);
      setSafetyMessage(
        `Support: Anfrage gespeichert. Thema: ${reason}. Wir prüfen die Meldung.`,
      );
      setTimeout(() => setSafetyOpen(true), 180);
    } catch (error) {
      setSafetyMessage(
        error instanceof Error
          ? `Support: ${error.message}`
          : "Support: Die Meldung konnte nicht gesendet werden.",
      );
    } finally {
      setIsSubmittingReport(false);
    }
  }

  async function handleCustomProblemSubmit() {
    const problemText = customProblemText.trim();

    if (!problemText) {
      setSafetyMessage("Support: Beschreibe das Problem vor dem Senden.");
      return;
    }

    setIsSubmittingReport(true);

    try {
      await submitReport({
        category: "Anderes Problem",
        description: problemText,
      });
      setReportReasonOpen(false);
      setSafetyMessage("Support: Deine Meldung wurde gespeichert.");
      setCustomProblemText("");
      setTimeout(() => setSafetyOpen(true), 180);
    } catch (error) {
      setSafetyMessage(
        error instanceof Error
          ? `Support: ${error.message}`
          : "Support: Die Meldung konnte nicht gesendet werden.",
      );
    } finally {
      setIsSubmittingReport(false);
    }
  }

  function openReportReasonModal() {
    setSelectedReportReason(null);
    setCustomProblemText("");
    setSafetyOpen(false);
    setTimeout(() => setReportReasonOpen(true), 220);
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
            <Text style={[styles.title, { color: colors.text }]}>
              Einstellungen
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedText }]}>
              Verwalte Konto, Vorlieben und Premium-Erlebnis.
            </Text>
          </View>
          <ThemeToggle />
        </View>

        <View style={[styles.card, surfaceStyle]}>
          <Text style={[styles.cardTitle, { color: colors.surfaceText }]}>
            {user?.name ?? "Dein Konto"}
          </Text>
          <Text style={[styles.cardText, { color: colors.surfaceMutedText }]}>
            {user?.email ?? user?.phoneNumber ?? "Profileinstellungen"}
          </Text>
          <View style={styles.settingsTags}>
            <PremiumTag label="Premium" tone="gold" />
            <PremiumTag label="Profil bereit" tone="navy" />
          </View>
        </View>

        <View style={[styles.actionsCard, surfaceStyle]}>
          {settingActions.map((action) => (
            <TouchableOpacity
              key={action.title}
              activeOpacity={0.82}
              style={styles.settingsRow}
              onPress={action.onPress}
            >
              <View style={styles.rowIcon}>
                <Text style={styles.rowEmoji}>{action.emoji}</Text>
              </View>
              <View style={styles.rowCopy}>
                <Text style={[styles.rowText, { color: colors.surfaceText }]}>
                  {action.title}
                </Text>
                <Text
                  style={[
                    styles.rowDescription,
                    { color: colors.surfaceMutedText },
                  ]}
                >
                  {action.text}
                </Text>
              </View>
              <View style={styles.rowStatus}>
                <Text style={styles.rowStatusText}>{action.status}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.secondaryButton, surfaceStyle]}
          onPress={() => router.push("/onboarding?edit=1")}
        >
          <Text style={[styles.secondaryText, { color: colors.surfaceText }]}>
            Profil bearbeiten
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
            Abmelden
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={safetyOpen} transparent animationType="slide">
        <View style={styles.safetyBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={() => setSafetyOpen(false)}
          />
          <View style={styles.safetySheet}>
            <View style={styles.safetyHandle} />
            <View style={styles.safetyHeader}>
              <View style={styles.safetyIcon}>
                <Text style={styles.safetyIconText}>🛡️</Text>
              </View>
              <View style={styles.safetyHeaderCopy}>
                <Text style={styles.safetyTitle}>Sicherheitscenter</Text>
                <Text style={styles.safetySubtitle}>
                  Tools für ruhige Gespräche und Kontrolle über Kontakte.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.safetyClose}
                onPress={() => setSafetyOpen(false)}
              >
                <Text style={styles.safetyCloseText}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.safetyScroll}
              contentContainerStyle={styles.safetyScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {safetyMessage ? (
                <View style={styles.moderationToast}>
                  <Text style={styles.moderationToastTitle}>Moderation</Text>
                  <Text style={styles.moderationToastText}>
                    {safetyMessage}
                  </Text>
                </View>
              ) : null}

              <View style={styles.blockPanel}>
                <View style={styles.blockHeader}>
                  <View style={styles.blockHeaderIcon}>
                    <Text style={styles.blockHeaderEmoji}>🚫</Text>
                  </View>
                  <Text style={styles.blockTitle}>Kontakt blockieren</Text>
                </View>
                <Text style={styles.blockText}>
                  Der Kontakt wird vollständig aus deinen Chats entfernt, inklusive
                  Nachrichtenverlauf.
                </Text>
                {matches.length ? (
                  matches.map((match) => {
                    const currentUserKey = user ? getUserKey(user) : "";
                    const blockedCandidateKey = match.userKeys.find(
                      (userKey) => userKey !== currentUserKey,
                    );
                    const blockedCandidate = blockedCandidateKey
                      ? match.users[blockedCandidateKey]
                      : null;

                    return (
                      <TouchableOpacity
                        key={match.id}
                        style={styles.blockContactRow}
                        onPress={() => handleBlockContact(match)}
                      >
                        <View style={styles.blockAvatar}>
                          <Text style={styles.blockAvatarText}>
                            {blockedCandidate?.name
                              ?.slice(0, 1)
                              .toUpperCase() ?? "E"}
                          </Text>
                        </View>
                        <View style={styles.blockContactCopy}>
                          <Text style={styles.blockContactName}>
                            {blockedCandidate?.name ?? "Kontakt"}
                          </Text>
                          <Text style={styles.blockContactHint}>
                            Aus /chats entfernen
                          </Text>
                        </View>
                        <Text style={styles.blockContactAction}>Blockieren</Text>
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <View style={styles.blockEmptyState}>
                    <Text style={styles.blockEmptyEmoji}>💞</Text>
                    <Text style={styles.blockEmptyTitle}>
                      Du hast noch keine Matches
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.safetyGrid}>
                <TouchableOpacity
                  style={styles.safetyAction}
                  onPress={openReportReasonModal}
                >
                  <Text style={styles.safetyActionEmoji}>⚠️</Text>
                  <Text style={styles.safetyActionTitle}>Melden</Text>
                  <Text style={styles.safetyActionText}>
                    Melde ein Problem mit der App oder dem Service.
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.safetyControls}>
                <TouchableOpacity
                  style={styles.safetyToggleRow}
                  onPress={toggleMessageFilter}
                >
                  <View style={styles.safetyToggleCopy}>
                    <Text style={styles.safetyToggleTitle}>
                      Nachrichtenfilter
                    </Text>
                    <Text style={styles.safetyToggleText}>
                      Priorität für gegenseitige Matches und bekannte Kontakte.
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.safetySwitch,
                      messageRequestsLimited && styles.safetySwitchActive,
                    ]}
                  >
                    <View
                      style={[
                        styles.safetySwitchKnob,
                        messageRequestsLimited && styles.safetySwitchKnobActive,
                      ]}
                    />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.safetyToggleRow}
                  onPress={toggleProfileVisibility}
                >
                  <View style={styles.safetyToggleCopy}>
                    <Text style={styles.safetyToggleTitle}>
                      Sichtbarkeit einschränken
                    </Text>
                    <Text style={styles.safetyToggleText}>
                      Profil vorsichtiger anzeigen, wenn du eine Pause brauchst.
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.safetySwitch,
                      profileVisibilityLimited && styles.safetySwitchActive,
                    ]}
                  >
                    <View
                      style={[
                        styles.safetySwitchKnob,
                        profileVisibilityLimited &&
                          styles.safetySwitchKnobActive,
                      ]}
                    />
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.safetyTip}>
                <Text style={styles.safetyTipTitle}>💡 Kurzer Tipp</Text>
                <Text style={styles.safetyTipText}>
                  Wechsle nicht in andere Messenger, bevor Vertrauen da ist.
                  Triff dich an öffentlichen Orten und sag vertrauten Personen, wohin
                  du gehst.
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={reportReasonOpen} transparent animationType="fade">
        <View style={styles.reportBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={() => setReportReasonOpen(false)}
          />
          <View style={styles.reportSheet}>
            <View style={styles.reportHeader}>
              <Text style={styles.reportTitle}>Thema der Anfrage</Text>
              <TouchableOpacity
                style={styles.reportClose}
                onPress={() => setReportReasonOpen(false)}
              >
                <Text style={styles.reportCloseText}>×</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.reportSubtitle}>
              Wähle aus, was nicht funktioniert. Das hilft dem Support,
              schneller zu helfen.
            </Text>
            <View style={styles.reportReasons}>
              {reportReasons.map((reason) => (
                <TouchableOpacity
                  key={reason}
                  style={[
                    styles.reportReason,
                    selectedReportReason === reason &&
                      styles.reportReasonSelected,
                  ]}
                  onPress={() => handleReportReason(reason)}
                  disabled={isSubmittingReport}
                >
                  <Text style={styles.reportReasonText}>{reason}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {selectedReportReason === "Anderes Problem" ? (
              <View style={styles.customProblemBox}>
                <TextInput
                  style={styles.customProblemInput}
                  placeholder="Problem beschreiben..."
                  placeholderTextColor={premiumColors.muted}
                  value={customProblemText}
                  onChangeText={setCustomProblemText}
                  multiline
                  textAlignVertical="top"
                />
                <TouchableOpacity
                  activeOpacity={0.82}
                  style={styles.sendProblemButton}
                  onPress={handleCustomProblemSubmit}
                  disabled={isSubmittingReport}
                >
                  <Text style={styles.sendProblemButtonText}>
                    {isSubmittingReport
                      ? "Wird gesendet..."
                      : "Problem senden"}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
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

  actionsCard: {
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    borderWidth: 1,
    padding: 8,
    marginTop: 16,
    gap: 8,
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
    minHeight: 78,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.46)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.74)",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: "#101820",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 6,
  },

  rowIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.62)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.82)",
    alignItems: "center",
    justifyContent: "center",
  },

  rowEmoji: {
    fontSize: 23,
    lineHeight: 28,
  },

  rowCopy: {
    flex: 1,
    minWidth: 0,
  },

  rowText: {
    fontSize: 16,
    fontWeight: "800",
  },

  rowDescription: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },

  rowStatus: {
    minWidth: 76,
    minHeight: 32,
    borderRadius: 16,
    backgroundColor: "rgba(17, 38, 61, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.64)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },

  rowStatusText: {
    color: premiumColors.navy,
    fontSize: 11,
    fontWeight: "900",
  },

  rowChevron: {
    color: premiumColors.champagne,
    fontSize: 24,
  },

  safetyBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(16, 24, 32, 0.34)",
  },

  safetySheet: {
    width: "100%",
    maxWidth: isWeb ? 720 : undefined,
    alignSelf: "center",
    height: isWeb ? undefined : "88%",
    maxHeight: "88%",
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    backgroundColor: "rgba(255, 255, 255, 0.86)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.78)",
    paddingHorizontal: isWeb ? 24 : 16,
    paddingTop: 10,
    paddingBottom: isWeb ? 28 : 24,
    shadowColor: "#101820",
    shadowOffset: { width: 0, height: -18 },
    shadowOpacity: 0.18,
    shadowRadius: 34,
    elevation: 20,
  },

  safetyScroll: {
    flex: 1,
    marginTop: 16,
  },

  safetyScrollContent: {
    flexGrow: 1,
    paddingBottom: 18,
  },

  safetyHandle: {
    width: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(16, 24, 32, 0.18)",
    alignSelf: "center",
    marginBottom: 18,
  },

  safetyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  safetyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255, 255, 255, 0.62)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.86)",
    alignItems: "center",
    justifyContent: "center",
  },

  safetyIconText: {
    fontSize: 27,
  },

  safetyHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },

  safetyTitle: {
    color: premiumColors.ink,
    fontSize: 24,
    fontWeight: "900",
  },

  safetySubtitle: {
    color: premiumColors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },

  safetyClose: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(16, 24, 32, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },

  safetyCloseText: {
    color: premiumColors.ink,
    fontSize: 28,
    lineHeight: 30,
  },

  safetyGrid: {
    flexDirection: isWeb ? "row" : "column",
    gap: 10,
  },

  moderationToast: {
    borderRadius: 22,
    backgroundColor: "rgba(29, 123, 98, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(29, 123, 98, 0.26)",
    padding: 14,
    marginBottom: 12,
  },

  moderationToastTitle: {
    color: premiumColors.emerald,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },

  moderationToastText: {
    color: premiumColors.ink,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },

  safetyAction: {
    flex: 1,
    minHeight: 132,
    borderRadius: 26,
    backgroundColor: "rgba(255, 255, 255, 0.54)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.78)",
    padding: 16,
  },

  safetyActionEmoji: {
    fontSize: 28,
  },

  safetyActionTitle: {
    color: premiumColors.ink,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 10,
  },

  safetyActionText: {
    color: premiumColors.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 5,
  },

  blockPanel: {
    borderRadius: 26,
    backgroundColor: "rgba(255, 255, 255, 0.52)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.78)",
    padding: 14,
    marginTop: 12,
    gap: 10,
  },

  blockHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  blockHeaderIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(141, 52, 52, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },

  blockHeaderEmoji: {
    fontSize: 18,
  },

  blockTitle: {
    flex: 1,
    color: premiumColors.ink,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "900",
  },

  blockText: {
    color: premiumColors.muted,
    fontSize: 12,
    lineHeight: 19,
  },

  blockContactRow: {
    minHeight: 58,
    borderRadius: 20,
    backgroundColor: "rgba(16, 24, 32, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.72)",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },

  blockAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: premiumColors.navy,
    alignItems: "center",
    justifyContent: "center",
  },

  blockAvatarText: {
    color: premiumColors.white,
    fontSize: 16,
    fontWeight: "900",
  },

  blockContactCopy: {
    flex: 1,
    minWidth: 0,
  },

  blockContactName: {
    color: premiumColors.ink,
    fontSize: 14,
    fontWeight: "900",
  },

  blockContactHint: {
    color: premiumColors.muted,
    fontSize: 12,
    marginTop: 2,
  },

  blockContactAction: {
    color: premiumColors.danger,
    fontSize: 12,
    fontWeight: "900",
    flexShrink: 0,
    paddingLeft: 6,
  },

  blockEmptyState: {
    borderRadius: 20,
    backgroundColor: "rgba(16, 24, 32, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.72)",
    alignItems: "center",
    padding: 16,
  },

  blockEmptyEmoji: {
    fontSize: 28,
    lineHeight: 32,
  },

  blockEmptyTitle: {
    color: premiumColors.ink,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "900",
    marginTop: 8,
    textAlign: "center",
  },

  blockEmptyText: {
    color: premiumColors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
    textAlign: "center",
  },

  safetyControls: {
    gap: 10,
    marginTop: 12,
  },

  safetyToggleRow: {
    minHeight: 74,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.48)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.74)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  safetyToggleCopy: {
    flex: 1,
    minWidth: 0,
  },

  safetyToggleTitle: {
    color: premiumColors.ink,
    fontSize: 15,
    fontWeight: "900",
  },

  safetyToggleText: {
    color: premiumColors.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
    maxWidth: 460,
  },

  safetySwitch: {
    width: 52,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(16, 24, 32, 0.14)",
    padding: 3,
  },

  safetySwitchActive: {
    backgroundColor: "rgba(29, 123, 98, 0.86)",
  },

  safetySwitchKnob: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: premiumColors.white,
  },

  safetySwitchKnobActive: {
    transform: [{ translateX: 20 }],
  },

  safetyTip: {
    borderRadius: 24,
    backgroundColor: "rgba(232, 238, 244, 0.8)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.78)",
    padding: 16,
    marginTop: 12,
  },

  safetyTipTitle: {
    color: premiumColors.navy,
    fontSize: 15,
    fontWeight: "900",
  },

  safetyTipText: {
    color: premiumColors.ink,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },

  reportBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(16, 24, 32, 0.38)",
  },

  reportSheet: {
    width: "100%",
    maxWidth: isWeb ? 620 : undefined,
    alignSelf: "center",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.82)",
    paddingHorizontal: isWeb ? 24 : 16,
    paddingTop: 20,
    paddingBottom: isWeb ? 28 : 24,
  },

  reportHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  reportTitle: {
    color: premiumColors.ink,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "900",
  },

  reportClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(16, 24, 32, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },

  reportCloseText: {
    color: premiumColors.ink,
    fontSize: 28,
    lineHeight: 30,
  },

  reportSubtitle: {
    color: premiumColors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },

  reportReasons: {
    gap: 8,
    marginTop: 16,
  },

  reportReason: {
    minHeight: 50,
    borderRadius: 18,
    backgroundColor: "rgba(16, 24, 32, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.74)",
    justifyContent: "center",
    paddingHorizontal: 14,
  },

  reportReasonSelected: {
    backgroundColor: "rgba(29, 123, 98, 0.12)",
    borderColor: "rgba(29, 123, 98, 0.34)",
  },

  reportReasonText: {
    color: premiumColors.ink,
    fontSize: 14,
    fontWeight: "800",
  },

  customProblemBox: {
    gap: 10,
    marginTop: 14,
  },

  customProblemInput: {
    minHeight: 116,
    borderRadius: 18,
    backgroundColor: "rgba(16, 24, 32, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(16, 24, 32, 0.12)",
    color: premiumColors.ink,
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  sendProblemButton: {
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: premiumColors.navy,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },

  sendProblemButtonText: {
    color: premiumColors.white,
    fontSize: 15,
    fontWeight: "900",
  },
});
