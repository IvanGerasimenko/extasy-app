import { getUnreadNotificationCountForCurrentUser } from "@/services/auth/session";
import { router, usePathname } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const menuItems = [
  {
    route: "/discover",
    label: "Discover",
    emoji: "🔎",
    icon: require("../../assets/lovesearch.png"),
  },
  {
    route: "/liked",
    label: "Matches",
    emoji: "👩‍❤️‍💋‍👨",
    icon: require("../../assets/liked.png"),
  },
  {
    route: "/chats",
    label: "Chat",
    emoji: "💬",
    icon: require("../../assets/chat.png"),
    showsBadge: true,
  },
  {
    route: "/profile",
    label: "Profil",
    emoji: "👤",
    icon: require("../../assets/profile.png"),
  },
  {
    route: "/settings",
    label: "Einst.",
    emoji: "⚙️",
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
    <View pointerEvents="box-none" style={styles.menuShell}>
      <View style={styles.menu}>
        {menuItems.map((item) => {
          const isActive = pathname === item.route;

          return (
            <TouchableOpacity
              key={item.route}
              style={[styles.button, isActive && styles.activeButton]}
              onPress={() => {
                if (!isActive) {
                  router.replace(item.route);
                }
              }}
            >
              <View
                style={[styles.iconBubble, isActive && styles.activeIconBubble]}
              >
                <Text style={styles.emojiIcon}>{item.emoji}</Text>
                <Image
                  source={item.icon}
                  style={[styles.icon, isActive && styles.activeIcon]}
                />
              </View>
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
    left: 12,
    right: 12,
    bottom: 14,
    zIndex: 100,
    alignItems: "center",
  },

  menu: {
    width: "100%",
    maxWidth: 520,
    minHeight: 68,
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    borderColor: "rgba(255, 255, 255, 0.9)",
    borderWidth: 1,
    borderRadius: 28,
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
    shadowOpacity: 0.18,
    shadowRadius: 26,
    elevation: 16,
  },

  button: {
    flex: 1,
    minWidth: 0,
    height: 56,
    borderRadius: 22,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },

  activeButton: {
    backgroundColor: "rgba(255, 255, 255, 0.72)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.86)",
    shadowColor: "#101820",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 8,
  },

  iconBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.34)",
    alignItems: "center",
    justifyContent: "center",
  },

  activeIconBubble: {
    backgroundColor: "rgba(17, 38, 61, 0.09)",
    transform: [{ scale: 1.04 }],
  },

  emojiIcon: {
    position: "absolute",
    fontSize: 17,
  },

  icon: {
    width: 18,
    height: 18,
    resizeMode: "contain",
    opacity: 0,
  },

  activeIcon: {
    opacity: 0,
  },

  label: {
    color: "rgba(16, 24, 32, 0.64)",
    fontSize: 9,
    fontWeight: "800",
  },

  activeLabel: {
    color: "#101820",
  },

  badge: {
    position: "absolute",
    top: 2,
    right: 4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(29, 123, 98, 0.92)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.86)",
  },

  badgeText: {
    color: "#FFF",
    fontSize: 11,
  },
});
