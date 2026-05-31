import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const SESSION_USER_KEY = "extasy.session.user";
const LOCAL_ACCOUNTS_KEY = "extasy.local.accounts";
const LIKES_KEY = "extasy.likes";
const MATCHES_KEY = "extasy.matches";
const MESSAGES_KEY = "extasy.messages";
const API_URL = process.env.EXPO_PUBLIC_API_URL;

export type SessionUser = {
  id: number;
  googleId?: string;
  phoneNumber?: string;
  email?: string;
  name?: string;
  picture?: string;
  photos?: string[];
  about?: string;
  age?: string;
  gender?: string;
  lookingFor?: string;
  interests?: string[];
  likesCount?: number;
  matchesCount?: number;
  onboardingCompleted: boolean;
  createdAt: string;
};

export type LocalAccount = {
  user: SessionUser;
  password: string;
};

export type MatchRecord = {
  id: string;
  userKeys: string[];
  users: Record<string, SessionUser>;
  createdAt: string;
};

export type ChatMessage = {
  id: string;
  matchId: string;
  senderKey: string;
  text: string;
  createdAt: string;
};

export type LikedProfileRecord = {
  user: SessionUser;
  isMutual: boolean;
  matchId?: string;
};

async function getItem(key: string) {
  if (Platform.OS === "web") {
    return window.localStorage.getItem(key);
  }

  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string) {
  if (Platform.OS === "web") {
    window.localStorage.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

async function deleteItem(key: string) {
  if (Platform.OS === "web") {
    window.localStorage.removeItem(key);
    return;
  }

  await SecureStore.deleteItemAsync(key);
}

export async function getSessionUser() {
  const rawUser = await getItem(SESSION_USER_KEY);

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser) as SessionUser;
  } catch {
    await deleteItem(SESSION_USER_KEY);
    return null;
  }
}

export async function saveSessionUser(user: SessionUser) {
  await setItem(SESSION_USER_KEY, JSON.stringify(user));
}

export async function getLocalAccountUsers() {
  const accounts = await getLocalAccounts();
  return accounts.map((account) => account.user);
}

export async function getLikedUserKeysForCurrentUser() {
  const user = await getSessionUser();

  if (!user) {
    return [] as string[];
  }

  const likes = await getLikes();
  return likes[getUserKey(user)] ?? [];
}

export async function getLikedProfilesForCurrentUser() {
  const user = await getSessionUser();

  if (!user) {
    return [] as LikedProfileRecord[];
  }

  const currentUserKey = getUserKey(user);
  const likedUserKeys = await getLikedUserKeysForCurrentUser();
  const users = await getLocalAccountUsers();
  const matches = await getCurrentUserMatches();
  const likedProfiles: LikedProfileRecord[] = [];

  likedUserKeys.forEach((likedUserKey) => {
    const likedUser = users.find(
      (localUser) => getUserKey(localUser) === likedUserKey,
    );
    const match = matches.find((item) => item.userKeys.includes(likedUserKey));

    if (!likedUser) {
      return;
    }

    likedProfiles.push({
      user: likedUser,
      isMutual: Boolean(match?.userKeys.includes(currentUserKey)),
      matchId: match?.id,
    });
  });

  return likedProfiles;
}

export function getUserKey(user: SessionUser) {
  return (
    user.email?.toLowerCase() ??
    user.googleId ??
    user.phoneNumber ??
    String(user.id)
  );
}

async function getLocalAccounts() {
  const rawAccounts = await getItem(LOCAL_ACCOUNTS_KEY);

  if (!rawAccounts) {
    return [] as LocalAccount[];
  }

  try {
    return JSON.parse(rawAccounts) as LocalAccount[];
  } catch {
    await deleteItem(LOCAL_ACCOUNTS_KEY);
    return [] as LocalAccount[];
  }
}

async function saveLocalAccounts(accounts: LocalAccount[]) {
  await setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts));
}

export async function registerLocalAccount(
  user: SessionUser,
  password: string,
) {
  const accounts = await getLocalAccounts();
  const email = user.email?.toLowerCase();

  if (!email) {
    throw new Error("Email is required.");
  }

  if (accounts.some((account) => account.user.email?.toLowerCase() === email)) {
    throw new Error("Account already exists.");
  }

  await saveLocalAccounts([...accounts, { user, password }]);
  await saveSessionUser(user);
}

