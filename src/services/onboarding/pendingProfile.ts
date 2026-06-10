export type PendingOnboardingProfile = {
  name?: string;
  about?: string;
  picture?: string;
  photos?: string[];
  age?: string;
  city?: string;
  country?: string;
  gender?: string;
  lookingFor?: string[];
  interests?: string[];
};

let pendingProfile: PendingOnboardingProfile | null = null;

export function setPendingOnboardingProfile(profile: PendingOnboardingProfile) {
  pendingProfile = profile;
}

export function consumePendingOnboardingProfile() {
  const profile = pendingProfile;
  pendingProfile = null;
  return profile;
}
