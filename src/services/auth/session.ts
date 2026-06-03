import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const SESSION_USER_KEY = "extasy.session.user";
const LOCAL_ACCOUNTS_KEY = "extasy.local.accounts";
const LIKES_KEY = "extasy.likes";
const LIKE_REQUESTS_KEY = "extasy.like.requests";
const VIEWED_NOTIFICATIONS_KEY = "extasy.viewed.notifications";
const MATCHES_KEY = "extasy.matches";
const MESSAGES_KEY = "extasy.messages";
const BLOCKED_USERS_KEY = "extasy.blocked.users";
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
  city?: string;
  country?: string;
  gender?: string;
  lookingFor?: string;
  interests?: string[];
  likesCount?: number;
  matchesCount?: number;
  isDiscoverHidden?: boolean;
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
  text?: string;
  imageUri?: string;
  emoji?: string;
  photoReaction?: string;
  createdAt: string;
};

export type ChatMessagePayload = {
  text?: string;
  imageUri?: string;
  emoji?: string;
};

export type LikedProfileRecord = {
  user: SessionUser;
  status: LikeRequestStatus;
  isMutual: boolean;
  matchId?: string;
};

export type LikeRequestStatus = "pending" | "accepted" | "skipped";

export type LikeRequestRecord = {
  id: string;
  fromUserKey: string;
  toUserKey: string;
  fromUser: SessionUser;
  toUser: SessionUser;
  status: LikeRequestStatus;
  createdAt: string;
  respondedAt?: string;
  matchId?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const SUSPICIOUS_EMAIL_PARTS = [
  "fake",
  "noemail",
  "notreal",
  "qwerty",
  "test",
  "trash",
];

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

  const currentUserKey = getUserKey(user);
  const likes = await getLikes();
  const blockedUsers = await getBlockedUsers();

  return (likes[currentUserKey] ?? []).filter(
    (likedUserKey) =>
      !areUsersBlocked(currentUserKey, likedUserKey, blockedUsers),
  );
}

export async function getUnavailableDiscoverUserKeysForCurrentUser() {
  const user = await getSessionUser();

  if (!user) {
    return [] as string[];
  }

  const currentUserKey = getUserKey(user);
  const likedUserKeys = await getLikedUserKeysForCurrentUser();
  const matches = await getCurrentUserMatches();
  const blockedUsers = await getBlockedUsers();
  const blockedUserKeys = blockedUsers[currentUserKey] ?? [];
  const blockedByUserKeys = Object.entries(blockedUsers)
    .filter(([, blockedKeys]) => blockedKeys.includes(currentUserKey))
    .map(([blockedByUserKey]) => blockedByUserKey);
  const matchedUserKeys = matches.flatMap((match) =>
    match.userKeys.filter((userKey) => userKey !== currentUserKey),
  );

  return Array.from(
    new Set([
      ...likedUserKeys,
      ...matchedUserKeys,
      ...blockedUserKeys,
      ...blockedByUserKeys,
    ]),
  );
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
  const likeRequests = await getLikeRequests();
  const blockedUsers = await getBlockedUsers();
  const likedProfiles: LikedProfileRecord[] = [];

  likedUserKeys.forEach((likedUserKey) => {
    if (areUsersBlocked(currentUserKey, likedUserKey, blockedUsers)) {
      return;
    }

    const likedUser = users.find(
      (localUser) => getUserKey(localUser) === likedUserKey,
    );
    const match = matches.find((item) => item.userKeys.includes(likedUserKey));
    const request = likeRequests.find(
      (item) =>
        item.fromUserKey === currentUserKey && item.toUserKey === likedUserKey,
    );

    if (!likedUser) {
      return;
    }

    likedProfiles.push({
      user: likedUser,
      status: request?.status ?? (match ? "accepted" : "pending"),
      isMutual: Boolean(match?.userKeys.includes(currentUserKey)),
      matchId: match?.id ?? request?.matchId,
    });
  });

  return likedProfiles;
}

