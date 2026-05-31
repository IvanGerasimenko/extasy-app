import React, { useEffect } from "react";
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  StyleSheet,
  View,
} from "react-native";

import { router } from "expo-router";

export default function SplashScreen() {
  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("../onboarding");
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return React.createElement(
    ImageBackground,
    {
      source: require("../../assets/bgparis.png"),
      style: styles.background,
      resizeMode: "cover",
    },
    <View style={styles.container}>
      <Image source={require("../../assets/logo.png")} style={styles.logo} />

      <ActivityIndicator size="large" color="#ffffff" style={styles.loader} />
    </View>,
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    minHeight: "100%",
  },

  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  logo: {
    width: 250,
    height: 72,
    backgroundColor: "rgba(255, 0, 0, 0.3)",
    borderRadius: 40,
  },
  loader: {
    marginTop: 28,
  },
});
