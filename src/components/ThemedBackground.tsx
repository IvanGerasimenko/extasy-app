import { useAppTheme } from "@/services/theme/ThemeContext";
import React from "react";
import {
  Platform,
  StyleSheet,
  View,
  type ViewProps,
  type ViewStyle,
} from "react-native";

const webScrollableBackground =
  Platform.OS === "web"
    ? ({
        minHeight: "100vh",
        overflow: "auto",
      } as unknown as ViewStyle)
    : null;

export function ThemedBackground({ children, style, ...props }: ViewProps) {
  const { colors } = useAppTheme();

  return (
    <View
      {...props}
      style={[
        styles.background,
        webScrollableBackground,
        { backgroundColor: colors.background },
        style,
      ]}
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