export async function openAcceptedLikedProfileChat(targetUserKey: string) {
  const currentUser = await getSessionUser();

  if (!currentUser) {
    return null;
  }

  const currentUserKey = getUserKey(currentUser);
  const users = await getLocalAccountUsers();
  const targetUser = users.find(
    (localUser) => getUserKey(localUser) === targetUserKey,
  );

  if (!targetUser || targetUserKey === currentUserKey) {
    return null;
  }

  const blockedUsers = await getBlockedUsers();

  if (areUsersBlocked(currentUserKey, targetUserKey, blockedUsers)) {
    return null;
  }

  const matches = await getCurrentUserMatches();
  const existingMatch = matches.find((match) =>
    match.userKeys.includes(targetUserKey),
  );

  if (existingMatch) {
    return existingMatch;
  }

  const likeRequests = await getLikeRequests();
  const acceptedRequest = likeRequests.find(
    (request) =>
      request.status === "accepted" &&
      ((request.fromUserKey === currentUserKey &&
        request.toUserKey === targetUserKey) ||
        (request.fromUserKey === targetUserKey &&
          request.toUserKey === currentUserKey)),
  );

  if (!acceptedRequest) {
    return null;
  }

  const match = await createOrGetMatch(currentUser, targetUser);
  const updatedRequests = likeRequests.map((request) =>
    request.status === "accepted" &&
    ((request.fromUserKey === currentUserKey &&
      request.toUserKey === targetUserKey) ||
      (request.fromUserKey === targetUserKey &&
        request.toUserKey === currentUserKey))
      ? {
          ...request,
          matchId: match.id,
        }
      : request,
  );

  await saveLikeRequests(updatedRequests);

  return match;
}

export function getUserKey(user: SessionUser) {
  return (
    user.email?.toLowerCase() ??
    user.googleId ??
    user.phoneNumber ??
    String(user.id)
  );
}

