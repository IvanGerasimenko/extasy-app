import {
  getIncomingLikeRequestsForCurrentUser,
  getLikeResponseNotificationsForCurrentUser,
} from "@/services/auth/session";
import { router, usePathname } from "expo-router";
import React, { useEffect, useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const menuItems = [
  {
    route: "/discover",
    icon: require("../../assets/lovesearch.png"),
  },
  {
    route: "/liked",
    icon: require("../../assets/liked.png"),
  },
  {
    route: "/notifications",
    icon: require("../../assets/notification.png"),
    showsBadge: true,
  },
  {
    route: "/chats",
    icon: require("../../assets/chat.png"),
  },
  {
    route: "/profile",
    icon: require("../../assets/profile.png"),
  },
  {
    route: "/settings",
    icon: require("../../assets/logout.png"),
  },
] as const;

export default function BottomMenu() {
  const pathname = usePathname();
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadNotificationCount() {
      const [incomingLikes, likeResponses] = await Promise.all([
        getIncomingLikeRequestsForCurrentUser(),
        getLikeResponseNotificationsForCurrentUser(),
      ]);

      if (!isMounted) {
        return;
      }

      setNotificationCount(incomingLikes.length + likeResponses.length);
    }

    loadNotificationCount();

    return () => {
      isMounted = false;
    };
  }, [pathname]);

  return (
    <View style={styles.menu}>
      {menuItems.map((item) => {
        const isActive = pathname === item.route;

        return (
          <TouchableOpacity
            key={item.route}
            style={[styles.button, isActive && styles.activeButton]}
            onPress={() => router.push(item.route)}
          >
            <Image source={item.icon} style={styles.icon} />
            {"showsBadge" in item && notificationCount ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{notificationCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  menu: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 24,
    zIndex: 20,
    backgroundColor: "rgba(255, 255, 255, 0.78)",
    borderColor: "rgba(255, 255, 255, 0.92)",
    borderWidth: 1,
    borderRadius: 30,
    padding: 8,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 10,
  },

  button: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255, 255, 255, 0.72)",
    alignItems: "center",
    justifyContent: "center",
  },

  activeButton: {
    backgroundColor: "rgba(17, 17, 17, 0.08)",
  },

  icon: {
    width: 24,
    height: 24,
    resizeMode: "contain",
  },

  badge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    borderWidth: 1,
    borderColor: "#FFF",
  },

  badgeText: {
    color: "#FFF",
    fontSize: 11,
    fontFamily: "Satoshi-Bold",
  },
});
