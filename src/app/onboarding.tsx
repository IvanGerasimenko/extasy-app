import ProfileImagePicker from "@/components/ImagePicker";
import {
  PremiumButton,
  PremiumHeader,
  PremiumTag,
  PremiumTextInput,
} from "@/components/PremiumUI";
import { ThemedBackground } from "@/components/ThemedBackground";
import {
  getCountryLabel,
  getGenderLabel,
  getInterestLabel,
  getLookingForLabel,
} from "@/constants/Labels";
import {
  premiumColors,
  premiumShadow,
  premiumSpacing,
  premiumType,
} from "@/constants/premiumDesign";
import {
  completeSessionOnboarding,
  getSessionUser,
} from "@/services/auth/session";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const genders = ["Weibliche", "Männliche", "Divers"];
const lookingForOptions = ["Weibliche", "Männliche", "Divers"];
const countryOptions = [
  "Deutschland",
  "Österreich",
  "Schweiz",
  "Frankreich",
  "Spanien",
  "Italien",
  "Niederlande",
  "Belgien",
  "Schweiz",
  "Polen",
  "Tschechien",
  "Ungarn",
  "Slowakei",
  "Slowenien",
  "Kroatien",
  "Bosnien und Herzegowina",
  "Montenegro",
  "Serbien",
  "Mazedonien",
  "Ukraine",
  "Kanada",
  "USA",
];
const interestsList = [
  "Kaffee",
  "Reisen",
  "Music",
  "Art",
  "Bücher",
  "Fitness",
  "Filme",
  "Entwicklung",
  "Alkohol",
  "Anime",
  "Gaming",
  "Fashion",
  "Tanzen",
  "Yoga",
  "Club",
  "Bloggen",
  "Brettspiele",
  "Tiere",
  "Schreiben",
  "Camping",
  "Fotografie",
  "Mode",
  "Sport",
];
const FULL_HD_MAX_SIZE = 1920;
const FULL_HD_JPEG_QUALITY = 0.92;

