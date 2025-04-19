import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import theme from "../theme";

interface CancelButtonProps {
  isVisible: boolean;
  onPress: () => void;
  bottomPosition: number;
}

const CancelButton: React.FC<CancelButtonProps> = ({
  isVisible,
  onPress,
  bottomPosition,
}) => {
  if (!isVisible) return null;

  return (
    <Animated.View
      style={[styles.cancelButtonContainer, { bottom: bottomPosition }]}
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(300)}
    >
      <TouchableOpacity
        style={styles.cancelButton}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Ionicons
          name="close"
          size={30}
          color="white"
          style={{ marginRight: 2 }}
        />
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cancelButtonContainer: {
    position: "absolute",
    right: 20,
    alignItems: "flex-end",
    zIndex: 10,
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: theme.colors.background.modal,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  cancelButtonText: {
    color: theme.colors.text.primary,
    fontWeight: "bold",
    fontSize: 20,
  },
});

export default CancelButton;
