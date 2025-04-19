import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StyleProp,
  ViewStyle,
  TextStyle,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

interface CheckInButtonProps {
  isCheckingIn: boolean;
  isActiveSession: boolean;
  onPress: () => void;
  animatedTextStyle: StyleProp<Animated.AnimateStyle<StyleProp<TextStyle>>>;
  animatedNewTextStyle: StyleProp<Animated.AnimateStyle<StyleProp<TextStyle>>>;
  animatedCircleStyle: StyleProp<Animated.AnimateStyle<StyleProp<ViewStyle>>>;
}

const CheckInButton: React.FC<CheckInButtonProps> = ({
  isCheckingIn,
  isActiveSession,
  onPress,
  animatedTextStyle,
  animatedNewTextStyle,
  animatedCircleStyle,
}) => {
  return (
    <View style={styles.centerCircleContainer} pointerEvents="box-none">
      <View style={styles.textContainer}>
        <Animated.Text
          style={[
            styles.checkInText,
            animatedTextStyle,
            isActiveSession ? { opacity: 0 } : {},
          ]}
        >
          Tap to Check In
        </Animated.Text>
        <Animated.Text style={[styles.checkInText, animatedNewTextStyle]}>
          Getting you in...
        </Animated.Text>
      </View>
      <Animated.View style={animatedCircleStyle}>
        <TouchableOpacity
          style={[
            styles.checkInCircle,
            isActiveSession ? styles.checkInCircleActive : {},
          ]}
          activeOpacity={0.7}
          onPress={onPress}
          disabled={isCheckingIn || isActiveSession}
        >
          {isActiveSession && (
            <Animated.View
              entering={FadeIn.duration(300)}
              style={styles.checkInActiveIndicator}
            >
              <Ionicons name="checkmark" size={36} color="#4CAF50" />
            </Animated.View>
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  centerCircleContainer: {
    position: "absolute",
    top: "35%", // shift upward, adjust as needed
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: -1, // Negative zIndex to ensure it stays behind BottomSheet
  },
  textContainer: {
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 40,
    position: "relative",
  },
  checkInText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    position: "absolute",
  },
  checkInCircle: {
    width: Dimensions.get("window").width * 0.3,
    height: Dimensions.get("window").width * 0.3,
    borderRadius: Dimensions.get("window").width * 0.15,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  checkInCircleActive: {
    backgroundColor: "#fff",
    borderColor: "#4CAF50",
    borderWidth: 3,
  },
  checkInActiveIndicator: {
    justifyContent: "center",
    alignItems: "center",
  },
});

export default CheckInButton;
