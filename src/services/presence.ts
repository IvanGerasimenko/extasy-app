import { supabase } from "@/services/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";

const PRESENCE_CHANNEL = "extasy-online-users";
const HEARTBEAT_INTERVAL_MS = 45_000;

type PresenceListener = () => void;

let channel: RealtimeChannel | null = null;
let currentUserId = "";
let heartbeat: ReturnType<typeof setInterval> | null = null;
let appStateSubscription: { remove: () => void } | null = null;
let visibilityHandler: (() => void) | null = null;
let listeners = new Set<PresenceListener>();

async function writeLastSeen(userId: string) {
  if (!userId) return;

  const { error } = await supabase.from("user_presence").upsert(
    {
      user_id: userId,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error && __DEV__) {
    console.warn("Presence heartbeat failed:", error.message);
  }
}

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function isAppActive() {
  if (Platform.OS === "web" && typeof document !== "undefined") {
    return document.visibilityState === "visible";
  }
  return AppState.currentState === "active";
}

async function trackCurrentUser() {
  if (!channel || !currentUserId || !isAppActive()) return;

  await writeLastSeen(currentUserId);
  await channel.track({
    user_id: currentUserId,
    online_at: new Date().toISOString(),
  });
}

async function untrackCurrentUser() {
  if (!channel || !currentUserId) return;
  await writeLastSeen(currentUserId);
  await channel.untrack();
}

function clearRuntimeListeners() {
  if (heartbeat) {
    clearInterval(heartbeat);
    heartbeat = null;
  }
  appStateSubscription?.remove();
  appStateSubscription = null;

  if (
    visibilityHandler &&
    Platform.OS === "web" &&
    typeof document !== "undefined"
  ) {
    document.removeEventListener("visibilitychange", visibilityHandler);
  }
  visibilityHandler = null;
}

export async function startPresenceTracking(userId: string) {
  if (!userId) return;
  if (currentUserId === userId && channel) return;

  await stopPresenceTracking();
  currentUserId = userId;
  channel = supabase.channel(PRESENCE_CHANNEL, {
    config: { presence: { key: userId } },
  });

  channel
    .on("presence", { event: "sync" }, notifyListeners)
    .on("presence", { event: "join" }, notifyListeners)
    .on("presence", { event: "leave" }, notifyListeners)
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        void trackCurrentUser();
      }
    });

  heartbeat = setInterval(() => {
    if (isAppActive()) void trackCurrentUser();
  }, HEARTBEAT_INTERVAL_MS);

  appStateSubscription = AppState.addEventListener("change", (state) => {
    if (state === "active") {
      void trackCurrentUser();
    } else {
      void untrackCurrentUser();
    }
  });

  if (Platform.OS === "web" && typeof document !== "undefined") {
    visibilityHandler = () => {
      if (document.visibilityState === "visible") {
        void trackCurrentUser();
      } else {
        void untrackCurrentUser();
      }
    };
    document.addEventListener("visibilitychange", visibilityHandler);
  }
}

export async function stopPresenceTracking() {
  clearRuntimeListeners();

  if (channel) {
    await untrackCurrentUser();
    await supabase.removeChannel(channel);
  }

  channel = null;
  currentUserId = "";
  notifyListeners();
}

export function subscribeToPresence(listener: PresenceListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function isUserOnline(userId: string) {
  if (!channel || !userId) return false;

  const state = channel.presenceState<{
    user_id?: string;
    online_at?: string;
  }>();
  return Object.values(state).some((presences) =>
    presences.some((presence) => presence.user_id === userId),
  );
}

export async function getUserLastSeen(userId: string) {
  if (!userId) return null;

  const { data, error } = await supabase
    .from("user_presence")
    .select("last_seen_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    if (__DEV__) console.warn("Last seen lookup failed:", error.message);
    return null;
  }

  return data?.last_seen_at ?? null;
}
