import { Platform } from "react-native";

export const premiumColors = {
  ink: "#101820",
  charcoal: "#252A31",
  muted: "#69717C",
  hairline: "#E6E0D8",
  ivory: "#ff7fdf",
  porcelain: "#ffffff",
  champagne: "#ff6a8b",
  champagneSoft: "#ff5068",
  navy: "#11263D",
  navySoft: "#E8EEF4",
  emerald: "#1D7B62",
  emeraldSoft: "#E5F3EF",
  violet: "#7768AE",
  violetSoft: "#ffa5ef",
  danger: "#8D3434",
  white: "#FFFFFF",
};

export const premiumSpacing = {
  screenX: 20,
  screenTop: Platform.OS === "web" ? 44 : 64,
  screenBottom: Platform.OS === "web" ? 140 : 128,
  radius: 24,
  cardRadius: 30,
};

export const premiumType = {
  display: {
    fontSize: 34,
    lineHeight: 39,
    fontWeight: "800" as const,
    letterSpacing: 0,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "800" as const,
    letterSpacing: 0,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800" as const,
    letterSpacing: 0,
  },
};

export const premiumShadow = {
  shadowColor: "#1E1306",
  shadowOffset: { width: 0, height: 18 },
  shadowOpacity: 0.12,
  shadowRadius: 28,
  elevation: 10,
};
