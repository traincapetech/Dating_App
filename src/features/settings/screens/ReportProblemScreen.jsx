import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  Animated,
  Alert,
  Image,
} from "react-native";
import { launchImageLibrary } from "react-native-image-picker";

const categories = [
  "Profile Issue",
  "Matching Problem",
  "Messages / Chat",
  "Safety / Harassment",
  "Subscription / Payments",
  "Other",
];

const ReportProblemScreen = () => {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [details, setDetails] = useState("");
  const [imageUri, setImageUri] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const pickImage = () => {
    launchImageLibrary({ mediaType: "photo", quality: 0.6 }, (response) => {
      if (response.didCancel) return;
      if (response.assets && response.assets.length > 0) {
        setImageUri(response.assets[0].uri);
      }
    });
  };

  const submitReport = () => {
    if (!selectedCategory || !details.trim()) {
      Alert.alert("Required", "Select a category & describe the issue.");
      return;
    }

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start(() => setTimeout(() => fadeAnim.setValue(0), 1500));

    console.log("Submitted: ", { selectedCategory, details, imageUri });

    setSelectedCategory(null);
    setDetails("");
    setImageUri(null);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Report a Problem</Text>

      {/* Category Selection */}
      <Text style={styles.label}>Select Issue Type</Text>
      <View style={styles.categoryContainer}>
        {categories.map((cat, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.categoryBtn,
              selectedCategory === cat && styles.selectedCategory,
            ]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text
              style={[
                styles.categoryText,
                selectedCategory === cat && styles.selectedText,
              ]}
            >
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Description */}
      <Text style={styles.label}>Describe the issue</Text>
      <TextInput
        style={styles.input}
        placeholder="Tell us what's happening..."
        value={details}
        onChangeText={setDetails}
        multiline
      />

      {/* Screenshot */}
      <TouchableOpacity style={styles.imageBtn} onPress={pickImage}>
        <Text style={styles.imageBtnText}>
          {imageUri ? "📷 Change Screenshot" : "📷 Add Screenshot"}
        </Text>
      </TouchableOpacity>

      {imageUri && (
        <Image source={{ uri: imageUri }} style={styles.previewImage} />
      )}

      {/* Submit */}
      <TouchableOpacity style={styles.submitBtn} onPress={submitReport}>
        <Text style={styles.submitText}>Submit</Text>
      </TouchableOpacity>

      <Animated.View style={[styles.successToast, { opacity: fadeAnim }]}>
        <Text style={styles.successText}>Report Submitted ✔</Text>
      </Animated.View>
    </ScrollView>
  );
};

export default ReportProblemScreen;

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: "#fff", flex: 1 },
  header: { fontSize: 26, fontWeight: "700", marginBottom: 20 },
  label: { fontSize: 15, fontWeight: "600", marginVertical: 10 },
  categoryContainer: { flexDirection: "row", flexWrap: "wrap" },
  categoryBtn: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 10,
  },
  categoryText: { fontSize: 14 },
  selectedCategory: { backgroundColor: "#FF4D6D", borderColor: "#FF4D6D" },
  selectedText: { color: "#fff", fontWeight: "700" },
  input: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    textAlignVertical: "top",
    backgroundColor: "#fafafa",
  },
  imageBtn: {
    backgroundColor: "#f5f5f5",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginVertical: 12,
  },
  imageBtnText: {
    fontSize: 14,
    fontWeight: "500",
  },
  previewImage: {
    width: "100%",
    height: 160,
    borderRadius: 10,
    marginBottom: 10,
  },
  submitBtn: {
    backgroundColor: "#FF4D6D",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 5,
  },
  submitText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  successToast: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    backgroundColor: "#28a745",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  successText: { color: "#fff", fontWeight: "700" },
});
