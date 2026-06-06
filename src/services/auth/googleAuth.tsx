import { ResponseType } from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { Platform } from "react-native";
import { getSessionUser, saveSessionUser, type SessionUser } from "./session";

WebBrowser.maybeCompleteAuthSession();

const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const webRedirectUri = process.env.EXPO_PUBLIC_GOOGLE_WEB_REDIRECT_URI;
const API_URL = process.env.EXPO_PUBLIC_API_URL;

type GoogleUser = {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
};

type DbUserResponse = {
  user: SessionUser & {
    googleId: string;
    email: string;
  };
  isNewUser: boolean;
};

function getLocalGoogleUserId(googleId: string) {
  return Array.from(googleId).reduce(
    (hash, character) => (hash * 31 + character.charCodeAt(0)) % 1_000_000_000,
    7,
  );
}

function createLocalGoogleUser(
  user: GoogleUser,
  existingUser?: SessionUser | null,
): DbUserResponse {
  const matchingExistingUser =
    existingUser?.googleId === user.sub ||
    existingUser?.email?.toLowerCase() === user.email.toLowerCase()
      ? existingUser
      : null;

  return {
    user: {
      ...matchingExistingUser,
      id: getLocalGoogleUserId(user.sub),
      googleId: user.sub,
      email: user.email,
      name: user.name,
      picture: user.picture,
      photos:
        matchingExistingUser?.photos ?? (user.picture ? [user.picture] : undefined),
      onboardingCompleted: matchingExistingUser?.onboardingCompleted ?? false,
      createdAt: matchingExistingUser?.createdAt ?? new Date().toISOString(),
    },
    isNewUser: true,
  };
}

export function useGoogleAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [googleUser, setGoogleUser] = useState<GoogleUser | null>(null);
  const [dbUser, setDbUser] = useState<DbUserResponse | null>(null);

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId,
    webClientId,
    androidClientId,
    scopes: ["openid", "profile", "email"],

    ...(Platform.OS === "web"  ?  {redirectUri: webRedirectUri ??  (typeof window !== "undefined" ? window.location.origin : undefined),
          responseType: ResponseType.Token,
        }
      : {}),
  });

  async function getUserInfo(token: string): Promise<GoogleUser> {
    const response = await fetch(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error_description || "Failed to fetch Google user");
    }

    return data;
  }

  async function saveUserToDatabase(user: GoogleUser): Promise<DbUserResponse> {
    if (!API_URL) {
      return createLocalGoogleUser(user, await getSessionUser());
    }

    try {
      const response = await fetch(`${API_URL}/auth/google`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          googleId: user.sub,
          email: user.email,
          name: user.name,
          picture: user.picture,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Failed to save user");
      }

      return data;
    } catch (error) {
      console.log("[Google Auth] API fallback:", error);
      return createLocalGoogleUser(user, await getSessionUser());
    }
  }

  async function signInWithGoogle() {
    if (!request || isLoading) {
      return null;
    }

    setIsLoading(true);

    try {
      const result = await promptAsync();

      if (result.type !== "success") {
        return null;
      }

      const token = result.authentication?.accessToken;

      if (!token) {
        throw new Error("Access token not found");
      }

      const googleUserData = await getUserInfo(token);
      const savedUser = await saveUserToDatabase(googleUserData);

      await saveSessionUser(savedUser.user);

      setGoogleUser(googleUserData);
      setDbUser(savedUser);

      return {
        googleUser: googleUserData,
        dbUser: savedUser,
      };
    } catch (error) {
      console.log("[Google Auth] Error:", error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  return {
    signInWithGoogle,
    request,
    response,
    isLoading,
    googleUser,
    dbUser,
  };
}
