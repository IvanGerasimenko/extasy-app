import { supabase } from "@/services/supabase";
import { makeRedirectUri } from "expo-auth-session";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { Platform } from "react-native";
import { getSessionUser, type SessionUser } from "./session";

WebBrowser.maybeCompleteAuthSession();

function getRedirectTo() {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return `${window.location.origin}/auth/callback`;
  }

  return makeRedirectUri({
    scheme: "extasy",
    path: "auth/callback",
  });
}

export async function createGoogleSessionFromUrl(url: string) {
  const { params, errorCode } = QueryParams.getQueryParams(url);

  const rawCallbackError = params.error_description ?? params.error;
  const callbackError = rawCallbackError
    ? decodeURIComponent(rawCallbackError)
    : undefined;

  if (callbackError || errorCode) {
    throw new Error(callbackError ?? errorCode ?? "Google OAuth failed.");
  }

  const accessToken = params.access_token;
  const refreshToken = params.refresh_token;
  const authCode = params.code;

  if (authCode) {
    const result = await supabase.auth.exchangeCodeForSession(authCode);

    if (result.error) {
      throw new Error(result.error.message);
    }

    return result.data.session;
  }

  if (accessToken && refreshToken) {
    const result = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    return result.data.session;
  }

  throw new Error(
    "Supabase hat keinen OAuth-Code zurückgegeben. Prüfe die Redirect URL.",
  );
}

export function useGoogleAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [dbUser, setDbUser] = useState<{
    user: SessionUser;
    isNewUser: boolean;
  } | null>(null);

  async function signInWithGoogle() {
    if (isLoading) {
      return null;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const oauthResult = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: getRedirectTo(),
          skipBrowserRedirect: Platform.OS !== "web",
        },
      });

      if (oauthResult.error) {
        throw new Error(oauthResult.error.message);
      }

      if (!oauthResult.data.url) {
        throw new Error("Google-Anmeldung konnte nicht geöffnet werden.");
      }

      if (Platform.OS === "web") {
        return null;
      }

      const redirectTo = getRedirectTo();
      const browserResult = await WebBrowser.openAuthSessionAsync(
        oauthResult.data.url,
        redirectTo,
      );

      if (browserResult.type !== "success") {
        if (browserResult.type !== "cancel") {
          setErrorMessage("Google-Anmeldung wurde nicht abgeschlossen.");
        }
        return null;
      }

      await createGoogleSessionFromUrl(browserResult.url);

      const user = await getSessionUser();
      if (!user) {
        throw new Error("Das Supabase-Profil wurde nicht erstellt.");
      }

      const savedUser = {
        user,
        isNewUser: !user.onboardingCompleted,
      };

      setDbUser(savedUser);

      return {
        dbUser: savedUser,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Google-Anmeldung ist fehlgeschlagen.";
      console.log("[Google Auth] Error:", error);
      setErrorMessage(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  return {
    signInWithGoogle,
    isLoading,
    errorMessage,
    dbUser,
  };
}
