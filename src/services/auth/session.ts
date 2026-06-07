import { clearLegacyStorage } from "@/services/clearLegacyStorage";
import { supabase } from "@/services/supabase";
import { Platform } from "react-native";

export type SessionUser = {
  id: string;
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

export type LikedProfileRecord = {
  user: SessionUser;
  status: LikeRequestStatus;
  isMutual: boolean;
  matchId?: string;
};

type ProfileRow = {
  id: string;
  email: string | null;
  phone_number: string | null;
  google_id: string | null;
  name: string | null;
  picture: string | null;
  photos: string[] | null;
  about: string | null;
  age: number | null;
  city: string | null;
  country: string | null;
  gender: string | null;
  looking_for: string | null;
  interests: string[] | null;
  likes_count: number;
  matches_count: number;
  is_discover_hidden: boolean;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
};

type LikeRow = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: LikeRequestStatus;
  match_id: string | null;
  created_at: string;
  responded_at: string | null;
};

type MatchRow = {
  id: string;
  user_one_id: string;
  user_two_id: string;
  created_at: string;
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

function requireData<T>(data: T | null, error: { message: string } | null): T {
  if (error) {
    throw new Error(error.message);
  }
  return data as T;
}

function profileToUser(profile: ProfileRow): SessionUser {
  const storedPhotos = (profile.photos ?? []).filter(
    (photo) => !isGoogleAvatarUrl(photo),
  );
  const profilePhotos = storedPhotos.length ? storedPhotos : undefined;

  return {
    id: profile.id,
    googleId: profile.google_id ?? undefined,
    phoneNumber: profile.phone_number ?? undefined,
    email: profile.email ?? undefined,
    name: profile.name ?? undefined,
    picture: profilePhotos?.[0],
    photos: profilePhotos,
    about: profile.about ?? undefined,
    age: profile.age == null ? undefined : String(profile.age),
    city: profile.city ?? undefined,
    country: profile.country ?? undefined,
    gender: profile.gender ?? undefined,
    lookingFor: profile.looking_for ?? undefined,
    interests: profile.interests?.length ? profile.interests : undefined,
    likesCount: profile.likes_count,
    matchesCount: profile.matches_count,
    isDiscoverHidden: profile.is_discover_hidden,
    onboardingCompleted: profile.onboarding_completed,
    createdAt: profile.created_at,
  };
}

function userToProfile(user: SessionUser) {
  return {
    id: user.id,
    email: user.email ?? null,
    phone_number: user.phoneNumber ?? null,
    google_id: user.googleId ?? null,
    name: user.name ?? null,
    picture: user.photos?.[0] ?? user.picture ?? null,
    photos: user.photos ?? [],
    about: user.about ?? null,
    age: user.age ? Number(user.age) : null,
    city: user.city ?? null,
    country: user.country ?? null,
    gender: user.gender ?? null,
    looking_for: user.lookingFor ?? null,
    interests: user.interests ?? [],
    is_discover_hidden: user.isDiscoverHidden ?? false,
    onboarding_completed: user.onboardingCompleted,
  };
}

async function getAuthUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return null;
  }
  return data.user.id;
}

async function getProfilesByIds(ids: string[]) {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (!uniqueIds.length) {
    return new Map<string, SessionUser>();
  }
  const result = await supabase
    .from("profiles")
    .select("*")
    .in("id", uniqueIds);
  const rows = requireData(result.data as ProfileRow[] | null, result.error);
  return new Map(rows.map((row) => [row.id, profileToUser(row)]));
}

async function getBlockPairs() {
  const result = await supabase.from("blocks").select("blocker_id, blocked_id");
  return requireData(
    result.data as { blocker_id: string; blocked_id: string }[] | null,
    result.error,
  );
}

function blockedBetween(
  firstId: string,
  secondId: string,
  blocks: { blocker_id: string; blocked_id: string }[],
) {
  return blocks.some(
    (block) =>
      (block.blocker_id === firstId && block.blocked_id === secondId) ||
      (block.blocker_id === secondId && block.blocked_id === firstId),
  );
}

