import { useAppTheme } from "@/services/theme/ThemeContext";
import React from "react";
import { Image, type ImageProps } from "react-native";

export function ThemedLogo(props: Omit<ImageProps, "source">) {
  const { mode } = useAppTheme();

  return (
    <Image
      {...props}
      source={
        mode === "dark"
          ? require("../../assets/logolight.png")
          : require("../../assets/logo.png")
      }
    />
  );
}
