import { createClient, type SupabaseClient } from "@supabase/supabase-js";
// Deno resolves this name through the import map in ../deno.json.
// @ts-ignore The regular VS Code TypeScript server does not read that map.
import webpush from "web-push";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type PushEvent = { type: "message"; id: string } | { type: "like"; id: string };

type PushSubscriptionRow = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

type MessageRow = {
  id: string;
  match_id: string;
  sender_id: string;
  text: string | null;
  image_url: string | null;
  emoji: string | null;
};

type MatchRow = {
  user_one_id: string;
  user_two_id: string;
};

type LikeRow = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: "pending" | "accepted" | "skipped";
  match_id: string | null;
};

type ProfileNameRow = {
  name: string | null;
};

type DenoRuntime = {
  serve(handler: (request: Request) => Response | Promise<Response>): void;
  env: {
    get(name: string): string | undefined;
  };
};

const deno = (globalThis as typeof globalThis & { Deno: DenoRuntime }).Deno;

deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authorization = request.headers.get("Authorization") ?? "";
    const token = authorization.replace(/^Bearer\s+/i, "");
    const supabaseUrl = deno.env.get("SUPABASE_URL");
    const serviceRoleKey = deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const vapidPublicKey = deno.env.get("WEB_PUSH_VAPID_PUBLIC_KEY");
    const vapidPrivateKey = deno.env.get("WEB_PUSH_VAPID_PRIVATE_KEY");
    const vapidSubject =
      deno.env.get("WEB_PUSH_VAPID_SUBJECT") ??
      "mailto:support@extasy.expo.app";

    if (
      !token ||
      !supabaseUrl ||
      !serviceRoleKey ||
      !vapidPublicKey ||
      !vapidPrivateKey
    ) {
      return json({ error: "Web push is not configured." }, 500);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const userResult = await admin.auth.getUser(token);
    const actor = userResult.data.user;

    if (!actor) {
      return json({ error: "Unauthorized." }, 401);
    }

    const event = (await request.json()) as PushEvent;
    const notification = await resolveNotification(admin, actor.id, event);

    if (!notification) {
      return json({ error: "Notification event is not allowed." }, 403);
    }

    const subscriptionResult = await admin
      .from("web_push_subscriptions")
      .select("endpoint,p256dh,auth")
      .eq("user_id", notification.recipientId);

    if (subscriptionResult.error) {
      throw subscriptionResult.error;
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const subscriptions =
      (subscriptionResult.data as PushSubscriptionRow[] | null) ?? [];
    const expiredEndpoints: string[] = [];

    await Promise.all(
      subscriptions.map(async (subscription) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth,
              },
            },
            JSON.stringify(notification.payload),
            { TTL: 60 * 60 * 24 },
          );
        } catch (error) {
          const statusCode =
            typeof error === "object" && error && "statusCode" in error
              ? Number(error.statusCode)
              : 0;

          if (statusCode === 404 || statusCode === 410) {
            expiredEndpoints.push(subscription.endpoint);
            return;
          }

          throw error;
        }
      }),
    );

    if (expiredEndpoints.length) {
      await admin
        .from("web_push_subscriptions")
        .delete()
        .in("endpoint", expiredEndpoints);
    }

    return json({ delivered: subscriptions.length - expiredEndpoints.length });
  } catch (error) {
    console.error(error);
    return json(
      { error: error instanceof Error ? error.message : "Push failed." },
      500,
    );
  }
});

async function resolveNotification(
  admin: SupabaseClient<any>,
  actorId: string,
  event: PushEvent,
) {
  if (event.type === "message") {
    const messageResult = await admin
      .from("messages")
      .select("id,match_id,sender_id,text,image_url,emoji")
      .eq("id", event.id)
      .maybeSingle();
    const message = messageResult.data as MessageRow | null;

    if (!message || message.sender_id !== actorId) {
      return null;
    }

    const matchResult = await admin
      .from("matches")
      .select("user_one_id,user_two_id")
      .eq("id", message.match_id)
      .maybeSingle();
    const match = matchResult.data as MatchRow | null;

    if (!match) {
      return null;
    }

    const recipientId =
      match.user_one_id === actorId ? match.user_two_id : match.user_one_id;
    const senderName = await getProfileName(admin, actorId);
    const body =
      message.text?.trim() ||
      (message.image_url ? "Hat dir ein Foto gesendet." : message.emoji) ||
      "Neue Nachricht";

    return {
      recipientId,
      payload: {
        title: senderName,
        body,
        url: `/chat?matchId=${message.match_id}`,
        tag: `message:${message.match_id}`,
      },
    };
  }

  const likeResult = await admin
    .from("likes")
    .select("id,from_user_id,to_user_id,status,match_id")
    .eq("id", event.id)
    .maybeSingle();
  const like = likeResult.data as LikeRow | null;

  if (!like) {
    return null;
  }

  if (like.status === "pending" && like.from_user_id !== actorId) {
    return null;
  }

  if (
    like.status === "accepted" &&
    actorId !== like.from_user_id &&
    actorId !== like.to_user_id
  ) {
    return null;
  }

  const recipientId =
    actorId === like.from_user_id ? like.to_user_id : like.from_user_id;
  const actorName = await getProfileName(admin, actorId);
  const isMatch = like.status === "accepted";

  return {
    recipientId,
    payload: {
      title: isMatch ? "Neues Match" : "Neuer Like",
      body: isMatch
        ? `${actorName} und du habt ein Match.`
        : `${actorName} möchte dich kennenlernen.`,
      url: like.match_id ? `/chat?matchId=${like.match_id}` : "/notifications",
      tag: `like:${like.id}`,
    },
  };
}

async function getProfileName(admin: SupabaseClient<any>, userId: string) {
  const result = await admin
    .from("profiles")
    .select("name")
    .eq("id", userId)
    .maybeSingle();
  const profile = result.data as ProfileNameRow | null;
  return profile?.name?.trim() || "Extasy";
}

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