async function uploadUri(
  bucket: "profile-photos" | "chat-media",
  ownerId: string,
  uri: string,
  index = 0,
) {
  if (uri.startsWith("http://") || uri.startsWith("https://")) {
    return uri;
  }

  let arrayBuffer: ArrayBuffer;
  let contentType = "image/jpeg";

  if (uri.startsWith("data:")) {
    const parsedDataUri = dataUriToArrayBuffer(uri);
    arrayBuffer = parsedDataUri.arrayBuffer;
    contentType = parsedDataUri.contentType;
  } else {
    const response = await fetch(uri);

    if (!response.ok) {
      throw new Error("Das Bild konnte nicht gelesen werden.");
    }

    arrayBuffer = await response.arrayBuffer();
    contentType = response.headers.get("content-type") ?? contentType;
  }

  if (!arrayBuffer.byteLength) {
    throw new Error("Das ausgewählte Bild ist leer.");
  }

  const extension = getImageExtension(contentType);
  const path = `${ownerId}/${Date.now()}-${index}-${Math.random()
    .toString(16)
    .slice(2)}.${extension}`;

  const upload = await supabase.storage
    .from(bucket)
    .upload(path, arrayBuffer, { contentType, upsert: false });
  requireData(upload.data, upload.error);

  if (bucket === "profile-photos") {
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }

  const signed = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 60 * 24 * 30);
  return requireData(signed.data, signed.error).signedUrl;
}

function dataUriToArrayBuffer(uri: string) {
  const match = uri.match(/^data:([^;,]+)?(;base64)?,(.*)$/);

  if (!match) {
    throw new Error("Das Bildformat wird nicht unterstützt.");
  }

  const contentType = match[1] || "image/jpeg";
  const isBase64 = Boolean(match[2]);
  const payload = match[3];
  const binary = isBase64
    ? globalThis.atob(payload)
    : decodeURIComponent(payload);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return {
    arrayBuffer: bytes.buffer,
    contentType,
  };
}

function getImageExtension(contentType: string) {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("heic") || contentType.includes("heif"))
    return "heic";
  return "jpg";
}

function isGoogleAvatarUrl(url: string) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return (
      hostname === "lh3.googleusercontent.com" ||
      hostname.endsWith(".googleusercontent.com")
    );
  } catch {
    return false;
  }
}

async function restoreProfileForVerifiedEmail(
  profile: ProfileRow,
  verifiedEmail?: string,
) {
  if (
    !verifiedEmail ||
    (profile.onboarding_completed && profile.photos?.length)
  ) {
    return profile;
  }

  const legacyResult = await supabase
    .from("profiles")
    .select("*")
    .ilike("email", verifiedEmail.trim())
    .neq("id", profile.id)
    .order("updated_at", { ascending: false })
    .limit(20);
  const legacyProfiles = requireData(
    legacyResult.data as ProfileRow[] | null,
    legacyResult.error,
  );
  const legacyProfile = legacyProfiles.find((candidate) =>
    candidate.photos?.some((photo) => !isGoogleAvatarUrl(photo)),
  );

  if (!legacyProfile?.photos?.length) {
    return profile;
  }

  const restoredPhotos = legacyProfile.photos.filter(
    (photo) => !isGoogleAvatarUrl(photo),
  );

  if (!restoredPhotos.length) {
    return profile;
  }

  const restored = await supabase
    .from("profiles")
    .update({
      name: legacyProfile.name,
      picture: restoredPhotos[0],
      photos: restoredPhotos,
      about: legacyProfile.about,
      age: legacyProfile.age,
      city: legacyProfile.city,
      country: legacyProfile.country,
      gender: legacyProfile.gender,
      looking_for: legacyProfile.looking_for,
      interests: legacyProfile.interests,
      is_discover_hidden: legacyProfile.is_discover_hidden,
      onboarding_completed: true,
    })
    .eq("id", profile.id)
    .select("*")
    .single();

  return requireData(restored.data as ProfileRow | null, restored.error);
}