export default function OnboardingScreen() {
  const [photos, setPhotos] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [about, setAbout] = useState("");
  const [gender, setGender] = useState("");
  const [lookingFor, setLookingFor] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [webViewportHeight, setWebViewportHeight] = useState<number | null>(
    null,
  );
  const [isWebKeyboardOpen, setIsWebKeyboardOpen] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") {
      return;
    }

    function syncVisualViewport() {
      const visualViewport = window.visualViewport;
      const viewportHeight = visualViewport?.height ?? window.innerHeight;

      setWebViewportHeight(viewportHeight);
      setIsWebKeyboardOpen(viewportHeight < window.innerHeight - 120);
    }

    syncVisualViewport();

    window.visualViewport?.addEventListener("resize", syncVisualViewport);
    window.visualViewport?.addEventListener("scroll", syncVisualViewport);
    window.addEventListener("resize", syncVisualViewport);

    return () => {
      window.visualViewport?.removeEventListener("resize", syncVisualViewport);
      window.visualViewport?.removeEventListener("scroll", syncVisualViewport);
      window.removeEventListener("resize", syncVisualViewport);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadExistingProfile() {
      const user = await getSessionUser();

      if (!isMounted) {
        return;
      }

      if (!user) {
        router.replace("/welcome");
        return;
      }

      setName(user.name ?? "");
      setAge(user.age ?? "");
      setCity(user.city ?? "");
      setCountry(user.country ?? "");
      setAbout(user.about ?? "");
      setGender(user.gender ?? "");
      setLookingFor(
        Array.isArray(user.lookingFor)
          ? user.lookingFor
          : user.lookingFor
            ? [user.lookingFor]
            : [],
      );
      setInterests(user.interests ?? []);
      const savedPhotos = user.photos?.length
        ? user.photos
        : user.picture
          ? [user.picture]
          : [];
      setPhotos(savedPhotos);
    }

    loadExistingProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  function toggleInterest(item: string) {
    const setInterest = (prev: string[]) => {
      if (prev.includes(item)) {
        return prev.filter((interest) => interest !== item);
      } else {
        return [...prev, item];
      }
    };
    setInterests(setInterest);
  }

  function toggleLookingFor(item: string) {
    setLookingFor((currentValues) => {
      if (currentValues.includes(item)) {
        return currentValues.filter((value) => value !== item);
      }
  
      return [...currentValues, item];
    });
  }

  async function handleStartMatching() {
    const trimmedName = name.trim();
    const trimmedAge = age.trim();
    const trimmedAbout = about.trim();
    const ageNumber = Number(trimmedAge);

    if (!trimmedName) {
      setError("Füge deinen Namen hinzu.");
      return;
    }

    if (!trimmedAge || Number.isNaN(ageNumber) || ageNumber < 18) {
      setError(
        "Gib ein gültiges Alter ein. Du musst mindestens 18 Jahre alt sein.",
      );
      return;
    }

    if (!trimmedAbout || trimmedAbout.length < 10) {
      setError("Schreibe eine kurze Beschreibung mit mindestens 10 Zeichen.");
      return;
    }

    if (!photos[0]) {
      setError("Füge mindestens ein Profilfoto hinzu.");
      return;
    }

    if (!gender) {
      setError("Wähle dein Geschlecht aus.");
      return;
    }

    if (lookingFor.length === 0) {
      setError("Wähle aus, wen du kennenlernen möchtest.");
      return;
    }

    if (interests.length < 3) {
      setError("Wähle mindestens 3 Interessen aus.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const storagePhotos = await preparePhotosForStorage(photos);
      const savedUser = await completeSessionOnboarding({
        name: name.trim() || undefined,
        age: age.trim() || undefined,
        city: city.trim() || undefined,
        country: country || undefined,
        about: about.trim() || undefined,
        picture: storagePhotos[0],
        photos: storagePhotos,
        gender: gender || undefined,
        lookingFor: lookingFor.length > 0 ? lookingFor : undefined,
        interests,
      });
      if (
        !savedUser?.photos?.length ||
        savedUser.photos.length !== storagePhotos.length
      ) {
        throw new Error("Die Fotos wurden nicht vollständig gespeichert.");
      }

      const verifiedUser = await getSessionUser();

      if (
        !verifiedUser?.photos?.length ||
        verifiedUser.photos.length !== storagePhotos.length
      ) {
        throw new Error(
          "Supabase hat die gespeicherten Fotos nicht bestätigt.",
        );
      }

      router.replace("/discover");
    } catch (error) {
      setIsSaving(false);
      setError(
        error instanceof Error
          ? `Das Profil konnte nicht gespeichert werden: ${error.message}`
          : "Das Profil konnte nicht gespeichert werden.",
      );
    }
  }

  function Tag({
    title,
    selected,
    onPress,
  }: {
    title: string;
    selected: boolean;
    onPress: () => void;
  }) {
    return (
      <TouchableOpacity style={styles.tagPressable} onPress={onPress}>
        <PremiumTag label={title} selected={selected} />
      </TouchableOpacity>
    );
  }

  return (
    <ThemedBackground
      style={[
        styles.background,
        webViewportHeight ? { height: webViewportHeight } : null,
      ]}
    >
      <ScrollView
        style={[
          styles.screen,
          webViewportHeight ? { height: webViewportHeight } : null,
        ]}
        contentContainerStyle={[
          styles.container,
          isWebKeyboardOpen && styles.keyboardOpenContainer,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <PremiumHeader
          eyebrow="Profileinstellungen"
          title="Erstelle ein Profil, das Lust auf ein Kennenlernen macht"
          subtitle="Fotos, Interessen und Vorlieben helfen Extasy, passendere Kontakte in Deutschland vorzuschlagen."
        />

        <View style={styles.section}>
          <View style={styles.stepCard}>
            <Text style={styles.stepLabel}>Fotos hochladen</Text>
            <Text style={styles.stepText}>
              Beginne mit einem klaren Porträt. Füge weitere Fotos für Kontext
              und Vertrauen hinzu.
            </Text>
          </View>
          <ProfileImagePicker photos={photos} onPhotosChange={setPhotos} />

          <View>
            <Text style={styles.label}>Dein Name</Text>
            <PremiumTextInput
              style={styles.input}
              placeholder="z. B. Max Müller"
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>Alter</Text>
            <PremiumTextInput
              style={styles.input}
              placeholder="z. B. 28"
              keyboardType="number-pad"
              value={age}
              onChangeText={setAge}
            />

            <Text style={styles.label}>Über dich</Text>
            <PremiumTextInput
              style={styles.textarea}
              placeholder="Erzähl kurz etwas über dich..."
              multiline
              value={about}
              onChangeText={setAbout}
            />
          </View>

          <View>
            <Text style={styles.label}>Standort</Text>
            <PremiumTextInput
              style={styles.input}
              placeholder="Stadt, z. B. Berlin"
              value={city}
              onChangeText={setCity}
            />

            <Text style={styles.label}>Land</Text>
            <View style={styles.tags}>
              {countryOptions.map((item) => (
                <Tag
                  key={item}
                  title={getCountryLabel(item)}
                  selected={country === item}
                  onPress={() => setCountry(item)}
                />
              ))}
            </View>
          </View>

          <View>
            <Text style={styles.label}>Geschlecht</Text>
            <View style={styles.optionsRow}>
              {genders.map((item) => (
                <Tag
                  key={item}
                  title={getGenderLabel(item)}
                  selected={gender === item}
                  onPress={() => setGender(item)}
                />
              ))}
            </View>
          </View>

          <View>
            <Text style={styles.label}>Interessiert an</Text>
            <View style={styles.optionsRow}>
              {lookingForOptions.map((item) => (
                  <Tag
                    key={item}
                    title={getLookingForLabel(item)}
                    selected={lookingFor.includes(item)}
                    onPress={() => toggleLookingFor(item)}
                  />
              ))}
            </View>
          </View>

          <View>
            <Text style={styles.label}>Interessen</Text>
            <View style={styles.tags}>
              {interestsList.map((item) => (
                <Tag
                  key={item}
                  title={getInterestLabel(item)}
                  selected={interests.includes(item)}
                  onPress={() => toggleInterest(item)}
                />
              ))}
            </View>
          </View>
          <View>
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <PremiumButton
              title={isSaving ? "Profil wird gespeichert..." : "Dates starten"}
              onPress={handleStartMatching}
              disabled={isSaving}
            />
          </View>
        </View>
      </ScrollView>
    </ThemedBackground>
  );
}

async function preparePhotosForStorage(photos: string[]) {
  if (Platform.OS !== "web") {
    return photos;
  }

  return Promise.all(
    photos.map((photo) =>
      shouldResizePhotoForStorage(photo)
        ? resizePhotoForSafariStorage(photo)
        : photo,
    ),
  );
}

// Keep web profile photos at Full HD while avoiding extremely large storage writes.
function shouldResizePhotoForStorage(photo: string) {
  return photo.startsWith("data:image/") && photo.length > 3_500_000;
}

// Re-encode very large web photos to Full HD instead of shrinking them to thumbnail size.
async function resizePhotoForSafariStorage(photo: string) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return photo;
  }

  // Load the image from the data URL
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const nextImage = new window.Image();
    nextImage.onload = () => resolve(nextImage);
    nextImage.onerror = reject;
    nextImage.src = photo;
  });
  const maxSize = FULL_HD_MAX_SIZE;
  const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");

  // Draw the image to the canvas with the new dimensions
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")?.drawImage(image, 0, 0, width, height);

  return canvas.toDataURL("image/jpeg", FULL_HD_JPEG_QUALITY);
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    width: "100%",
    maxWidth: Platform.OS === "web" ? 980 : 500,
    alignSelf: "center",
  },

  section: {
    backgroundColor: "rgba(255, 252, 247, 0.86)",
    borderRadius: 30,
    borderWidth: 1,
    borderColor: premiumColors.hairline,
    padding: 18,
    gap: 18,
    ...premiumShadow,
  },

  background: {
    flex: 1,
    width: "100%",
    maxWidth: "100%",
  },

  container: {
    flexGrow: 1,
    paddingHorizontal: Platform.OS === "web" ? 36 : premiumSpacing.screenX,
    paddingTop: Platform.OS === "web" ? 42 : premiumSpacing.screenTop,
    paddingBottom: Platform.OS === "web" ? 160 : 40,
  },

  keyboardOpenContainer: {
    paddingTop: 28,
    paddingBottom: 320,
  },

  label: {
    ...premiumType.label,
    color: premiumColors.ink,
    marginBottom: 10,
    marginTop: 18,
  },

  input: {
    width: "100%",
  },

  textarea: {
    width: "100%",
    minHeight: 130,
  },

  optionsRow: {
    flexDirection: "row",
    gap: 10,
  },

  option: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E5DED7",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  circle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#999",
  },

  optionText: {
    fontSize: 12,
    color: "#111",
  },

  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  tagPressable: {
    borderRadius: 14,
  },

  error: {
    color: premiumColors.danger,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },

  stepCard: {
    borderRadius: 24,
    backgroundColor: premiumColors.navySoft,
    borderWidth: 1,
    borderColor: "#CEDAE5",
    padding: 16,
  },

  stepLabel: {
    ...premiumType.label,
    color: premiumColors.navy,
  },

  stepText: {
    ...premiumType.body,
    color: premiumColors.muted,
    marginTop: 6,
  },
});