export async function signInLocalAccount(email: string, password: string) {
  const accounts = await getLocalAccounts();
  const normalizedEmail = email.toLowerCase();
  const account = accounts.find(
    (item) =>
      item.user.email?.toLowerCase() === normalizedEmail &&
      item.password === password,
  );

  if (!account) {
    const currentUser = await getSessionUser();

    if (currentUser?.email?.toLowerCase() === normalizedEmail) {
      return currentUser;
    }

    return null;
  }

  const currentUser = await getSessionUser();
  const mergedUser =
    currentUser &&
    currentUser.email?.toLowerCase() === account.user.email?.toLowerCase()
      ? mergeSessionUsers(account.user, currentUser)
      : account.user;

  await saveSessionUser(mergedUser);
  await syncLocalAccountUser(mergedUser);
  return mergedUser;
}

export async function completeSessionOnboarding(profile: {
  name?: string;
  about?: string;
  picture?: string;
  photos?: string[];
  age?: string;
  gender?: string;
  lookingFor?: string;
  interests?: string[];
}) {
  const user = await getSessionUser();

  if (!user) {
    return null;
  }

  const updatedUser: SessionUser = {
    ...user,
    ...profile,
    onboardingCompleted: true,
  };

  if (!API_URL) {
    await saveSessionUser(updatedUser);
    await syncLocalAccountUser(updatedUser);
    return updatedUser;
  }

  try {
    const response = await fetch(`${API_URL}/users/${user.id}/onboarding`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(profile),
    });

    const data = await response.json();

    if (response.ok) {
      await saveSessionUser(data.user);
      await syncLocalAccountUser(data.user);
      return data.user as SessionUser;
    }
  } catch (error) {
    console.log("[Session] Failed to sync onboarding:", error);
  }

  await saveSessionUser(updatedUser);
  await syncLocalAccountUser(updatedUser);
  return updatedUser;
}

export async function updateSessionStats(stats: {
  likesDelta?: number;
  matchesDelta?: number;
}) {
  const user = await getSessionUser();

  if (!user) {
    return null;
  }

  const updatedUser: SessionUser = {
    ...user,
    likesCount: Math.max(0, (user.likesCount ?? 0) + (stats.likesDelta ?? 0)),
    matchesCount: Math.max(
      0,
      (user.matchesCount ?? 0) + (stats.matchesDelta ?? 0),
    ),
  };

  await saveSessionUser(updatedUser);
  await syncLocalAccountUser(updatedUser);

  return updatedUser;
}

export async function recordProfileLike(targetUser: SessionUser) {
  const currentUser = await getSessionUser();

  if (!currentUser) {
    return null;
  }

  const currentUserKey = getUserKey(currentUser);
  const targetUserKey = getUserKey(targetUser);

  if (currentUserKey === targetUserKey) {
    return null;
  }

  const likes = await getLikes();
  const currentLikes = likes[currentUserKey] ?? [];

  if (!currentLikes.includes(targetUserKey)) {
    likes[currentUserKey] = [...currentLikes, targetUserKey];
    await saveLikes(likes);
  }

  const reciprocalLike = likes[targetUserKey]?.includes(currentUserKey);
  const updatedUser = await updateSessionStats({ likesDelta: 1 });

  if (!reciprocalLike || !updatedUser) {
    return {
      isMatch: false,
      match: null,
      user: updatedUser,
    };
  }

  const match = await createOrGetMatch(updatedUser, targetUser);
  await updateSessionStats({ matchesDelta: 1 });
  await updateLocalUserStats(targetUserKey, { matchesDelta: 1 });

  return {
    isMatch: true,
    match,
    user: await getSessionUser(),
  };
}

export async function getCurrentUserMatches() {
  const currentUser = await getSessionUser();

  if (!currentUser) {
    return [] as MatchRecord[];
  }

  const currentUserKey = getUserKey(currentUser);
  const matches = await getMatches();

  return matches.filter((match) => match.userKeys.includes(currentUserKey));
}

export async function getMatchById(matchId: string) {
  const matches = await getMatches();
  return matches.find((match) => match.id === matchId) ?? null;
}

export async function getChatMessages(matchId: string) {
  const messages = await getMessages();
  return messages.filter((message) => message.matchId === matchId);
}