async function syncCurrentProfile() {
  const result = await supabase.rpc("sync_current_profile");

  if (!result.error && result.data) {
    return result.data as ProfileRow;
  }

  // Keep older deployments usable until the database migration is applied.
  if (
    result.error &&
    !result.error.message.toLowerCase().includes("sync_current_profile")
  ) {
    throw new Error(result.error.message);
  }

  return null;
}

export async function getSessionUser() {
  await clearLegacyStorage();
  const authResult = await supabase.auth.getUser();
  const authUser = authResult.data.user;

  if (authResult.error || !authUser) {
    return null;
  }

  const syncedProfile = await syncCurrentProfile();

  if (syncedProfile) {
    return profileToUser(syncedProfile);
  }

  const result = await supabase
    .from("profiles")
    .select("*")
    .eq("id", authUser.id)
    .maybeSingle();
  let profile = requireData(result.data as ProfileRow | null, result.error);

  if (!profile) {
    const inserted = await supabase
      .from("profiles")
      .upsert({
        id: authUser.id,
        email: authUser.email ?? null,
        phone_number: authUser.phone ?? null,
        name:
          authUser.user_metadata?.name ??
          authUser.user_metadata?.full_name ??
          null,
        picture: null,
        photos: [],
        onboarding_completed: false,
      })
      .select("*")
      .single();

    profile = requireData(inserted.data as ProfileRow | null, inserted.error);
  }

  profile = await restoreProfileForVerifiedEmail(
    profile,
    authUser.email ?? undefined,
  );

  return profileToUser(profile);
}

export async function saveSessionUser(user: SessionUser) {
  const result = await supabase
    .from("profiles")
    .upsert(userToProfile(user))
    .select("*")
    .single();
  return profileToUser(
    requireData(result.data as ProfileRow | null, result.error),
  );
}

export async function getLocalAccountUsers() {
  const result = await supabase
    .from("profiles")
    .select("*")
    .eq("onboarding_completed", true)
    .eq("is_discover_hidden", false);
  return requireData(result.data as ProfileRow[] | null, result.error).map(
    profileToUser,
  );
}

export function getUserKey(user: SessionUser) {
  return user.id;
}

export function getEmailValidationError(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const [localPart, domain] = normalizedEmail.split("@");
  if (!EMAIL_PATTERN.test(normalizedEmail) || !localPart || !domain) {
    return "Gib eine gültige E-Mail-Adresse ein.";
  }
  if (localPart.length < 3 || localPart.length > 64) {
    return "Der Benutzername in der E-Mail-Adresse wirkt ungültig.";
  }
  if (
    localPart.startsWith(".") ||
    localPart.endsWith(".") ||
    localPart.includes("..")
  ) {
    return "Der Benutzername in der E-Mail-Adresse wirkt ungültig.";
  }
  const domainParts = domain.split(".");
  const topLevelDomain = domainParts.at(-1) ?? "";
  if (
    domainParts.length < 2 ||
    domainParts.some((part) => part.length < 2) ||
    !/^[a-z]{2,24}$/.test(topLevelDomain)
  ) {
    return "Die E-Mail-Domain wirkt ungültig.";
  }
  if (
    SUSPICIOUS_EMAIL_PARTS.some(
      (part) => localPart === part || localPart.includes(`${part}.`),
    )
  ) {
    return "Diese E-Mail sieht wie eine Testadresse aus. Verwende eine echte Adresse.";
  }
  return null;
}

