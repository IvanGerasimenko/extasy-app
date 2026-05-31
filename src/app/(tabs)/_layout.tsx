import BottomMenu from "@/components/BottomMenu";
import { Tabs } from "expo-router";
import React from "react";

export default function TabsLayout() {
  return (
    <Tabs
      initialRouteName="discover"
      screenOptions={{
        headerShown: false,
        lazy: false,
      }}
      tabBar={() => <BottomMenu />}
    >
      <Tabs.Screen name="discover" />
      <Tabs.Screen name="liked" />
      <Tabs.Screen name="notifications" />
      <Tabs.Screen name="chats" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
