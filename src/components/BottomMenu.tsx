import { getUnreadNotificationCountForCurrentUser } from "@/services/auth/session";
import { router, usePathname } from "expo-router";
import React, { useEffect, useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const menuItems = [
  {
    route: "/discover",
    label: "Discover",
    icon: require("../../assets/lovesearch.png"),
  },
  {
    route: "/liked",
    label: "Matches",
    icon: require("../../assets/liked.png"),
  },
  {
    route: "/chats",
    label: "Chat",
    icon: require("../../assets/chat.png"),
    showsBadge: true,
  },
  {
    route: "/profile",
    label: "Profile",
    icon: require("../../assets/profile.png"),
  },
  {
    route: "/settings",
    label: "Settings",
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
              <Text style={[styles.label, isActive && styles.activeLabel]}>
                {item.label}
              </Text>
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
    bottom: 22,
    zIndex: 20,
    alignItems: "center",
  },

  menu: {
    width: "92%",
    maxWidth: 520,
    backgroundColor: "rgba(255, 252, 247, 0.94)",
    borderColor: "#E6E0D8",
    borderWidth: 1,
    borderRadius: 26,
    padding: 6,
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#1E1306",
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
    height: 54,
    borderRadius: 20,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },

  activeButton: {
    backgroundColor: "#11263D",
  },

  icon: {
    width: 21,
    height: 21,
    resizeMode: "contain",
    tintColor: "#69717C",
  },

  activeIcon: {
    tintColor: "#C7A76C",
  },

  label: {
    color: "#69717C",
    fontSize: 10,
    fontWeight: "800",
  },

  activeLabel: {
    color: "#FFFCF7",
  },

  badge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#1D7B62",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    borderWidth: 1,
    borderColor: "#FFFCF7",
  },

  badgeText: {
    color: "#FFF",
    fontSize: 11,
  },
});