export async function registerLocalAccount(
  user: Omit<SessionUser, "id" | "createdAt"> &
    Partial<Pick<SessionUser, "id" | "createdAt">>,
  password: string,
) {
  if (!user.email) {
    throw new Error("E-Mail ist erforderlich.");
  }
  const result = await supabase.auth.signUp({
    email: user.email,
    password,
    options: { data: { name: user.name } },
  });
  if (result.error) {
    throw new Error(result.error.message);
  }
  if (!result.data.user) {
    throw new Error("Das Konto konnte nicht erstellt werden.");
  }

  if (!result.data.session) {
    return null;
  }

  const profile: SessionUser = {
    ...user,
    id: result.data.user.id,
    email: result.data.user.email ?? user.email,
    onboardingCompleted: false,
    createdAt: result.data.user.created_at,
  };
  return saveSessionUser(profile);
}

export async function verifySignupEmail(email: string, token: string) {
  const result = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: token.trim(),
    type: "signup",
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  if (!result.data.session) {
    throw new Error("Die E-Mail konnte nicht bestätigt werden.");
  }

  const profile = await getSessionUser();

  if (!profile) {
    throw new Error("Das Profil wurde nicht erstellt.");
  }

  return profile;
}

export async function resendSignupEmail(email: string) {
  const result = await supabase.auth.resend({
    type: "signup",
    email: email.trim().toLowerCase(),
  });

  if (result.error) {
    throw new Error(result.error.message);
  }
}

export async function signInLocalAccount(email: string, password: string) {
  const result = await supabase.auth.signInWithPassword({ email, password });
  if (result.error) {
    return null;
  }
  return getSessionUser();
}

export async function requestPhoneCode(phone: string) {
  const result = await supabase.auth.signInWithOtp({ phone });
  if (result.error) {
    throw new Error(result.error.message);
  }
}

export async function verifyPhoneCode(phone: string, token: string) {
  const result = await supabase.auth.verifyOtp({
    phone,
    token,
    type: "sms",
  });
  if (result.error) {
    throw new Error(result.error.message);
  }
  return getSessionUser();
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
  const currentUser = await getSessionUser();
  if (!currentUser) {
    return null;
  }
  const photos = await Promise.all(
    (profile.photos ?? []).map((photo, index) =>
      uploadUri("profile-photos", currentUser.id, photo, index),
    ),
  );

  if (!photos.length || !photos[0]) {
    throw new Error("Mindestens ein Profilfoto muss hochgeladen werden.");
  }
  const result = await supabase
    .from("profiles")
    .update({
      name: profile.name ?? currentUser.name ?? null,
      about: profile.about ?? null,
      picture: photos[0] ?? profile.picture ?? currentUser.picture ?? null,
      photos,
      age: profile.age ? Number(profile.age) : null,
      city: profile.city ?? null,
      country: profile.country ?? null,
      gender: profile.gender ?? null,
      looking_for: profile.lookingFor ?? null,
      interests: profile.interests ?? [],
      onboarding_completed: true,
    })
    .eq("id", currentUser.id)
    .select("*")
    .single();
  const savedProfile = requireData(
    result.data as ProfileRow | null,
    result.error,
  );

  if (
    !savedProfile.photos?.length ||
    savedProfile.photos.length !== photos.length
  ) {
    throw new Error("Die Profilfotos wurden nicht in Supabase gespeichert.");
  }

  return profileToUser(savedProfile);
}

export async function updateSessionStats() {
  return getSessionUser();
}

export async function updateSessionDiscoverVisibility(
  isDiscoverHidden: boolean,
) {
  const id = await getAuthUserId();
  if (!id) return null;
  const result = await supabase
    .from("profiles")
    .update({ is_discover_hidden: isDiscoverHidden })
    .eq("id", id)
    .select("*")
    .single();
  return profileToUser(
    requireData(result.data as ProfileRow | null, result.error),
  );
}

export async function getLikedUserKeysForCurrentUser() {
  const id = await getAuthUserId();
  if (!id) return [];
  const result = await supabase
    .from("likes")
    .select("to_user_id")
    .eq("from_user_id", id);
  return requireData(
    result.data as { to_user_id: string }[] | null,
    result.error,
  ).map((item) => item.to_user_id);
}

