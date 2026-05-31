import * as ExpoImagePicker from "expo-image-picker";
import React from "react";
import {
  Image,
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
      quality: 0.8,
    });

    if (!result.canceled) {
      onPhotosChange([...photos, result.assets[0].uri]);
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
    fontFamily: "Satoshi-Regular",
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
    fontFamily: "Satoshi-Bold",
  },
});
