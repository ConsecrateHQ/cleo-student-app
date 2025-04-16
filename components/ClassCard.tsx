import React from "react";
import { View, Text, StyleSheet } from "react-native";
import theme from "../theme";

const ClassCard = () => {
  return (
    <View style={styles.card}>
      <Text style={styles.text}>Class Card</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 150,
    height: 150,
    backgroundColor: theme.colors.background.card, // Use a theme color
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#555", // A distinguishable border
    justifyContent: "center",
    alignItems: "center",
    margin: 10, // Add some margin for grid spacing
  },
  text: {
    color: theme.colors.text.primary,
    fontSize: 16,
  },
});

export default ClassCard;
