import { useAppTheme } from "@/services/theme/ThemeContext";
import React from "react";
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  View,
  type ViewProps,
  type ViewStyle,
} from "react-native";

const webScrollableBackground =
  Platform.OS === "web"
    ? ({
        height: "100dvh",
        minHeight: "100svh",
        overflow: "auto",
        overscrollBehavior: "none",
      } as unknown as ViewStyle)
    : null;

export function ThemedBackground({ children, style, ...props }: ViewProps) {
  const { colors } = useAppTheme();
  const reveal = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(reveal, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [reveal]);

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
      <Animated.View
        style={[
          styles.content,
          {
            opacity: reveal,
          },
        ]}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    overflow: "hidden",
  },
  content: {
    flex: 1,
    width: "100%",
  },
});
