import { supabase } from "@/services/supabase";
import { Platform } from "react-native";

const vapidPublicKey =
  process.env.EXPO_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY ?? "";

export type WebPushState =
  | "unsupported"
  | "default"
  | "denied"
  | "enabled";

function isWebPushSupported() {
  return (
    Platform.OS === "web" &&
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    Boolean(vapidPublicKey)
  );
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const bytes = window.atob(base64);
  return Uint8Array.from(bytes, (character) => character.charCodeAt(0));
}

async function getRegistration() {
  await navigator.serviceWorker.register("/web-push-sw.js", { scope: "/" });
  return navigator.serviceWorker.ready;
}

export async function getWebPushState(): Promise<WebPushState> {
  if (!isWebPushSupported()) {
    return "unsupported";
  }

  if (Notification.permission === "denied") {
    return "denied";
  }

  const registration = await getRegistration();
  const subscription = await registration.pushManager.getSubscription();
  return subscription ? "enabled" : "default";
}

export async function enableWebPush(): Promise<WebPushState> {
  if (!isWebPushSupported()) {
    return "unsupported";
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return permission === "denied" ? "denied" : "default";
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Melde dich an, um Push-Mitteilungen zu aktivieren.");
  }

  const registration = await getRegistration();
  const existingSubscription =
    await registration.pushManager.getSubscription();
  const subscription =
    existingSubscription ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    }));
  const serialized = subscription.toJSON();
  const p256dh = serialized.keys?.p256dh;
  const auth = serialized.keys?.auth;

  if (!p256dh || !auth) {
    throw new Error("Der Browser hat keine gültige Push-Anmeldung erstellt.");
  }

  const result = await supabase.from("web_push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: subscription.endpoint,
      p256dh,
      auth,
      user_agent: navigator.userAgent,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" },
  );

  if (result.error) {
    throw new Error(result.error.message);
  }

  return "enabled";
}

export async function disableWebPush(): Promise<WebPushState> {
  if (!isWebPushSupported()) {
    return "unsupported";
  }

  const registration = await getRegistration();
  const subscription = await registration.pushManager.getSubscription();

  if (subscription) {
    const result = await supabase
      .from("web_push_subscriptions")
      .delete()
      .eq("endpoint", subscription.endpoint);

    if (result.error) {
      throw new Error(result.error.message);
    }

    await subscription.unsubscribe();
  }

  return Notification.permission === "denied" ? "denied" : "default";
}

export async function sendWebPushEvent(
  event:
    | { type: "message"; id: string }
    | { type: "like"; id: string },
) {
  try {
    const result = await supabase.functions.invoke("send-web-push", {
      body: event,
    });

    if (result.error && __DEV__) {
      console.warn("Web push could not be sent:", result.error);
    }
  } catch (error) {
    if (__DEV__) {
      console.warn("Web push could not be sent:", error);
    }
  }
}
