import ProfileImagePicker from "@/components/ImagePicker";
import {
  PremiumButton,
  PremiumHeader,
  PremiumTag,
  PremiumTextInput,
} from "@/components/PremiumUI";
import { ThemedBackground } from "@/components/ThemedBackground";
import {
  premiumColors,
  premiumShadow,
  premiumSpacing,
  premiumType,
} from "@/constants/premiumDesign";
import {
  getCountryLabel,
  getGenderLabel,
  getInterestLabel,
  getLookingForLabel,
} from "@/constants/ukrainianLabels";
import { getSessionUser } from "@/services/auth/session";
import { setPendingOnboardingProfile } from "@/services/onboarding/pendingProfile";
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

const genders = ["Woman", "Men", "Non-binary"];
const lookingForOptions = ["Women", "Men", "Non-binary"];
const countryOptions = [
  "Germany",
  "United States",
  "United Kingdom",
  "Ukraine",
  "Poland",
  "France",
  "Spain",
  "Italy",
  "Netherlands",
  "Austria",
  "Switzerland",
  "Canada",
  "Australia",
  "Other",
];
const interestsList = [
  "Coffee",
  "Travel",
  "Music",
  "Art",
  "Books",
  "Fitness",
  "Cooking",
  "Movies",
  "Development",
  "Anime",
  "Gaming",
  "Photography",
  "Fashion",
  "Sports",
  "Dancing",
  "Yoga",
  "Club",
  "Bloging",
  "Board Games",
  "Pets",
  "Reading",
  "Writing",
  "Hiking",
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
  const [lookingFor, setLookingFor] = useState("");
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
      setLookingFor(user.lookingFor ?? "");
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

  async function handleStartMatching() {
    const trimmedName = name.trim();
    const trimmedAge = age.trim();
    const trimmedAbout = about.trim();
    const ageNumber = Number(trimmedAge);

    if (!trimmedName) {
      setError("Додайте своє ім'я.");
      return;
    }

    if (!trimmedAge || Number.isNaN(ageNumber) || ageNumber < 18) {
      setError("Додайте коректний вік. Вам має бути 18 або більше.");
      return;
    }

    if (!trimmedAbout || trimmedAbout.length < 10) {
      setError("Напишіть короткий опис, щонайменше 10 символів.");
      return;
    }

    if (!photos[0]) {
      setError("Додайте хоча б одне фото профілю.");
      return;
    }

    if (!gender) {
      setError("Оберіть свою стать.");
      return;
    }

    if (!lookingFor) {
      setError("Оберіть, з ким хочете знайомитися.");
      return;
    }

    if (interests.length < 3) {
      setError("Оберіть щонайменше 3 інтереси.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const storagePhotos = await preparePhotosForStorage(photos);
      setPendingOnboardingProfile({
        name: name.trim() || undefined,
        age: age.trim() || undefined,
        city: city.trim() || undefined,
        country: country || undefined,
        about: about.trim() || undefined,
        picture: storagePhotos[0],
        photos: storagePhotos,
        gender: gender || undefined,
        lookingFor: lookingFor || undefined,
        interests,
      });
    } catch (error) {
      setIsSaving(false);
      setError(
        "Фото профілю завелике для сховища Safari. Видаліть його й додайте знову.",
      );
      return;
    }

    router.replace("/profileSaving");
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
          eyebrow="Налаштування профілю"
          title="Створіть профіль, з яким хочеться знайомитись"
          subtitle="Фото, інтереси й уподобання допомагають Extasy підбирати уважніші знайомства."
        />

        <View style={styles.section}>
          <View style={styles.stepCard}>
            <Text style={styles.stepLabel}>Завантаження фото</Text>
            <Text style={styles.stepText}>
              Почніть із чіткого портрета. Додайте ще фото для контексту й
              довіри.
            </Text>
          </View>
          <ProfileImagePicker photos={photos} onPhotosChange={setPhotos} />

          <View>
            <Text style={styles.label}>Ваше ім'я</Text>
            <PremiumTextInput
              style={styles.input}
              placeholder="Напр. Іван Петренко"
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>Вік</Text>
            <PremiumTextInput
              style={styles.input}
              placeholder="Напр. 28"
              keyboardType="number-pad"
              value={age}
              onChangeText={setAge}
            />

            <Text style={styles.label}>Про вас</Text>
            <PremiumTextInput
              style={styles.textarea}
              placeholder="Розкажіть трохи про себе..."
              multiline
              value={about}
              onChangeText={setAbout}
            />
          </View>

          <View>
            <Text style={styles.label}>Локація</Text>
            <PremiumTextInput
              style={styles.input}
              placeholder="Місто, напр. Берлін"
              value={city}
              onChangeText={setCity}
            />

            <Text style={styles.label}>Країна</Text>
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
            <Text style={styles.label}>Стать</Text>
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
            <Text style={styles.label}>Цікавлять</Text>
            <View style={styles.optionsRow}>
              {lookingForOptions.map((item) => (
                <Tag
                  key={item}
                  title={getLookingForLabel(item)}
                  selected={lookingFor === item}
                  onPress={() => setLookingFor(item)}
                />
              ))}
            </View>
          </View>

          <View>
            <Text style={styles.label}>Інтереси</Text>
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
              title={isSaving ? "Зберігаємо профіль..." : "Почати знайомства"}
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
