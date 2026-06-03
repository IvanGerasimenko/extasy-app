import { Stack } from "expo-router";
import React from "react";
import { Platform, Text, TextInput } from "react-native";
import { ThemeProvider } from "@/services/theme/ThemeContext";

const appFont = Platform.select({
  ios: "System",
  web: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif",
});

const appTextDefaults = { fontFamily: appFont };
const DefaultText = Text as typeof Text & {
  defaultProps?: { style?: unknown };
};
const DefaultTextInput = TextInput as typeof TextInput & {
  defaultProps?: { style?: unknown };
};

DefaultText.defaultProps = DefaultText.defaultProps ?? {};
DefaultText.defaultProps.style = [
  appTextDefaults,
  DefaultText.defaultProps.style,
];

DefaultTextInput.defaultProps = DefaultTextInput.defaultProps ?? {};
DefaultTextInput.defaultProps.style = [
  appTextDefaults,
  DefaultTextInput.defaultProps.style,
];

if (__DEV__ && Platform.OS === "ios") {
  try {
    const DevLoadingView =
      require("react-native/Libraries/Utilities/DevLoadingView").default;
    DevLoadingView.hide?.();
    DevLoadingView.showMessage = () => {};
  } catch {
    // DevLoadingView is only available in React Native development builds.
  }
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="Splash" options={{ headerShown: false }} />
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="profileSaving" options={{ headerShown: false }} />
        <Stack.Screen name="registration" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="userProfile" options={{ headerShown: false }} />
        <Stack.Screen name="chat" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}