export async function getUnavailableDiscoverUserKeysForCurrentUser() {
  const id = await getAuthUserId();
  if (!id) return [];
  const [liked, matches, blocks] = await Promise.all([
    getLikedUserKeysForCurrentUser(),
    getCurrentUserMatches(),
    getBlockPairs(),
  ]);
  return Array.from(
    new Set([
      ...liked,
      ...matches.flatMap((match) =>
        match.userKeys.filter((userId) => userId !== id),
      ),
      ...blocks
        .filter((block) => id === block.blocker_id || id === block.blocked_id)
        .map((block) =>
          block.blocker_id === id ? block.blocked_id : block.blocker_id,
        ),
    ]),
  );
}

async function getLikeRows() {
  const result = await supabase.from("likes").select("*");
  return requireData(result.data as LikeRow[] | null, result.error);
}

async function likeRowToRecord(
  row: LikeRow,
  profiles?: Map<string, SessionUser>,
): Promise<LikeRequestRecord | null> {
  const users =
    profiles ?? (await getProfilesByIds([row.from_user_id, row.to_user_id]));
  const fromUser = users.get(row.from_user_id);
  const toUser = users.get(row.to_user_id);
  if (!fromUser || !toUser) {
    return null;
  }
  return {
    id: row.id,
    fromUserKey: row.from_user_id,
    toUserKey: row.to_user_id,
    fromUser,
    toUser,
    status: row.status,
    createdAt: row.created_at,
    respondedAt: row.responded_at ?? undefined,
    matchId: row.match_id ?? undefined,
  } satisfies LikeRequestRecord;
}

async function createOrGetMatch(firstId: string, secondId: string) {
  const [userOneId, userTwoId] = [firstId, secondId].sort();
  let result = await supabase
    .from("matches")
    .select("*")
    .eq("user_one_id", userOneId)
    .eq("user_two_id", userTwoId)
    .maybeSingle();
  let row = requireData(result.data as MatchRow | null, result.error);
  if (!row) {
    const inserted = await supabase
      .from("matches")
      .insert({ user_one_id: userOneId, user_two_id: userTwoId })
      .select("*")
      .single();
    row = requireData(inserted.data as MatchRow | null, inserted.error);
  }
  const users = await getProfilesByIds([userOneId, userTwoId]);
  await supabase
    .from("likes")
    .update({ match_id: row.id })
    .in("from_user_id", [userOneId, userTwoId])
    .in("to_user_id", [userOneId, userTwoId])
    .eq("status", "accepted");
  return matchRowToRecord(row, users);
}

function matchRowToRecord(
  row: MatchRow,
  users: Map<string, SessionUser>,
): MatchRecord {
  const userKeys = [row.user_one_id, row.user_two_id];
  return {
    id: row.id,
    userKeys,
    users: Object.fromEntries(
      userKeys
        .map((id) => [id, users.get(id)] as const)
        .filter((entry): entry is [string, SessionUser] => Boolean(entry[1])),
    ),
    createdAt: row.created_at,
  };
}

