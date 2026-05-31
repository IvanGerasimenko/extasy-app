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
      onPress={() => router.push("/welcome")}
      activeOpacity={0.7} // Делает нажатие более приятным (опционально)
    >
      <Text style={styles.back}>Sign Up</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  back: {
    fontSize: 16,
    color: "#ffffff", // Стандартный синий цвет для ссылок, измени под свой дизайн
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: "black",
    borderRadius: 37,
    marginTop: 38,
    marginBottom: 38,
    maxWidth: 100,
    textAlign: "center",
    fontFamily: "Satoshi-Bold", // Используем ваш шрифт
  },
});
