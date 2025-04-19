import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import theme from "../theme";

interface CongratulationsDrawerProps {
  isVisible: boolean;
  className: string;
  onClose: () => void;
}

const { width, height } = Dimensions.get("window");

const CongratulationsDrawer: React.FC<CongratulationsDrawerProps> = ({
  isVisible,
  className,
  onClose,
}) => {
  const translateY = useRef(new Animated.Value(height)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      // Animate the drawer up from the bottom
      Animated.timing(translateY, {
        toValue: 0,
        duration: 500,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
        useNativeDriver: true,
      }).start();

      // Fade in the background overlay
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // Animate the drawer back down
      Animated.timing(translateY, {
        toValue: height,
        duration: 400,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
        useNativeDriver: true,
      }).start();

      // Fade out the background overlay
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible, translateY, opacity]);

  if (!isVisible) return null;

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: opacity,
          },
        ]}
      >
        <TouchableOpacity style={styles.overlayTouch} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.drawer,
          {
            transform: [{ translateY: translateY }],
          },
        ]}
      >
        <SafeAreaView edges={["bottom"]} style={styles.drawerContent}>
          <View style={styles.header}>
            <Text style={styles.congratsText}>Class Complete!</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <Text style={styles.sessionEndedText}>
            You've successfully completed your session!
          </Text>
          <Text style={styles.classNameText}>{className}</Text>

          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Ionicons name="checkmark-circle" size={32} color="#4CD964" />
              <Text style={styles.statValue}>100%</Text>
              <Text style={styles.statLabel}>Attendance</Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name="time" size={32} color="#007AFF" />
              <Text style={styles.statValue}>Great!</Text>
              <Text style={styles.statLabel}>On Time</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.closeSessionButton} onPress={onClose}>
            <Text style={styles.closeSessionButtonText}>Continue</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  overlayTouch: {
    flex: 1,
  },
  drawer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.7,
    backgroundColor: theme.colors.background.app,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  drawerContent: {
    flex: 1,
    padding: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  congratsText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
  },
  closeButton: {
    padding: 8,
  },
  sessionEndedText: {
    fontSize: 18,
    color: theme.colors.text.secondary,
    marginBottom: 8,
  },
  classNameText: {
    fontSize: 24,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 32,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 32,
  },
  statCard: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    width: "45%",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginTop: 4,
  },
  closeSessionButton: {
    backgroundColor: "#007AFF",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    marginTop: 16,
  },
  closeSessionButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
});

export default CongratulationsDrawer;
