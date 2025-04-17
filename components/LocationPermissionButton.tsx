import React, { useState, useEffect, useCallback } from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from "react-native";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import theme from "../theme";

type PermissionStatus = "granted" | "denied" | "undetermined";

export default function LocationPermissionButton() {
  const [permissionStatus, setPermissionStatus] =
    useState<PermissionStatus>("undetermined");
  const [isLoading, setIsLoading] = useState(false);

  const checkPermissionStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setPermissionStatus(status);
    } catch (error) {
      console.error("Error checking location permission:", error);
      Alert.alert("Error", "Could not check location permission status.");
      setPermissionStatus("undetermined"); // Reset on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkPermissionStatus();
  }, [checkPermissionStatus]);

  const requestPermission = async () => {
    if (permissionStatus === "denied") {
      // Guide user to settings if permanently denied
      Alert.alert(
        "Permission Denied",
        "Location permission was previously denied. Please enable it in your device settings.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Open Settings", onPress: () => Linking.openSettings() },
        ]
      );
      return;
    }

    setIsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(status);
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Location permission is needed for core app functionality."
        );
      }
    } catch (error) {
      console.error("Error requesting location permission:", error);
      Alert.alert("Error", "Could not request location permission.");
      setPermissionStatus("undetermined"); // Reset on error
    } finally {
      setIsLoading(false);
    }
  };

  const getButtonStyle = () => {
    switch (permissionStatus) {
      case "granted":
        return {
          ...styles.button,
          backgroundColor: theme.colors.status.success,
        };
      case "denied":
        return { ...styles.button, backgroundColor: theme.colors.status.error };
      default:
        return styles.button; // Default blue
    }
  };

  const getButtonText = () => {
    switch (permissionStatus) {
      case "granted":
        return "Location Granted";
      case "denied":
        return "Location Denied";
      default:
        return "Check Location Permission";
    }
  };

  const getButtonIcon = () => {
    switch (permissionStatus) {
      case "granted":
        return "checkmark-circle-outline";
      case "denied":
        return "close-circle-outline";
      default:
        return "location-outline";
    }
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), isLoading && styles.buttonDisabled]}
      onPress={requestPermission}
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <ActivityIndicator size="small" color="white" />
          <Text style={styles.buttonText}>Checking...</Text>
        </>
      ) : (
        <>
          <Ionicons name={getButtonIcon()} size={20} color="white" />
          <Text style={styles.buttonText}>{getButtonText()}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: theme.colors.button.primary,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    backgroundColor: theme.colors.button.primary + "99",
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
    marginLeft: 8,
  },
});
