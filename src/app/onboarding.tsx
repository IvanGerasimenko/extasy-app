import { BackButton } from "@/components/BackButton";
import ProfileImagePicker from "@/components/ImagePicker";
import { getSessionUser } from "@/services/auth/session";
import { setPendingOnboardingProfile } from "@/services/onboarding/pendingProfile";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ImageBackground,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
      setError("Add your name.");
      return;
    }

    if (!trimmedAge || Number.isNaN(ageNumber) || ageNumber < 18) {
      setError("Add a valid age. You must be 18 or older.");
      return;
    }

    if (!trimmedAbout || trimmedAbout.length < 10) {
      setError("Write a short bio, at least 10 characters.");
      return;
    }

    if (!photos[0]) {
      setError("Add at least one profile photo.");
      return;
    }

    if (!gender) {
      setError("Choose your gender.");
      return;
    }

    if (!lookingFor) {
      setError("Choose who you want to meet.");
      return;
    }

    if (interests.length < 3) {
      setError("Choose at least 3 interests.");
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
        "Profile photo is too large for Safari storage. Remove it and add it again.",
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
      <TouchableOpacity
        style={[styles.tag, selected && styles.selectedTag]}
        onPress={onPress}
      >
        <Text style={[styles.tagText, selected && styles.selectedText]}>
          {title}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <ImageBackground
      source={require("../../assets/bg.png")}
      style={[
        styles.background,
        webViewportHeight ? { height: webViewportHeight } : null,
      ]}
      resizeMode="cover"
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
        <BackButton to="/welcome" />
        <Text style={styles.title}>Complete your profile</Text>
        <Text style={styles.subtitle}>It only takes 2 minutes</Text>

        <View style={styles.section}>
          <ProfileImagePicker photos={photos} onPhotosChange={setPhotos} />

          <View>
            <Text style={styles.label}>Your name</Text>
            <TextInput
              style={styles.input}
              placeholder="E.g. John Doe"
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>Age</Text>
            <TextInput
              style={styles.input}
              placeholder="E.g. 28"
              keyboardType="number-pad"
              value={age}
              onChangeText={setAge}
            />

            <Text style={styles.label}>About you</Text>
            <TextInput
              style={styles.textarea}
              placeholder="Tell others a little bit about yourself..."
              multiline
              value={about}
              onChangeText={setAbout}
            />
          </View>

          <View>
            <Text style={styles.label}>Location</Text>
            <TextInput
              style={styles.input}
              placeholder="City, e.g. Berlin"
              value={city}
              onChangeText={setCity}
            />

            <Text style={styles.label}>Country</Text>
            <View style={styles.tags}>
              {countryOptions.map((item) => (
                <Tag
                  key={item}
                  title={item}
                  selected={country === item}
                  onPress={() => setCountry(item)}
                />
              ))}
            </View>
          </View>

          <View>
            <Text style={styles.label}>Gender</Text>
            <View style={styles.optionsRow}>
              {genders.map((item) => (
                <Tag
                  key={item}
                  title={item}
                  selected={gender === item}
                  onPress={() => setGender(item)}
                />
              ))}
            </View>
          </View>

          <View>
            <Text style={styles.label}>Interested in</Text>
            <View style={styles.optionsRow}>
              {lookingForOptions.map((item) => (
                <Tag
                  key={item}
                  title={item}
                  selected={lookingFor === item}
                  onPress={() => setLookingFor(item)}
                />
              ))}
            </View>
          </View>

          <View>
            <Text style={styles.label}>Interests</Text>
            <View style={styles.tags}>
              {interestsList.map((item) => (
                <Tag
                  key={item}
                  title={item}
                  selected={interests.includes(item)}
                  onPress={() => toggleInterest(item)}
                />
              ))}
            </View>
          </View>
          <View>
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.button, isSaving && styles.disabledButton]}
              onPress={handleStartMatching}
              disabled={isSaving}
            >
              <Text style={styles.buttonText}>
                {isSaving ? "Saving..." : "Start Matching"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </ImageBackground>
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

function shouldResizePhotoForStorage(photo: string) {
  return photo.startsWith("data:image/") && photo.length > 500_000;
}

async function resizePhotoForSafariStorage(photo: string) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return photo;
  }

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const nextImage = new window.Image();
    nextImage.onload = () => resolve(nextImage);
    nextImage.onerror = reject;
    nextImage.src = photo;
  });
  const maxSize = 420;
  const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");

  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")?.drawImage(image, 0, 0, width, height);

  return canvas.toDataURL("image/jpeg", 0.45);
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    width: "100%",
    maxWidth: 500,
    alignSelf: "center",
  },

  section: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    borderRadius: 20,
    padding: 20,
    gap: 20,
  },

  background: {
    flex: 1,
    width: "100%",
    maxWidth: "100%",
  },

  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "web" ? 110 : 70,
    paddingBottom: Platform.OS === "web" ? 160 : 40,
  },

  keyboardOpenContainer: {
    paddingTop: 28,
    paddingBottom: 320,
  },

  title: {
    fontSize: 22,
    color: "#111",
    textAlign: "center",
  },

  subtitle: {
    fontSize: 13,
    color: "#777",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 32,
  },

  label: {
    fontSize: 13,
    color: "#111",
    marginBottom: 10,
    marginTop: 18,
  },

  input: {
    height: 54,
    borderRadius: 16,
    backgroundColor: "#FFF",
    paddingHorizontal: 16,
    fontSize: 13,
    borderWidth: 1,
    borderColor: "#E5DED7",
  },

  textarea: {
    height: 120,
    borderRadius: 18,
    backgroundColor: "#FFF",
    padding: 16,
    fontSize: 13,
    borderWidth: 1,
    borderColor: "#E5DED7",
    textAlignVertical: "top",
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

  tag: {
    paddingHorizontal: 16,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E5DED7",
    justifyContent: "center",
  },

  tagText: {
    fontSize: 12,
    color: "#111",
  },

  selectedOption: {
    backgroundColor: "#111",
    borderColor: "#111",
  },

  selectedCircle: {
    backgroundColor: "#FFF",
    borderColor: "#FFF",
  },

  selectedText: {
    color: "#FFF",
  },

  selectedTag: {
    backgroundColor: "#111",
    borderColor: "#111",
  },

  button: {
    height: 58,
    borderRadius: 18,
    backgroundColor: "#111",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 34,
  },

  disabledButton: {
    opacity: 0.65,
  },

  error: {
    color: "#7A1F1F",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },

  buttonText: {
    color: "#FFF",
    fontSize: 13,
  },
});
