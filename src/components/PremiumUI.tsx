import {
  premiumColors,
  premiumShadow,
  premiumType,
} from "@/constants/premiumDesign";
import { FadeIn, ScalePressable } from "@/components/Motion";
import React from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type ImageSourcePropType,
  type TextInputProps,
  type ViewStyle,
} from "react-native";

export function PremiumHeader({
  eyebrow,
  title,
  subtitle,
  right,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <FadeIn style={styles.header}>
      <View style={styles.headerCopy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </FadeIn>
  );
}

export function PremiumButton({
  title,
  onPress,
  variant = "primary",
  disabled,
}: {
  title: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
}) {
  const isPrimary = variant === "primary";

  return (
    <ScalePressable
      style={styles.buttonPressable}
      onPress={onPress}
      disabled={disabled}
    >
      <View
        style={[
          styles.button,
          isPrimary ? styles.primaryButton : styles.secondaryButton,
          variant === "ghost" && styles.ghostButton,
        ]}
      >
        <Text style={isPrimary ? styles.primaryButtonText : styles.buttonText}>
          {title}
        </Text>
      </View>
    </ScalePressable>
  );
}

export function PremiumIconButton({
  label,
  icon,
  onPress,
  style,
}: {
  label: string;
  icon?: ImageSourcePropType;
  onPress?: () => void;
  style?: ViewStyle;
}) {
  return (
    <TouchableOpacity
      accessibilityLabel={label}
      activeOpacity={0.82}
      style={[styles.iconButton, style]}
      onPress={onPress}
    >
      {icon ? <Image source={icon} style={styles.iconImage} /> : null}
      {!icon ? <Text style={styles.iconFallback}>{label.slice(0, 1)}</Text> : null}
    </TouchableOpacity>
  );
}

export function PremiumTag({
  label,
  selected,
  tone = "neutral",
}: {
  label: string;
  selected?: boolean;
  tone?: "neutral" | "gold" | "emerald" | "violet" | "navy";
}) {
  return (
    <View
      style={[
        styles.tag,
        tone === "gold" && styles.goldTag,
        tone === "emerald" && styles.emeraldTag,
        tone === "violet" && styles.violetTag,
        tone === "navy" && styles.navyTag,
        selected && styles.selectedTag,
      ]}
    >
      <Text style={[styles.tagText, selected && styles.selectedTagText]}>
        {label}
      </Text>
    </View>
  );
}

export function CompatibilityBadge({ value = "86%" }: { value?: string }) {
  return (
    <View style={styles.compatibilityBadge}>
      <Text style={styles.compatibilityValue}>{value}</Text>
      <Text style={styles.compatibilityLabel}>Match</Text>
    </View>
  );
}

export function PremiumTextInput(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor="#8C8580"
      {...props}
      style={[styles.input, props.multiline && styles.textarea, props.style]}
    />
  );
}

export function PremiumSearchBar({
  value,
  onChangeText,
}: {
  value?: string;
  onChangeText?: (value: string) => void;
}) {
  return (
    <View style={styles.search}>
      <Text style={styles.searchIcon}>⌕</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Matches suchen"
        placeholderTextColor="#8C8580"
        style={styles.searchInput}
      />
    </View>
  );
}

export function PremiumEmptyState({
  title,
  text,
  action,
  onAction,
}: {
  title: string;
  text: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyMark}>
        <Text style={styles.emptyMarkText}>E</Text>
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
      {action ? (
        <PremiumButton title={action} onPress={onAction} variant="secondary" />
      ) : null}
    </View>
  );
}

export function PremiumLoadingState({ label = "Profile werden ausgewählt" }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={premiumColors.navy} size="large" />
      <View style={styles.skeletonWide} />
      <View style={styles.skeletonShort} />
      <Text style={styles.loadingLabel}>{label}</Text>
    </View>
  );
}

