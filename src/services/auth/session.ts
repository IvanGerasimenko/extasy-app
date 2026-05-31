import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const SESSION_USER_KEY = "extasy.session.user";
const LOCAL_ACCOUNTS_KEY = "extasy.local.accounts";
const LIKES_KEY = "extasy.likes";
const LIKE_REQUESTS_KEY = "extasy.like.requests";
const VIEWED_NOTIFICATIONS_KEY = "extasy.viewed.notifications";
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
  city?: string;
  country?: string;
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
const BLOCKED_EMAIL_DOMAINS = new Set([
  "10minutemail.com",
  "dispostable.com",
  "example.com",
  "fake.com",
  "guerrillamail.com",
  "mailinator.com",
  "sharklasers.com",
  "temp-mail.org",
  "tempmail.com",
  "test.com",
  "throwawaymail.com",
  "trashmail.com",
  "yopmail.com",
]);

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
  const likeRequests = await getLikeRequests();
  const likedProfiles: LikedProfileRecord[] = [];

  likedUserKeys.forEach((likedUserKey) => {
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

export function getEmailValidationError(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const [localPart, domain] = normalizedEmail.split("@");

  if (!EMAIL_PATTERN.test(normalizedEmail) || !localPart || !domain) {
    return "Enter a valid email address.";
  }

  if (localPart.length < 3 || localPart.length > 64) {
    return "Email username looks invalid.";
  }

  if (
    localPart.startsWith(".") ||
    localPart.endsWith(".") ||
    localPart.includes("..")
  ) {
    return "Email username looks invalid.";
  }

  const domainParts = domain.split(".");
  const topLevelDomain = domainParts.at(-1) ?? "";

  if (
    domainParts.length < 2 ||
    domainParts.some((part) => part.length < 2) ||
    !/^[a-z]{2,24}$/.test(topLevelDomain)
  ) {
    return "Email domain looks invalid.";
  }

  if (BLOCKED_EMAIL_DOMAINS.has(domain)) {
    return "Use a real email provider, not a test or temporary email.";
  }

  if (
    SUSPICIOUS_EMAIL_PARTS.some(
      (part) => localPart === part || localPart.includes(`${part}.`),
    )
  ) {
    return "This email looks like a test email. Use your real email.";
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

  if (existingRequest) {
    return {
      isMatch: existingRequest.status === "accepted",
      match: existingRequest.matchId
        ? await getMatchById(existingRequest.matchId)
        : null,
      user: currentUser,
      request: existingRequest,
    };
  }

  if (!currentLikes.includes(targetUserKey)) {
    likes[currentUserKey] = [...currentLikes, targetUserKey];

    try {
      await saveLikes(likes);
    } catch {
      throw new Error("Storage is full. Clear old Safari data and try again.");
    }
  }

  const updatedUser = await updateSessionStats({ likesDelta: 1 });
  const request: LikeRequestRecord = {
    id: `${currentUserKey}__${targetUserKey}`,
    fromUserKey: currentUserKey,
    toUserKey: targetUserKey,
    fromUser: compactUserForRelationStorage(updatedUser ?? currentUser),
    toUser: compactUserForRelationStorage(targetUser),
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  try {
    await saveLikeRequests([...likeRequests, request]);
  } catch {
    throw new Error("Storage is full. Clear old Safari data and try again.");
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

  return likeRequests.filter(
    (request) =>
      request.toUserKey === currentUserKey && request.status === "pending",
  );
}

export async function getLikeResponseNotificationsForCurrentUser() {
  const currentUser = await getSessionUser();

  if (!currentUser) {
    return [] as LikeRequestRecord[];
  }

  const currentUserKey = getUserKey(currentUser);
  const likeRequests = await getLikeRequests();

  return likeRequests.filter(
    (request) =>
      request.fromUserKey === currentUserKey && request.status !== "pending",
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

  return likeRequests
    .filter(
      (request) =>
        (request.toUserKey === userKey && request.status === "pending") ||
        (request.fromUserKey === userKey && request.status !== "pending"),
    )
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
