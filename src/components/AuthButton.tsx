import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity } from "react-native";

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
    <TouchableOpacity
      style={[styles.button, isDark ? styles.darkButton : styles.lightButton]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Image source={icon} style={styles.icon} resizeMode="contain" />

      <Text style={[styles.text, isDark ? styles.darkText : styles.lightText]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: "100%",
    height: 56,
    borderRadius: 37,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
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
    fontFamily: "Satoshi-Bold",
  },

  lightText: {
    color: "#ffffff",
    fontFamily: "Satoshi-Regular",
  },

  darkText: {
    color: "#000000",
    fontFamily: "Satoshi-Regular",
  },
});