export function getEmailValidationError(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const [localPart, domain] = normalizedEmail.split("@");

  if (!EMAIL_PATTERN.test(normalizedEmail) || !localPart || !domain) {
    return "Введіть коректну email-адресу.";
  }

  if (localPart.length < 3 || localPart.length > 64) {
    return "Ім'я користувача в email виглядає некоректно.";
  }

  if (
    localPart.startsWith(".") ||
    localPart.endsWith(".") ||
    localPart.includes("..")
  ) {
    return "Ім'я користувача в email виглядає некоректно.";
  }

  const domainParts = domain.split(".");
  const topLevelDomain = domainParts.at(-1) ?? "";

  if (
    domainParts.length < 2 ||
    domainParts.some((part) => part.length < 2) ||
    !/^[a-z]{2,24}$/.test(topLevelDomain)
  ) {
    return "Домен email виглядає некоректно.";
  }

  if (
    SUSPICIOUS_EMAIL_PARTS.some(
      (part) => localPart === part || localPart.includes(`${part}.`),
    )
  ) {
    return "Цей email схожий на тестовий. Використайте справжню адресу.";
  }

  return null;
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
    throw new Error("Email обов'язковий.");
  }

  if (accounts.some((account) => account.user.email?.toLowerCase() === email)) {
    throw new Error("Акаунт уже існує.");
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
  city?: string;
  country?: string;
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

export async function updateSessionDiscoverVisibility(
  isDiscoverHidden: boolean,
) {
  const user = await getSessionUser();

  if (!user) {
    return null;
  }

  const updatedUser: SessionUser = {
    ...user,
    isDiscoverHidden,
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
  const likeRequests = await getLikeRequests();
  const existingRequest = likeRequests.find(
    (request) =>
      request.fromUserKey === currentUserKey &&
      request.toUserKey === targetUserKey,
  );
  const reverseRequest = likeRequests.find(
    (request) =>
      request.fromUserKey === targetUserKey &&
      request.toUserKey === currentUserKey,
  );

  if (existingRequest) {
    if (existingRequest.status === "accepted") {
      const savedMatch = existingRequest.matchId
        ? await getMatchById(existingRequest.matchId)
        : null;
      const match =
        savedMatch ?? (await createOrGetMatch(currentUser, targetUser));

      return {
        isMatch: true,
        match,
        user: currentUser,
        request: existingRequest.matchId
          ? existingRequest
          : { ...existingRequest, matchId: match.id },
      };
    }

    return {
      isMatch: false,
      match: null,
      user: currentUser,
      request: existingRequest,
    };
  }

  if (reverseRequest?.status === "accepted") {
    const match = reverseRequest.matchId
      ? await getMatchById(reverseRequest.matchId)
      : await createOrGetMatch(currentUser, targetUser);

    return {
      isMatch: true,
      match,
      user: currentUser,
      request: reverseRequest,
    };
  }

  if (!currentLikes.includes(targetUserKey)) {
    likes[currentUserKey] = [...currentLikes, targetUserKey];

    try {
      await saveLikes(likes);
    } catch {
      throw new Error(
        "Сховище заповнене. Очистьте старі дані Safari й спробуйте знову.",
      );
    }
  }

  const updatedUser = await updateSessionStats({ likesDelta: 1 });
  const now = new Date().toISOString();

  if (reverseRequest?.status === "pending") {
    const match = await createOrGetMatch(
      updatedUser ?? currentUser,
      targetUser,
    );
    const acceptedReverseRequest: LikeRequestRecord = {
      ...reverseRequest,
      fromUser: compactUserForRelationStorage(targetUser),
      toUser: compactUserForRelationStorage(updatedUser ?? currentUser),
      status: "accepted",
      respondedAt: now,
      matchId: match.id,
    };
    const acceptedCurrentRequest: LikeRequestRecord = {
      id: `${currentUserKey}__${targetUserKey}`,
      fromUserKey: currentUserKey,
      toUserKey: targetUserKey,
      fromUser: compactUserForRelationStorage(updatedUser ?? currentUser),
      toUser: compactUserForRelationStorage(targetUser),
      status: "accepted",
      createdAt: now,
      respondedAt: now,
      matchId: match.id,
    };

    await saveLikeRequests([
      ...likeRequests.map((request) =>
        request.id === reverseRequest.id ? acceptedReverseRequest : request,
      ),
      acceptedCurrentRequest,
    ]);
    await updateSessionStats({ matchesDelta: 1 });
    await updateLocalUserStats(targetUserKey, { matchesDelta: 1 });

    return {
      isMatch: true,
      match,
      user: await getSessionUser(),
      request: acceptedCurrentRequest,
    };
  }

  const request: LikeRequestRecord = {
    id: `${currentUserKey}__${targetUserKey}`,
    fromUserKey: currentUserKey,
    toUserKey: targetUserKey,
    fromUser: compactUserForRelationStorage(updatedUser ?? currentUser),
    toUser: compactUserForRelationStorage(targetUser),
    status: "pending",
    createdAt: now,
  };

  try {
    await saveLikeRequests([...likeRequests, request]);
  } catch {
    throw new Error(
      "Сховище заповнене. Очистьте старі дані Safari й спробуйте знову.",
    );
  }

  return {
    isMatch: false,
    match: null,
    user: updatedUser,
    request,
  };
}

export async function getIncomingLikeRequestsForCurrentUser() {
  const currentUser = await getSessionUser();

  if (!currentUser) {
    return [] as LikeRequestRecord[];
  }

  const currentUserKey = getUserKey(currentUser);
  const likeRequests = await getLikeRequests();
  const blockedUsers = await getBlockedUsers();

  return likeRequests.filter(
    (request) =>
      request.toUserKey === currentUserKey &&
      request.status === "pending" &&
      !areUsersBlocked(currentUserKey, request.fromUserKey, blockedUsers),
  );
}

export async function getLikeResponseNotificationsForCurrentUser() {
  const currentUser = await getSessionUser();

  if (!currentUser) {
    return [] as LikeRequestRecord[];
  }

  const currentUserKey = getUserKey(currentUser);
  const likeRequests = await getLikeRequests();
  const blockedUsers = await getBlockedUsers();

  return likeRequests.filter(
    (request) =>
      request.fromUserKey === currentUserKey &&
      request.status !== "pending" &&
      !areUsersBlocked(currentUserKey, request.toUserKey, blockedUsers),
  );
}

export async function getUnreadAcceptedLikeResponseForCurrentUser() {
  const currentUser = await getSessionUser();

  if (!currentUser) {
    return null;
  }

  const currentUserKey = getUserKey(currentUser);
  const likeRequests = await getLikeRequests();
  const blockedUsers = await getBlockedUsers();
  const viewedNotifications = await getViewedNotifications();
  const viewedKeys = viewedNotifications[currentUserKey] ?? [];

  return (
    likeRequests
      .filter(
        (request) =>
          request.fromUserKey === currentUserKey &&
          request.status === "accepted" &&
          Boolean(request.matchId) &&
          !areUsersBlocked(currentUserKey, request.toUserKey, blockedUsers) &&
          !viewedKeys.includes(`response:${request.id}:accepted`),
      )
      .sort(
        (firstRequest, secondRequest) =>
          new Date(
            secondRequest.respondedAt ?? secondRequest.createdAt,
          ).getTime() -
          new Date(
            firstRequest.respondedAt ?? firstRequest.createdAt,
          ).getTime(),
      )[0] ?? null
  );
}

export async function getUnreadNotificationCountForCurrentUser() {
  const currentUser = await getSessionUser();

  if (!currentUser) {
    return 0;
  }

  const currentUserKey = getUserKey(currentUser);
  const notificationKeys = await getNotificationKeysForUser(currentUserKey);
  const viewedNotifications = await getViewedNotifications();
  const viewedKeys = viewedNotifications[currentUserKey] ?? [];

  return notificationKeys.filter((key) => !viewedKeys.includes(key)).length;
}

export async function markNotificationsSeenForCurrentUser() {
  const currentUser = await getSessionUser();

  if (!currentUser) {
    return;
  }

  const currentUserKey = getUserKey(currentUser);
  const notificationKeys = await getNotificationKeysForUser(currentUserKey);
  const viewedNotifications = await getViewedNotifications();
  const viewedKeys = new Set(viewedNotifications[currentUserKey] ?? []);

  notificationKeys.forEach((key) => viewedKeys.add(key));

  await saveViewedNotifications({
    ...viewedNotifications,
    [currentUserKey]: Array.from(viewedKeys),
  });
}

export async function acceptIncomingLikeRequest(requestId: string) {
  const currentUser = await getSessionUser();

  if (!currentUser) {
    return null;
  }

  const currentUserKey = getUserKey(currentUser);
  const likeRequests = await getLikeRequests();
  const request = likeRequests.find((item) => item.id === requestId);

  if (
    !request ||
    request.toUserKey !== currentUserKey ||
    request.status !== "pending"
  ) {
    return null;
  }

  const match = await createOrGetMatch(currentUser, request.fromUser);
  const updatedRequests = likeRequests.map((item) =>
    item.id === requestId
      ? {
          ...item,
          fromUser: compactUserForRelationStorage(item.fromUser),
          toUser: compactUserForRelationStorage(currentUser),
          status: "accepted" as const,
          respondedAt: new Date().toISOString(),
          matchId: match.id,
        }
      : item,
  );

  await saveLikeRequests(updatedRequests);
  await updateSessionStats({ matchesDelta: 1 });
  await updateLocalUserStats(request.fromUserKey, { matchesDelta: 1 });

  return {
    match,
    user: await getSessionUser(),
  };
}

export async function skipIncomingLikeRequest(requestId: string) {
  const currentUser = await getSessionUser();

  if (!currentUser) {
    return null;
  }

  const currentUserKey = getUserKey(currentUser);
  const likeRequests = await getLikeRequests();
  const request = likeRequests.find((item) => item.id === requestId);

  if (
    !request ||
    request.toUserKey !== currentUserKey ||
    request.status !== "pending"
  ) {
    return null;
  }

  const updatedRequest: LikeRequestRecord = {
    ...request,
    fromUser: compactUserForRelationStorage(request.fromUser),
    toUser: compactUserForRelationStorage(currentUser),
    status: "skipped",
    respondedAt: new Date().toISOString(),
  };

  await saveLikeRequests(
    likeRequests.map((item) => (item.id === requestId ? updatedRequest : item)),
  );

  return updatedRequest;
}

export async function getCurrentUserMatches() {
  const currentUser = await getSessionUser();

  if (!currentUser) {
    return [] as MatchRecord[];
  }

  const currentUserKey = getUserKey(currentUser);
  const matches = await getMatches();
  const blockedUserKeys = await getBlockedUserKeys(currentUserKey);

  const visibleMatches = matches.filter(
    (match) =>
      match.userKeys.includes(currentUserKey) &&
      !match.userKeys.some(
        (userKey) =>
          userKey !== currentUserKey && blockedUserKeys.includes(userKey),
      ),
  );
  const seenMatchedUserKeys = new Set<string>();

  return visibleMatches.filter((match) => {
    const matchedUserKey = match.userKeys.find(
      (userKey) => userKey !== currentUserKey,
    );

    if (!matchedUserKey || seenMatchedUserKeys.has(matchedUserKey)) {
      return false;
    }

    seenMatchedUserKeys.add(matchedUserKey);
    return true;
  });
}

export async function getMatchById(matchId: string) {
  const currentUser = await getSessionUser();
  const matches = await getMatches();
  const match = matches.find((item) => item.id === matchId) ?? null;

  if (!currentUser || !match) {
    return match;
  }

  const currentUserKey = getUserKey(currentUser);
  const otherUserKey = match.userKeys.find(
    (userKey) => userKey !== currentUserKey,
  );

  if (!match.userKeys.includes(currentUserKey) || !otherUserKey) {
    return null;
  }

  const blockedUsers = await getBlockedUsers();

  return areUsersBlocked(currentUserKey, otherUserKey, blockedUsers)
    ? null
    : match;
}

export async function getChatMessages(matchId: string) {
  const messages = await getMessages();
  return messages.filter((message) => message.matchId === matchId);
}

export async function sendChatMessage(
  matchId: string,
  content: string | ChatMessagePayload,
) {
  const currentUser = await getSessionUser();
  const payload = typeof content === "string" ? { text: content } : content;
  const trimmedText = payload.text?.trim();
  const imageUri = payload.imageUri?.trim();
  const emoji = payload.emoji?.trim();

  if (!currentUser || (!trimmedText && !imageUri && !emoji)) {
    return null;
  }

  const message: ChatMessage = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    matchId,
    senderKey: getUserKey(currentUser),
    text: trimmedText,
    imageUri,
    emoji,
    createdAt: new Date().toISOString(),
  };

  const messages = await getMessages();
  await saveMessages([...messages, message]);

  return message;
}

export async function reactToChatMessage(messageId: string, emoji: string) {
  const trimmedEmoji = emoji.trim();

  if (!trimmedEmoji) {
    return null;
  }

  const messages = await getMessages();
  const updatedMessages = messages.map((message) =>
    message.id === messageId
      ? {
          ...message,
          photoReaction: trimmedEmoji,
        }
      : message,
  );
  const updatedMessage =
    updatedMessages.find((message) => message.id === messageId) ?? null;

  if (!updatedMessage) {
    return null;
  }

  await saveMessages(updatedMessages);

  return updatedMessage;
}

export async function getBlockedUserKeysForCurrentUser() {
  const currentUser = await getSessionUser();

  if (!currentUser) {
    return [] as string[];
  }

  return getBlockedUserKeys(getUserKey(currentUser));
}

export async function blockMatchContact(matchId: string) {
  const currentUser = await getSessionUser();

  if (!currentUser) {
    return null;
  }

  const currentUserKey = getUserKey(currentUser);
  const matches = await getMatches();
  const match = matches.find(
    (item) => item.id === matchId && item.userKeys.includes(currentUserKey),
  );

  if (!match) {
    return null;
  }

  const blockedUserKey = match.userKeys.find(
    (userKey) => userKey !== currentUserKey,
  );

  if (!blockedUserKey) {
    return null;
  }

  const blockedUsers = await getBlockedUsers();
  const currentBlockedKeys = blockedUsers[currentUserKey] ?? [];
  const nextBlockedKeys = Array.from(
    new Set([...currentBlockedKeys, blockedUserKey]),
  );

  await saveBlockedUsers({
    ...blockedUsers,
    [currentUserKey]: nextBlockedKeys,
  });

  const blockedMatchIds = new Set(
    matches
      .filter(
        (item) =>
          item.userKeys.includes(currentUserKey) &&
          item.userKeys.includes(blockedUserKey),
      )
      .map((item) => item.id),
  );

  await saveMatches(matches.filter((item) => !blockedMatchIds.has(item.id)));

  const messages = await getMessages();
  await saveMessages(
    messages.filter((message) => !blockedMatchIds.has(message.matchId)),
  );

  const likes = await getLikes();
  const nextLikes = {
    ...likes,
    [currentUserKey]: (likes[currentUserKey] ?? []).filter(
      (userKey) => userKey !== blockedUserKey,
    ),
    [blockedUserKey]: (likes[blockedUserKey] ?? []).filter(
      (userKey) => userKey !== currentUserKey,
    ),
  };
  await saveLikes(nextLikes);

  const likeRequests = await getLikeRequests();
  await saveLikeRequests(
    likeRequests.filter(
      (request) =>
        !isUserPair(
          request.fromUserKey,
          request.toUserKey,
          currentUserKey,
          blockedUserKey,
        ),
    ),
  );

  return {
    blockedUserKey,
    blockedUser: match.users[blockedUserKey] ?? null,
  };
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

async function getLikeRequests() {
  const rawRequests = await getItem(LIKE_REQUESTS_KEY);

  if (!rawRequests) {
    return [] as LikeRequestRecord[];
  }

  try {
    const requests = JSON.parse(rawRequests) as LikeRequestRecord[];
    const compactRequests = requests.map((request) => ({
      ...request,
      fromUser: compactUserForRelationStorage(request.fromUser),
      toUser: compactUserForRelationStorage(request.toUser),
    }));

    if (JSON.stringify(requests) !== JSON.stringify(compactRequests)) {
      await saveLikeRequests(compactRequests);
    }

    return compactRequests;
  } catch {
    await deleteItem(LIKE_REQUESTS_KEY);
    return [] as LikeRequestRecord[];
  }
}

async function saveLikeRequests(requests: LikeRequestRecord[]) {
  const compactRequests = requests.map((request) => ({
    ...request,
    fromUser: compactUserForRelationStorage(request.fromUser),
    toUser: compactUserForRelationStorage(request.toUser),
  }));

  await setItem(LIKE_REQUESTS_KEY, JSON.stringify(compactRequests));
}

async function getNotificationKeysForUser(userKey: string) {
  const likeRequests = await getLikeRequests();
  const blockedUsers = await getBlockedUsers();

  return likeRequests
    .filter((request) => {
      const otherUserKey =
        request.toUserKey === userKey
          ? request.fromUserKey
          : request.fromUserKey === userKey
            ? request.toUserKey
            : "";

      return (
        Boolean(otherUserKey) &&
        !areUsersBlocked(userKey, otherUserKey, blockedUsers) &&
        ((request.toUserKey === userKey && request.status === "pending") ||
          (request.fromUserKey === userKey && request.status !== "pending"))
      );
    })
    .map((request) => {
      if (request.toUserKey === userKey) {
        return `incoming:${request.id}`;
      }

      return `response:${request.id}:${request.status}`;
    });
}

async function getViewedNotifications() {
  const rawViewedNotifications = await getItem(VIEWED_NOTIFICATIONS_KEY);

  if (!rawViewedNotifications) {
    return {} as Record<string, string[]>;
  }

  try {
    return JSON.parse(rawViewedNotifications) as Record<string, string[]>;
  } catch {
    await deleteItem(VIEWED_NOTIFICATIONS_KEY);
    return {} as Record<string, string[]>;
  }
}

async function saveViewedNotifications(
  viewedNotifications: Record<string, string[]>,
) {
  await setItem(VIEWED_NOTIFICATIONS_KEY, JSON.stringify(viewedNotifications));
}

async function getMatches() {
  const rawMatches = await getItem(MATCHES_KEY);

  if (!rawMatches) {
    return [] as MatchRecord[];
  }

  try {
    const matches = JSON.parse(rawMatches) as MatchRecord[];
    const compactMatches = matches.map((match) => ({
      ...match,
      users: Object.fromEntries(
        Object.entries(match.users).map(([userKey, user]) => [
          userKey,
          compactUserForRelationStorage(user),
        ]),
      ),
    }));

    if (JSON.stringify(matches) !== JSON.stringify(compactMatches)) {
      await saveMatches(compactMatches);
    }

    return compactMatches;
  } catch {
    await deleteItem(MATCHES_KEY);
    return [] as MatchRecord[];
  }
}

async function saveMatches(matches: MatchRecord[]) {
  const compactMatches = matches.map((match) => ({
    ...match,
    users: Object.fromEntries(
      Object.entries(match.users).map(([userKey, user]) => [
        userKey,
        compactUserForRelationStorage(user),
      ]),
    ),
  }));

  await setItem(MATCHES_KEY, JSON.stringify(compactMatches));
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

async function getBlockedUsers() {
  const rawBlockedUsers = await getItem(BLOCKED_USERS_KEY);

  if (!rawBlockedUsers) {
    return {} as Record<string, string[]>;
  }

  try {
    return JSON.parse(rawBlockedUsers) as Record<string, string[]>;
  } catch {
    await deleteItem(BLOCKED_USERS_KEY);
    return {} as Record<string, string[]>;
  }
}

async function getBlockedUserKeys(currentUserKey: string) {
  const blockedUsers = await getBlockedUsers();
  return blockedUsers[currentUserKey] ?? [];
}

async function saveBlockedUsers(blockedUsers: Record<string, string[]>) {
  await setItem(BLOCKED_USERS_KEY, JSON.stringify(blockedUsers));
}

function areUsersBlocked(
  firstUserKey: string,
  secondUserKey: string,
  blockedUsers: Record<string, string[]>,
) {
  return (
    blockedUsers[firstUserKey]?.includes(secondUserKey) ||
    blockedUsers[secondUserKey]?.includes(firstUserKey)
  );
}

function isUserPair(
  firstUserKey: string,
  secondUserKey: string,
  targetFirstUserKey: string,
  targetSecondUserKey: string,
) {
  return (
    (firstUserKey === targetFirstUserKey &&
      secondUserKey === targetSecondUserKey) ||
    (firstUserKey === targetSecondUserKey &&
      secondUserKey === targetFirstUserKey)
  );
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
      [firstUserKey]: compactUserForRelationStorage(firstUser),
      [secondUserKey]: compactUserForRelationStorage(secondUser),
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

function compactUserForRelationStorage(user: SessionUser) {
  return {
    ...user,
    picture: undefined,
    photos: undefined,
  };
}

export async function clearSession() {
  await deleteItem(SESSION_USER_KEY);
}
