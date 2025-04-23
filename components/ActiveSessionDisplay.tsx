import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
  TextStyle,
} from "react-native";
import Animated from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import theme from "../theme";

interface ActiveSessionDisplayProps {
  isVisible: boolean;
  className: string;
  timerValue: number; // minutes
  seconds: number;
  hours: number; // Add hours parameter
  onLeavePress: () => void;
  classNameContainerStyle: StyleProp<ViewStyle>;
  timerContainerStyle: StyleProp<ViewStyle>;
  leaveButtonContainerStyle: StyleProp<ViewStyle>;
  animatedClassNameStyle: StyleProp<
    Animated.AnimateStyle<StyleProp<ViewStyle>>
  >;
  animatedTimerStyle: StyleProp<Animated.AnimateStyle<StyleProp<ViewStyle>>>;
  animatedLeaveButtonStyle: StyleProp<
    Animated.AnimateStyle<StyleProp<ViewStyle>>
  >;
}

// Update formatTimer to include hours
const formatTimer = (hours: number, minutes: number, seconds: number) => {
  const formattedHours = hours < 10 ? `0${hours}` : `${hours}`;
  const formattedMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
  const formattedSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`;
  return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
};

const ActiveSessionDisplay: React.FC<ActiveSessionDisplayProps> = ({
  isVisible,
  className,
  timerValue,
  seconds,
  hours,
  onLeavePress,
  classNameContainerStyle,
  timerContainerStyle,
  leaveButtonContainerStyle,
  animatedClassNameStyle,
  animatedTimerStyle,
  animatedLeaveButtonStyle,
}) => {
  if (!isVisible) {
    return null; // Don't render anything if not visible
  }

  return (
    <>
      {/* Class Title */}
      <Animated.View
        style={[
          styles.classTitleContainer,
          classNameContainerStyle,
          animatedClassNameStyle,
        ]}
      >
        <Text style={styles.classTitleText}>{className}</Text>
      </Animated.View>

      {/* Session Duration Timer */}
      <Animated.View
        style={[
          styles.sessionDurationContainer,
          timerContainerStyle,
          animatedTimerStyle,
        ]}
      >
        <Text style={styles.sessionDurationText}>
          {formatTimer(hours, timerValue, seconds)}
        </Text>
      </Animated.View>

      {/* Leave Early Button */}
      <Animated.View
        style={[
          styles.leaveEarlyContainer,
          leaveButtonContainerStyle,
          animatedLeaveButtonStyle,
        ]}
      >
        <TouchableOpacity
          style={styles.leaveEarlyButton}
          onPress={onLeavePress}
        >
          <Ionicons name="exit-outline" size={24} color="#fff" />
          <Text style={styles.leaveEarlyText}>Leave Early</Text>
        </TouchableOpacity>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  classTitleContainer: {
    position: "absolute",
    left: 32,
    zIndex: -1, // Keep behind bottom sheet and other elements
  },
  classTitleText: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  sessionDurationContainer: {
    position: "absolute",
    left: 36,
    flexDirection: "row",
    alignItems: "flex-end",
    zIndex: -1, // Keep behind bottom sheet and other elements
  },
  sessionDurationText: {
    color: "#fff",
    fontSize: 30,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  sessionDurationMin: {
    color: theme.colors.text.secondary,
    fontSize: 24,
    fontWeight: "400",
  },
  leaveEarlyContainer: {
    position: "absolute",
    zIndex: -1, // Keep behind bottom sheet and other elements
  },
  leaveEarlyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 59, 48, 0.8)",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  leaveEarlyText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
});

export default ActiveSessionDisplay;
