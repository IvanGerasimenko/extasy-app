import { ScalePressable } from "@/components/Motion";
import { datingColors } from "@/constants/datingDesign";
import { getUnreadNotificationCountForCurrentUser } from "@/services/auth/session";
import { router, usePathname } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

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
    label: "Profile",
    emoji: "👤",
    icon: require("../../assets/profile.png"),
  },
  {
    route: "/settings",
    label: "Settings",
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
            <MenuButton
              key={item.route}
              isActive={isActive}
              item={item}
              notificationCount={notificationCount}
              onPress={() => {
                if (!isActive) {
                  router.replace(item.route);
                }
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

function MenuButton({
  item,
  isActive,
  notificationCount,
  onPress,
}: {
  item: (typeof menuItems)[number];
  isActive: boolean;
  notificationCount: number;
  onPress: () => void;
}) {
  const activeProgress = useRef(new Animated.Value(isActive ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(activeProgress, {
      toValue: isActive ? 1 : 0,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [activeProgress, isActive]);

  return (
    <ScalePressable style={styles.buttonPressable} onPress={onPress}>
      <View style={[styles.button, isActive && styles.activeButton]}>
        <Animated.View
          style={[
            styles.activeGlow,
            {
              opacity: activeProgress,
              transform: [
                {
                  scale: activeProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.72, 1],
                  }),
                },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.iconBubble,
            {
              transform: [
                {
                  translateY: activeProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -2],
                  }),
                },
                {
                  scale: activeProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.08],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.emojiIcon}>{item.emoji}</Text>
        </Animated.View>
        <Text style={[styles.label, isActive && styles.activeLabel]}>
          {item.label}
        </Text>
        {"showsBadge" in item && notificationCount ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{notificationCount}</Text>
          </View>
        ) : null}
      </View>
    </ScalePressable>
  );
}

const styles = StyleSheet.create({
  menuShell: {
    alignItems: "center",
    backgroundColor: "rgba(11, 21, 29, 0.94)",
  },

  menu: {
    width: "90%",
    paddingHorizontal: 20,
    minHeight: 68,
    backgroundColor: "rgba(11, 21, 29, 0.94)",
    borderColor: "rgba(255, 255, 255, 0.09)",
    borderWidth: 1,
    borderRadius: 28,
    padding: 6,
    flexDirection: "row",
    gap: 20,
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.16,
    shadowRadius: 30,
    elevation: 16,
  },

  buttonPressable: {
    flex: 1,
    minWidth: 0,
  },

  button: {
    width: "100%",
    height: 56,
    borderRadius: 22,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },

  activeButton: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },

  activeGlow: {
    ...StyleSheet.absoluteFill,
    borderRadius: 50,
    backgroundColor: datingColors.accentSoft,
    borderWidth: 1,
    borderColor: "rgba(232, 62, 124, 0.24)",
    paddingVertical: 10,
  },

  iconBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    alignItems: "center",
    justifyContent: "center",
  },

  emojiIcon: {
    fontSize: 17,
  },

  label: {
    color: "rgba(255, 255, 255, 0.56)",
    fontSize: 9,
    fontWeight: "800",
  },

  activeLabel: {
    color: datingColors.text,
  },

  badge: {
    position: "absolute",
    top: 2,
    right: 4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: datingColors.accent,
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
