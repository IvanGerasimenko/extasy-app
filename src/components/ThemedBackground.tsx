import { useAppTheme } from "@/services/theme/ThemeContext";
import React from "react";
import { StyleSheet, View, type ViewProps } from "react-native";

export function ThemedBackground({ children, style, ...props }: ViewProps) {
  const { colors } = useAppTheme();

  return (
    <View
      {...props}
      style={[styles.background, { backgroundColor: colors.background }, style]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    overflow: "hidden",
  },
});
