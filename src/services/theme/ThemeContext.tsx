import * as SecureStore from "expo-secure-store";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Platform } from "react-native";

type ThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "extasy.theme.mode";
const ThemeContext = createContext<ThemeContextValue | null>(null);

function getInitialTheme(): ThemeMode {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return savedTheme === "dark" ? "dark" : "light";
  }

  return "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(getInitialTheme);

  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }

    let isMounted = true;

    async function loadTheme() {
      const savedTheme = await SecureStore.getItemAsync(THEME_STORAGE_KEY);

      if (isMounted && (savedTheme === "dark" || savedTheme === "light")) {
        setMode(savedTheme);
      }
    }

    loadTheme();

    return () => {
      isMounted = false;
    };
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    const colors = mode === "dark" ? darkColors : lightColors;

    return {
      mode,
      colors,
      toggleTheme: () => {
        setMode((currentMode) => {
          const nextMode = currentMode === "dark" ? "light" : "dark";

          if (Platform.OS === "web" && typeof window !== "undefined") {
            window.localStorage.setItem(THEME_STORAGE_KEY, nextMode);
          } else {
            void SecureStore.setItemAsync(THEME_STORAGE_KEY, nextMode);
          }

          return nextMode;
        });
      },
    };
  }, [mode]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const value = useContext(ThemeContext);

  if (!value) {
    throw new Error("useAppTheme must be used inside ThemeProvider");
  }

  return value;
}

type ThemePalette = {
  mode: ThemeMode;
  background: string;
  surface: string;
  surfaceStrong: string;
  text: string;
  mutedText: string;
  surfaceText: string;
  surfaceMutedText: string;
  border: string;
  accent: string;
};

type ThemeContextValue = {
  mode: ThemeMode;
  colors: ThemePalette;
  toggleTheme: () => void;
};

const lightColors: ThemePalette = {
  mode: "light",
  background: "#F8F5EF",
  surface: "rgba(255, 255, 255, 0.78)",
  surfaceStrong: "#FFFFFF",
  text: "#101820",
  mutedText: "#69717C",
  surfaceText: "#101820",
  surfaceMutedText: "#69717C",
  border: "#E6E0D8",
  accent: "#C7A76C",
};

const darkColors: ThemePalette = {
  mode: "dark",
  background: "#101820",
  surface: "rgba(255, 255, 255, 0.92)",
  surfaceStrong: "#FFFFFF",
  text: "#F8F5EF",
  mutedText: "#C8C2B8",
  surfaceText: "#101820",
  surfaceMutedText: "#69717C",
  border: "rgba(255, 255, 255, 0.18)",
  accent: "#C7A76C",
};
