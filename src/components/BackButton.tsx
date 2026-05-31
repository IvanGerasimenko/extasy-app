import { useRouter } from "expo-router"; // или 'solito', в зависимости от вашего роутера
import React from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";

interface BackButtonProps {
  to?: string;
}

export const BackButton: React.FC<BackButtonProps> = ({ to = "/welcome" }) => {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={() => router.push(to)}
      activeOpacity={0.7} // Делает нажатие более приятным (опционально)
    >
      <Text style={styles.back}>‹</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.78)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 38,
    marginBottom: 38,
  },

  back: {
    color: "#111",
    fontSize: 34,
    lineHeight: 36,
    textAlign: "center",
  },
});
