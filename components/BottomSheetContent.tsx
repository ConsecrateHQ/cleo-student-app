import React from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import * as Haptics from "expo-haptics";

export default function BottomSheetContent() {
  const handleSmileyPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.helloText}>Hello</Text>
      <TouchableOpacity
        onPress={handleSmileyPress}
        style={styles.smileyContainer}
      >
        <Text style={styles.smileyFace}>😊</Text>
      </TouchableOpacity>

      <Text style={styles.dragText}>Drag up to see more</Text>
      <Text style={styles.hint}>
        This is a separate screen that slides up from the bottom. Try sliding it
        up and down!
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#111",
    alignItems: "center",
  },
  helloText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "white",
    marginBottom: 20,
  },
  smileyContainer: {
    marginVertical: 20,
    padding: 10,
  },
  smileyFace: {
    fontSize: 60,
  },
  dragText: {
    color: "#2D87C3",
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 30,
  },
  hint: {
    color: "#999",
    fontSize: 14,
    textAlign: "center",
    marginTop: 15,
    maxWidth: "80%",
  },
});
