import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  GestureResponderEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

interface DevToolsButtonsProps {
  onDevPress?: (event: GestureResponderEvent) => void;
  onExpPress?: (event: GestureResponderEvent) => void;
}

const DevToolsButtons: React.FC<DevToolsButtonsProps> = ({
  onDevPress,
  onExpPress,
}) => {
  if (!__DEV__) {
    return null; // Only render in development mode
  }

  const handleDevPress = (event: GestureResponderEvent) => {
    router.push("/dev");
  };

  const handleExpPress = (event: GestureResponderEvent) => {
    if (onExpPress) {
      onExpPress(event);
    } else {
      router.push("/playground");
    }
  };

  return (
    <View style={styles.topRightButtonsContainer}>
      <TouchableOpacity style={styles.devMenuButton} onPress={handleDevPress}>
        <Ionicons name="construct-outline" size={20} color="white" />
        <Text style={styles.devMenuButtonText}>Dev</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.expMenuButton} onPress={handleExpPress}>
        <Ionicons name="flask-outline" size={20} color="white" />
        <Text style={styles.devMenuButtonText}>Exp.</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  topRightButtonsContainer: {
    position: "absolute",
    top: 50, // Adjust as needed, consider safe area insets
    right: 20,
    flexDirection: "row",
    zIndex: 2000, // Ensure they are above other elements
  },
  devMenuButton: {
    backgroundColor: "rgba(102, 102, 102, 0.9)",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    elevation: 10,
    marginRight: 8,
  },
  expMenuButton: {
    backgroundColor: "rgba(102, 102, 102, 0.9)",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    elevation: 10,
  },
  devMenuButtonText: {
    color: "white",
    marginLeft: 6,
    fontWeight: "500",
  },
});

export default DevToolsButtons;