export async function sendChatMessage(matchId: string, text: string) {
  const currentUser = await getSessionUser();
  const trimmedText = text.trim();

  if (!currentUser || !trimmedText) {
    return null;
  }

  const message: ChatMessage = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    matchId,
    senderKey: getUserKey(currentUser),
    text: trimmedText,
    createdAt: new Date().toISOString(),
  };

  const messages = await getMessages();
  await saveMessages([...messages, message]);

  return message;
}

async function getLikes() {
  const rawLikes = await getItem(LIKES_KEY);

  if (!rawLikes) {
    return {} as Record<string, string[]>;
  }

  try {
    return JSON.parse(rawLikes) as Record<string, string[]>;
  } catch {
    await deleteItem(LIKES_KEY);
    return {} as Record<string, string[]>;
  }
}

async function saveLikes(likes: Record<string, string[]>) {
  await setItem(LIKES_KEY, JSON.stringify(likes));
}

async function getMatches() {
  const rawMatches = await getItem(MATCHES_KEY);

  if (!rawMatches) {
    return [] as MatchRecord[];
  }

  try {
    return JSON.parse(rawMatches) as MatchRecord[];
  } catch {
    await deleteItem(MATCHES_KEY);
    return [] as MatchRecord[];
  }
}

async function saveMatches(matches: MatchRecord[]) {
  await setItem(MATCHES_KEY, JSON.stringify(matches));
}

async function getMessages() {
  const rawMessages = await getItem(MESSAGES_KEY);

  if (!rawMessages) {
    return [] as ChatMessage[];
  }

  try {
    return JSON.parse(rawMessages) as ChatMessage[];
  } catch {
    await deleteItem(MESSAGES_KEY);
    return [] as ChatMessage[];
  }
}

async function saveMessages(messages: ChatMessage[]) {
  await setItem(MESSAGES_KEY, JSON.stringify(messages));
}

async function createOrGetMatch(
  firstUser: SessionUser,
  secondUser: SessionUser,
) {
  const firstUserKey = getUserKey(firstUser);
  const secondUserKey = getUserKey(secondUser);
  const userKeys = [firstUserKey, secondUserKey].sort();
  const matchId = userKeys.join("__");
  const matches = await getMatches();
  const existingMatch = matches.find((match) => match.id === matchId);

  if (existingMatch) {
    return existingMatch;
  }

  const match: MatchRecord = {
    id: matchId,
    userKeys,
    users: {
      [firstUserKey]: firstUser,
      [secondUserKey]: secondUser,
    },
    createdAt: new Date().toISOString(),
  };

  await saveMatches([...matches, match]);

  return match;
}

async function updateLocalUserStats(
  userKey: string,
  stats: { matchesDelta?: number },
) {
  const accounts = await getLocalAccounts();
  const updatedAccounts = accounts.map((account) => {
    if (getUserKey(account.user) !== userKey) {
      return account;
    }

    return {
      ...account,
      user: {
        ...account.user,
        matchesCount: Math.max(
          0,
          (account.user.matchesCount ?? 0) + (stats.matchesDelta ?? 0),
        ),
      },
    };
  });

  await saveLocalAccounts(updatedAccounts);
}

async function syncLocalAccountUser(user: SessionUser) {
  if (!user.email) {
    return;
  }

  const accounts = await getLocalAccounts();
  const email = user.email.toLowerCase();
  const accountExists = accounts.some(
    (account) => account.user.email?.toLowerCase() === email,
  );
  const updatedAccounts = accountExists
    ? accounts.map((account) =>
        account.user.email?.toLowerCase() === email
          ? { ...account, user: mergeSessionUsers(account.user, user) }
          : account,
      )
    : [...accounts, { user, password: "" }];

  await saveLocalAccounts(updatedAccounts);
}

function mergeSessionUsers(baseUser: SessionUser, nextUser: SessionUser) {
  const photos = nextUser.photos?.length
    ? nextUser.photos
    : baseUser.photos?.length
      ? baseUser.photos
      : nextUser.picture
        ? [nextUser.picture]
        : baseUser.picture
          ? [baseUser.picture]
          : undefined;

  return {
    ...baseUser,
    ...nextUser,
    picture: nextUser.picture ?? baseUser.picture ?? photos?.[0],
    photos,
    interests: nextUser.interests?.length
      ? nextUser.interests
      : baseUser.interests,
    likesCount: nextUser.likesCount ?? baseUser.likesCount,
    matchesCount: nextUser.matchesCount ?? baseUser.matchesCount,
  };
}

export async function clearSession() {
  await deleteItem(SESSION_USER_KEY);
}
