import { ResponseType } from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { Platform } from "react-native";
import { saveSessionUser } from "./session";

WebBrowser.maybeCompleteAuthSession();

const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const API_URL = process.env.EXPO_PUBLIC_API_URL;

type GoogleUser = {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
};

type DbUserResponse = {
  user: {
    id: number;
    googleId: string;
    email: string;
    name?: string;
    picture?: string;
    about?: string;
    age?: string;
    gender?: string;
    lookingFor?: string;
    interests?: string[];
    onboardingCompleted: boolean;
    createdAt: string;
  };
  isNewUser: boolean;
};

export function useGoogleAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [googleUser, setGoogleUser] = useState<GoogleUser | null>(null);
  const [dbUser, setDbUser] = useState<DbUserResponse | null>(null);

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId,
    webClientId,
    androidClientId,
    scopes: ["openid", "profile", "email"],

    ...(Platform.OS === "web"
      ? {
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
      throw new Error("API_URL is missing");
    }

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
