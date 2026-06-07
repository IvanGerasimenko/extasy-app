import { ScalePressable } from "@/components/Motion";
import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";

type AuthButtonProps = {
  title: string;
  icon: any;
  onPress: () => void;
  variant?: "Dark" | "Light";
};

export default function AuthButton({
  title,
  icon,
  onPress,
  variant = "Dark",
}: AuthButtonProps) {
  const isDark = variant === "Dark";

  return (
    <ScalePressable
      style={styles.pressable}
      onPress={onPress}
    >
      <View
        style={[styles.button, isDark ? styles.darkButton : styles.lightButton]}
      >
        <Image source={icon} style={styles.icon} resizeMode="contain" />
        <Text style={[styles.text, isDark ? styles.darkText : styles.lightText]}>
          {title}
        </Text>
      </View>
    </ScalePressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    width: "100%",
    marginBottom: 14,
  },
  button: {
    width: "100%",
    height: 60,
    borderRadius: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.72)",
  },

  lightButton: {
    backgroundColor: "#000000",
  },

  darkButton: {
    backgroundColor: "#ffffff",
  },

  icon: {
    width: 32,
    height: 32,
  },

  text: {
    fontSize: 16,
    fontWeight: "800",
  },

  lightText: {
    color: "#ffffff",
  },

  darkText: {
    color: "#000000",
  },
});