export async function recordProfileLike(targetUser: SessionUser) {
  const currentUser = await getSessionUser();
  if (!currentUser || currentUser.id === targetUser.id) return null;
  const blocks = await getBlockPairs();
  if (blockedBetween(currentUser.id, targetUser.id, blocks)) return null;

  const rows = await getLikeRows();
  const existing = rows.find(
    (row) =>
      row.from_user_id === currentUser.id && row.to_user_id === targetUser.id,
  );
  const reverse = rows.find(
    (row) =>
      row.from_user_id === targetUser.id && row.to_user_id === currentUser.id,
  );
  if (existing) {
    const match = existing.match_id
      ? await getMatchById(existing.match_id)
      : null;
    return {
      isMatch: existing.status === "accepted",
      match,
      user: currentUser,
      request: await likeRowToRecord(existing),
    };
  }

  const now = new Date().toISOString();
  if (reverse?.status === "pending") {
    const acceptedReverse = await supabase
      .from("likes")
      .update({ status: "accepted", responded_at: now })
      .eq("id", reverse.id)
      .select("*")
      .single();
    requireData(acceptedReverse.data, acceptedReverse.error);
    const inserted = await supabase
      .from("likes")
      .insert({
        from_user_id: currentUser.id,
        to_user_id: targetUser.id,
        status: "accepted",
        responded_at: now,
      })
      .select("*")
      .single();
    const row = requireData(inserted.data as LikeRow | null, inserted.error);
    const match = await createOrGetMatch(currentUser.id, targetUser.id);
    return {
      isMatch: true,
      match,
      user: await getSessionUser(),
      request: await likeRowToRecord({ ...row, match_id: match.id }),
    };
  }

  const inserted = await supabase
    .from("likes")
    .insert({
      from_user_id: currentUser.id,
      to_user_id: targetUser.id,
      status: "pending",
    })
    .select("*")
    .single();
  const row = requireData(inserted.data as LikeRow | null, inserted.error);
  return {
    isMatch: false,
    match: null,
    user: await getSessionUser(),
    request: await likeRowToRecord(row),
  };
}

export async function getLikedProfilesForCurrentUser(): Promise<
  LikedProfileRecord[]
> {
  const id = await getAuthUserId();
  if (!id) return [];
  const rows = (await getLikeRows()).filter((row) => row.from_user_id === id);
  const profiles = await getProfilesByIds(rows.map((row) => row.to_user_id));
  return rows.flatMap<LikedProfileRecord>((row) => {
    const user = profiles.get(row.to_user_id);
    return user
      ? [
          {
            user,
            status: row.status,
            isMutual: row.status === "accepted",
            matchId: row.match_id ?? undefined,
          },
        ]
      : [];
  });
}

export async function getIncomingLikeRequestsForCurrentUser() {
  const id = await getAuthUserId();
  if (!id) return [];
  const rows = (await getLikeRows()).filter(
    (row) => row.to_user_id === id && row.status === "pending",
  );
  const profiles = await getProfilesByIds(
    rows.flatMap((row) => [row.from_user_id, row.to_user_id]),
  );
  const records = await Promise.all(
    rows.map((row) => likeRowToRecord(row, profiles)),
  );
  return records.filter(
    (record): record is LikeRequestRecord => record !== null,
  );
}

export async function getLikeResponseNotificationsForCurrentUser() {
  const id = await getAuthUserId();
  if (!id) return [];
  const rows = (await getLikeRows()).filter(
    (row) => row.from_user_id === id && row.status !== "pending",
  );
  const profiles = await getProfilesByIds(
    rows.flatMap((row) => [row.from_user_id, row.to_user_id]),
  );
  const records = await Promise.all(
    rows.map((row) => likeRowToRecord(row, profiles)),
  );
  return records.filter(
    (record): record is LikeRequestRecord => record !== null,
  );
}

async function getNotificationKeys() {
  const id = await getAuthUserId();
  if (!id) return [];
  const rows = await getLikeRows();
  return rows.flatMap((row) => {
    if (row.to_user_id === id && row.status === "pending") {
      return [`incoming:${row.id}`];
    }
    if (row.from_user_id === id && row.status !== "pending") {
      return [`response:${row.id}:${row.status}`];
    }
    return [];
  });
}

async function getReadNotificationKeys() {
  const id = await getAuthUserId();
  if (!id) return [];
  const result = await supabase
    .from("notification_reads")
    .select("notification_key")
    .eq("user_id", id);
  return requireData(
    result.data as { notification_key: string }[] | null,
    result.error,
  ).map((row) => row.notification_key);
}

