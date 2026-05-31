import * as ExpoImagePicker from "expo-image-picker";
import React from "react";
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type ImagePickerProps = {
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
};

export default function ImagePicker({
  photos,
  onPhotosChange,
}: ImagePickerProps) {
  async function createPersistentPhoto(asset: ExpoImagePicker.ImagePickerAsset) {
    if (Platform.OS === "web") {
      return resizeWebImage(asset.uri);
    }

    if (asset.base64) {
      const mimeType = asset.mimeType ?? "image/jpeg";
      return `data:${mimeType};base64,${asset.base64}`;
    }

    return asset.uri;
  }

  async function pickImage() {
    const permission =
      await ExpoImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      alert("Permission is required to add photos");
      return;
    }

    const result = await ExpoImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      base64: true,
      quality: 0.45,
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
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.photosRow}
    >
      <TouchableOpacity style={styles.addPhoto} onPress={pickImage}>
        <Text style={styles.plus}>+</Text>
        <Text style={styles.addPhotoText}>Add photo</Text>
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
    </ScrollView>
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

    const maxSize = 520;
    const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement("canvas");

    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")?.drawImage(image, 0, 0, width, height);

    return canvas.toDataURL("image/jpeg", 0.55);
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

const styles = StyleSheet.create({
  photosRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 28,
    paddingRight: 4,
  },

  addPhoto: {
    width: 92,
    height: 112,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#C9C2BA",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF",
  },

  plus: {
    fontSize: 22,
    color: "#111",
  },

  addPhotoText: {
    fontSize: 12,
    marginTop: 6,
  },

  photoBox: {
    width: 92,
    height: 112,
    borderRadius: 20,
    backgroundColor: "#E8E2DC",
  },

  photoWrap: {
    width: 92,
    height: 112,
  },

  removeButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0, 0, 0, 0.72)",
    alignItems: "center",
    justifyContent: "center",
  },

  removeText: {
    color: "#FFF",
    fontSize: 13,
  },
});