export function PremiumBottomSheet({ children }: { children: React.ReactNode }) {
  return <View style={styles.bottomSheet}>{children}</View>;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 22,
  },

  headerCopy: {
    flex: 1,
  },

  eyebrow: {
    ...premiumType.label,
    color: premiumColors.champagne,
    textTransform: "uppercase",
    marginBottom: 7,
  },

  title: {
    ...premiumType.display,
    color: premiumColors.ink,
  },

  subtitle: {
    ...premiumType.body,
    color: premiumColors.muted,
    marginTop: 8,
  },

  button: {
    minHeight: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  buttonPressable: {
    width: "100%",
  },

  primaryButton: {
    backgroundColor: premiumColors.ink,
  },

  secondaryButton: {
    backgroundColor: premiumColors.white,
    borderWidth: 1,
    borderColor: premiumColors.hairline,
  },

  ghostButton: {
    backgroundColor: "transparent",
  },

  disabled: {
    opacity: 0.58,
  },

  primaryButtonText: {
    color: premiumColors.white,
    fontSize: 15,
    fontWeight: "800",
  },

  buttonText: {
    color: premiumColors.ink,
    fontSize: 15,
    fontWeight: "800",
  },

  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: premiumColors.white,
    borderWidth: 1,
    borderColor: premiumColors.hairline,
    alignItems: "center",
    justifyContent: "center",
    ...premiumShadow,
  },

  iconImage: {
    width: 22,
    height: 22,
    resizeMode: "contain",
    tintColor: premiumColors.ink,
  },

  iconFallback: {
    color: premiumColors.ink,
    fontSize: 17,
    fontWeight: "800",
  },

  tag: {
    minHeight: 36,
    borderRadius: 14,
    paddingHorizontal: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: premiumColors.white,
    borderWidth: 1,
    borderColor: premiumColors.hairline,
  },

  goldTag: {
    backgroundColor: premiumColors.champagneSoft,
    borderColor: "#E4D0A5",
  },

  emeraldTag: {
    backgroundColor: premiumColors.emeraldSoft,
    borderColor: "#C5E1D8",
  },

  violetTag: {
    backgroundColor: premiumColors.violetSoft,
    borderColor: "#D8D0ED",
  },

  navyTag: {
    backgroundColor: premiumColors.navySoft,
    borderColor: "#CEDAE5",
  },

  selectedTag: {
    backgroundColor: premiumColors.ink,
    borderColor: premiumColors.ink,
  },

  tagText: {
    color: premiumColors.charcoal,
    fontSize: 12,
    fontWeight: "700",
  },

  selectedTagText: {
    color: premiumColors.white,
  },

  compatibilityBadge: {
    minWidth: 78,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.93)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.76)",
  },

  compatibilityValue: {
    color: premiumColors.emerald,
    fontSize: 16,
    fontWeight: "900",
  },

  compatibilityLabel: {
    color: premiumColors.muted,
    fontSize: 10,
    fontWeight: "800",
    marginTop: 1,
  },

  input: {
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: premiumColors.white,
    borderWidth: 1,
    borderColor: premiumColors.hairline,
    color: premiumColors.ink,
    paddingHorizontal: 16,
    fontSize: 15,
  },

  textarea: {
    minHeight: 118,
    paddingTop: 16,
    textAlignVertical: "top",
  },

  search: {
    height: 54,
    borderRadius: 18,
    backgroundColor: premiumColors.white,
    borderWidth: 1,
    borderColor: premiumColors.hairline,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 10,
  },

  searchIcon: {
    color: premiumColors.champagne,
    fontSize: 24,
    lineHeight: 26,
  },

  searchInput: {
    flex: 1,
    height: "100%",
    color: premiumColors.ink,
    fontSize: 15,
  },

  empty: {
    minHeight: 310,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.82)",
    borderWidth: 1,
    borderColor: premiumColors.hairline,
    padding: 26,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },

  emptyMark: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: premiumColors.navy,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyMarkText: {
    color: premiumColors.champagne,
    fontSize: 22,
    fontWeight: "900",
  },

  emptyTitle: {
    ...premiumType.title,
    color: premiumColors.ink,
    textAlign: "center",
  },

  emptyText: {
    ...premiumType.body,
    color: premiumColors.muted,
    textAlign: "center",
    marginBottom: 8,
  },

  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    gap: 14,
  },

  skeletonWide: {
    width: "72%",
    height: 18,
    borderRadius: 9,
    backgroundColor: "#EAE3DA",
    marginTop: 10,
  },

  skeletonShort: {
    width: "46%",
    height: 18,
    borderRadius: 9,
    backgroundColor: "#EFE9E1",
  },

  loadingLabel: {
    color: premiumColors.muted,
    fontSize: 13,
    fontWeight: "700",
  },

  bottomSheet: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: premiumColors.white,
    borderWidth: 1,
    borderColor: premiumColors.hairline,
    padding: 22,
    ...premiumShadow,
  },
});