export async function getUnreadAcceptedLikeResponseForCurrentUser() {
  const [responses, readKeys] = await Promise.all([
    getLikeResponseNotificationsForCurrentUser(),
    getReadNotificationKeys(),
  ]);
  return (
    responses
      .filter(
        (request) =>
          request.status === "accepted" &&
          request.matchId &&
          !readKeys.includes(`response:${request.id}:accepted`),
      )
      .sort(
        (a, b) =>
          new Date(b.respondedAt ?? b.createdAt).getTime() -
          new Date(a.respondedAt ?? a.createdAt).getTime(),
      )[0] ?? null
  );
}

export async function getUnreadNotificationCountForCurrentUser() {
  const [keys, readKeys] = await Promise.all([
    getNotificationKeys(),
    getReadNotificationKeys(),
  ]);
  return keys.filter((key) => !readKeys.includes(key)).length;
}

export async function markNotificationsSeenForCurrentUser() {
  const id = await getAuthUserId();
  if (!id) return;
  const keys = await getNotificationKeys();
  if (!keys.length) return;
  const result = await supabase.from("notification_reads").upsert(
    keys.map((notificationKey) => ({
      user_id: id,
      notification_key: notificationKey,
    })),
  );
  requireData(result.data, result.error);
}

export async function acceptIncomingLikeRequest(requestId: string) {
  const currentUser = await getSessionUser();
  if (!currentUser) return null;
  const result = await supabase
    .from("likes")
    .update({
      status: "accepted",
      responded_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("to_user_id", currentUser.id)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();
  const row = requireData(result.data as LikeRow | null, result.error);
  if (!row) return null;
  const match = await createOrGetMatch(row.from_user_id, row.to_user_id);
  return { match, user: await getSessionUser() };
}

export async function skipIncomingLikeRequest(requestId: string) {
  const id = await getAuthUserId();
  if (!id) return null;
  const result = await supabase
    .from("likes")
    .update({ status: "skipped", responded_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("to_user_id", id)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();
  const row = requireData(result.data as LikeRow | null, result.error);
  return row ? likeRowToRecord(row) : null;
}

export async function getCurrentUserMatches() {
  const id = await getAuthUserId();
  if (!id) return [];
  const result = await supabase
    .from("matches")
    .select("*")
    .or(`user_one_id.eq.${id},user_two_id.eq.${id}`)
    .order("created_at", { ascending: false });
  const rows = requireData(result.data as MatchRow[] | null, result.error);
  const profiles = await getProfilesByIds(
    rows.flatMap((row) => [row.user_one_id, row.user_two_id]),
  );
  const blocks = await getBlockPairs();
  return rows
    .filter((row) => !blockedBetween(row.user_one_id, row.user_two_id, blocks))
    .map((row) => matchRowToRecord(row, profiles));
}

export async function getMatchById(matchId: string) {
  const id = await getAuthUserId();
  if (!id) return null;
  const result = await supabase
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .maybeSingle();
  const row = requireData(result.data as MatchRow | null, result.error);
  if (!row || ![row.user_one_id, row.user_two_id].includes(id)) return null;
  const blocks = await getBlockPairs();
  if (blockedBetween(row.user_one_id, row.user_two_id, blocks)) return null;
  return matchRowToRecord(
    row,
    await getProfilesByIds([row.user_one_id, row.user_two_id]),
  );
}

export async function openAcceptedLikedProfileChat(targetUserKey: string) {
  const id = await getAuthUserId();
  if (!id) return null;
  const rows = await getLikeRows();
  const accepted = rows.find(
    (row) =>
      row.status === "accepted" &&
      ((row.from_user_id === id && row.to_user_id === targetUserKey) ||
        (row.from_user_id === targetUserKey && row.to_user_id === id)),
  );
  if (!accepted) return null;
  return accepted.match_id
    ? getMatchById(accepted.match_id)
    : createOrGetMatch(id, targetUserKey);
}

export async function getChatMessages(matchId: string) {
  const result = await supabase
    .from("messages")
    .select("*")
    .eq("match_id", matchId)
    .order("created_at");
  const rows = requireData(
    result.data as
      | {
          id: string;
          match_id: string;
          sender_id: string;
          text: string | null;
          image_url: string | null;
          emoji: string | null;
          photo_reaction: string | null;
          created_at: string;
        }[]
      | null,
    result.error,
  );
  return rows.map((row) => ({
    id: row.id,
    matchId: row.match_id,
    senderKey: row.sender_id,
    text: row.text ?? undefined,
    imageUri: row.image_url ?? undefined,
    emoji: row.emoji ?? undefined,
    photoReaction: row.photo_reaction ?? undefined,
    createdAt: row.created_at,
  }));
}

export async function sendChatMessage(
  matchId: string,
  content: string | ChatMessagePayload,
) {
  const id = await getAuthUserId();
  const payload = typeof content === "string" ? { text: content } : content;
  if (!id) return null;
  const text = payload.text?.trim() || null;
  const emoji = payload.emoji?.trim() || null;
  const imageUrl = payload.imageUri
    ? await uploadUri("chat-media", id, payload.imageUri)
    : null;
  if (!text && !emoji && !imageUrl) return null;
  const result = await supabase
    .from("messages")
    .insert({
      match_id: matchId,
      sender_id: id,
      text,
      emoji,
      image_url: imageUrl,
    })
    .select("*")
    .single();
  const row = requireData(result.data, result.error);
  return {
    id: row.id,
    matchId: row.match_id,
    senderKey: row.sender_id,
    text: row.text ?? undefined,
    imageUri: row.image_url ?? undefined,
    emoji: row.emoji ?? undefined,
    createdAt: row.created_at,
  } satisfies ChatMessage;
}

export async function reactToChatMessage(messageId: string, emoji: string) {
  const result = await supabase.rpc("react_to_message", {
    target_message_id: messageId,
    reaction: emoji.trim(),
  });
  const row = requireData(result.data, result.error);
  if (!row) return null;
  return {
    id: row.id,
    matchId: row.match_id,
    senderKey: row.sender_id,
    text: row.text ?? undefined,
    imageUri: row.image_url ?? undefined,
    emoji: row.emoji ?? undefined,
    photoReaction: row.photo_reaction ?? undefined,
    createdAt: row.created_at,
  } satisfies ChatMessage;
}

export async function getBlockedUserKeysForCurrentUser() {
  const id = await getAuthUserId();
  if (!id) return [];
  return (await getBlockPairs())
    .filter((block) => block.blocker_id === id)
    .map((block) => block.blocked_id);
}

export async function blockMatchContact(matchId: string) {
  const id = await getAuthUserId();
  const match = await getMatchById(matchId);
  if (!id || !match) return null;
  const blockedUserKey = match.userKeys.find((key) => key !== id);
  if (!blockedUserKey) return null;
  const result = await supabase
    .from("blocks")
    .upsert({ blocker_id: id, blocked_id: blockedUserKey });
  requireData(result.data, result.error);
  return {
    blockedUserKey,
    blockedUser: match.users[blockedUserKey] ?? null,
  };
}

export async function submitReport(input: {
  category: string;
  description?: string;
}) {
  const reporterId = await getAuthUserId();

  if (!reporterId) {
    throw new Error("Du musst angemeldet sein, um eine Meldung zu senden.");
  }

  const category = input.category.trim();
  const description = input.description?.trim() || null;

  if (!category) {
    throw new Error("Wähle ein Thema für die Meldung aus.");
  }

  const result = await supabase
    .from("reports")
    .insert({
      reporter_id: reporterId,
      category,
      description,
      platform: Platform.OS,
    })
    .select("id, status, created_at")
    .single();

  return requireData(result.data, result.error);
}

export async function clearSession() {
  const result = await supabase.auth.signOut();
  if (result.error) {
    throw new Error(result.error.message);
  }
}
