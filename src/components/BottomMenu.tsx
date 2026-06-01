import { getUnreadNotificationCountForCurrentUser } from "@/services/auth/session";
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
      const unreadCount = await getUnreadNotificationCountForCurrentUser();

      if (!isMounted) {
        return;
      }

      setNotificationCount(unreadCount);
    }

    loadNotificationCount();

    return () => {
      isMounted = false;
    };
  }, [pathname]);

  return (
    <View style={styles.menuShell}>
      <View style={styles.menu}>
        {menuItems.map((item) => {
          const isActive = pathname === item.route;

          return (
            <TouchableOpacity
              key={item.route}
              style={[styles.button, isActive && styles.activeButton]}
              onPress={() => router.push(item.route)}
            >
              <Image
                source={item.icon}
                style={[styles.icon, isActive && styles.activeIcon]}
              />
              {"showsBadge" in item && notificationCount ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{notificationCount}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  menuShell: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 24,
    zIndex: 20,
    alignItems: "center",
  },

  menu: {
    width: "90%",
    maxWidth: 520,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderColor: "rgba(255, 255, 255, 0.92)",
    borderWidth: 1,
    borderRadius: 999,
    padding: 7,
    flexDirection: "row",
    gap: 8,
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
    height: 48,
    borderRadius: 999,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },

  activeButton: {
    backgroundColor: "rgba(255, 68, 88, 0.14)",
  },

  icon: {
    width: 24,
    height: 24,
    resizeMode: "contain",
  },

  activeIcon: {
    tintColor: "#FF4458",
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
  },
});
