import { premiumColors, premiumShadow } from "@/constants/premiumDesign";
import * as ExpoImagePicker from "expo-image-picker";
import React from "react";
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type ImagePickerProps = {
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
};

const FULL_HD_MAX_SIZE = 1920;
const FULL_HD_JPEG_QUALITY = 0.92;

export default function ImagePicker({
  photos,
  onPhotosChange,
}: ImagePickerProps) {
  async function createPersistentPhoto(
    asset: ExpoImagePicker.ImagePickerAsset,
  ) {
    if (Platform.OS === "web") {
      return resizeWebImage(asset.uri);
    }

    return asset.uri;
  }

  async function pickImage() {
    if (Platform.OS !== "web") {
      const permission =
        await ExpoImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        alert(
          "Für das Hinzufügen von Fotos ist eine Berechtigung erforderlich",
        );
        return;
      }
    }

    const result = await ExpoImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      base64: false,
      quality: 1,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      const persistentPhoto = await createPersistentPhoto(asset);

      onPhotosChange([...photos, persistentPhoto]);
    }
  }

  function removePhoto(photoToRemove: string) {
    onPhotosChange(photos.filter((photo) => photo !== photoToRemove));
  }

  return (
    <View style={styles.photosGrid}>
      <TouchableOpacity style={styles.addPhoto} onPress={pickImage}>
        <Text style={styles.plus}>+</Text>
        <Text style={styles.addPhotoText}>Foto hinzufügen</Text>
      </TouchableOpacity>

      {photos.map((photo) => (
        <View key={photo} style={styles.photoWrap}>
          <Image source={{ uri: photo }} style={styles.photoBox} />
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => removePhoto(photo)}
          >
            <Text style={styles.removeText}>x</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

async function resizeWebImage(uri: string) {
  const response = await fetch(uri);
  const blob = await response.blob();
  const imageUrl = URL.createObjectURL(blob);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new window.Image();
      nextImage.onload = () => resolve(nextImage);
      nextImage.onerror = reject;
      nextImage.src = imageUrl;
    });

    const maxSize = FULL_HD_MAX_SIZE;
    const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement("canvas");

    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")?.drawImage(image, 0, 0, width, height);

    return canvas.toDataURL("image/jpeg", FULL_HD_JPEG_QUALITY);
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

const styles = StyleSheet.create({
  photosGrid: {
    width: "100%",
    minWidth: 0,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 28,
  },

  addPhoto: {
    width: "31%",
    minWidth: 0,
    aspectRatio: 0.82,
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: premiumColors.porcelain,
  },

  plus: {
    fontSize: 22,
    color: premiumColors.champagne,
  },

  addPhotoText: {
    fontSize: 12,
    color: premiumColors.ink,
    fontWeight: "800",
    marginTop: 6,
  },

  photoBox: {
    width: "100%",
    height: "100%",
    borderRadius: 18,
    backgroundColor: premiumColors.champagneSoft,
    ...premiumShadow,
  },

  photoWrap: {
    width: "31%",
    minWidth: 0,
    aspectRatio: 0.82,
  },

  removeButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  removeText: {
    color: "#FFF",
    fontSize: 13,
  },
});
