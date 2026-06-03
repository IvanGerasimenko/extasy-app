import { useAppTheme } from "@/services/theme/ThemeContext";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export function ThemeToggle() {
  const { colors, mode, toggleTheme } = useAppTheme();
  const isDark = mode === "dark";

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: isDark }}
      accessibilityLabel="Перемкнути тему"
      hitSlop={12}
      style={[
        styles.toggle,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
      onPress={toggleTheme}
    >
      <View
        style={[
          styles.knob,
          {
            backgroundColor: colors.accent,
            transform: [{ translateX: isDark ? 26 : 0 }],
          },
        ]}
      />
      <Text
        style={[
          styles.label,
          isDark ? styles.darkLabel : styles.lightLabel,
          { color: colors.surfaceText },
        ]}
      >
        {isDark ? "Dark" : "Light"}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  toggle: {
    width: 66,
    height: 38,
    borderRadius: 999,
    borderWidth: 1,
    padding: 4,
    justifyContent: "center",
    zIndex: 20,
    elevation: 20,
  },

  knob: {
    position: "absolute",
    left: 4,
    width: 30,
    height: 30,
    borderRadius: 15,
  },

  label: {
    fontSize: 12,
    fontWeight: "800",
  },

  lightLabel: {
    alignSelf: "flex-end",
    paddingRight: 8,
  },

  darkLabel: {
    alignSelf: "flex-start",
    paddingLeft: 8,
  },
});
