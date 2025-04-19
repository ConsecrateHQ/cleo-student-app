import React, { useEffect, useState, useCallback } from "react";
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
import Animated, {
  FadeIn,
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  Easing,
  withRepeat,
  withSequence,
  cancelAnimation,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import JoinClassModal from "./JoinClassModal";

interface CheckInButtonProps {
  isCheckingIn: boolean;
  isActiveSession: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  animatedTextStyle: StyleProp<Animated.AnimateStyle<StyleProp<TextStyle>>>;
  animatedNewTextStyle: StyleProp<Animated.AnimateStyle<StyleProp<TextStyle>>>;
  animatedCircleStyle: StyleProp<Animated.AnimateStyle<StyleProp<ViewStyle>>>;
  onJoinClass?: (code: string) => Promise<void>;
}

const CheckInButton: React.FC<CheckInButtonProps> = ({
  isCheckingIn,
  isActiveSession,
  onPress,
  onLongPress,
  animatedTextStyle,
  animatedNewTextStyle,
  animatedCircleStyle,
  onJoinClass,
}) => {
  // Add state for join modal
  const [joinModalVisible, setJoinModalVisible] = useState(false);

  // Add local transition for better state handling
  const activeOpacity = useSharedValue(0);
  const statusTextOpacity = useSharedValue(1);
  const statusTextTranslateY = useSharedValue(0);
  // Add breathing animation value
  const breathingScale = useSharedValue(1);

  // Track previous session state to detect transitions
  const [prevIsActiveSession, setPrevIsActiveSession] =
    useState(isActiveSession);
  const [prevIsCheckingIn, setPrevIsCheckingIn] = useState(isCheckingIn);

  // Add a compound state variable for better state tracking
  const [stateKey, setStateKey] = useState(
    `${isActiveSession}-${isCheckingIn}`
  );

  // Debug output to track state changes
  console.log(
    `CheckInButton render - isActiveSession: ${isActiveSession}, prevIsActiveSession: ${prevIsActiveSession}, isCheckingIn: ${isCheckingIn}, prevIsCheckingIn: ${prevIsCheckingIn}`
  );

  // Start or stop breathing animation based on state
  useEffect(() => {
    if (!isCheckingIn && !isActiveSession) {
      // Button is idle, start breathing animation
      console.log("Starting breathing animation");

      // Using withRepeat with true for the reverse parameter will ensure
      // smooth animation in both directions
      breathingScale.value = withRepeat(
        withTiming(1.1, {
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
        }),
        -1, // Infinite repetitions
        true // Reverse animation for smooth transition back to original size
      );
    } else {
      // Button is active or checking in, stop breathing
      console.log("Stopping breathing animation");
      cancelAnimation(breathingScale);
      breathingScale.value = 1;
    }

    return () => {
      // Clean up on unmount
      cancelAnimation(breathingScale);
    };
  }, [isCheckingIn, isActiveSession, breathingScale]);

  // Handle all state transitions in one place for better coordination
  const handleStateTransition = useCallback(() => {
    const newStateKey = `${isActiveSession}-${isCheckingIn}`;
    if (stateKey === newStateKey) return; // No change

    console.log(
      `CheckInButton state transition: ${stateKey} -> ${newStateKey}`
    );
    setStateKey(newStateKey);

    // State transitions that require animation
    if (!prevIsActiveSession && isActiveSession) {
      // Transition to active session
      console.log("Transitioning to active session state");

      // Hide the idle text when transitioning to active session
      statusTextOpacity.value = withTiming(0, {
        duration: 300,
        easing: Easing.out(Easing.ease),
      });

      // Animate check icon
      activeOpacity.value = withTiming(1, {
        duration: 300,
        easing: Easing.inOut(Easing.ease),
      });
    } else if (prevIsActiveSession && !isActiveSession) {
      // Transition from active to idle
      console.log("Transitioning from active to idle state");

      // Animate check icon out
      activeOpacity.value = withTiming(0, {
        duration: 300,
        easing: Easing.inOut(Easing.ease),
      });

      // Show the idle text again when session ends
      statusTextOpacity.value = withTiming(1, {
        duration: 400,
        easing: Easing.inOut(Easing.ease),
      });
      statusTextTranslateY.value = withTiming(0, {
        duration: 400,
        easing: Easing.inOut(Easing.ease),
      });
    } else if (
      (!prevIsCheckingIn && isCheckingIn) ||
      (prevIsCheckingIn && !isCheckingIn)
    ) {
      // Either starting or ending the checking state
      // Let the firefly animation handle the text transitions
      console.log(
        isCheckingIn
          ? "Starting check-in animation"
          : "Ending check-in animation"
      );

      // If ending check-in and not in active session, ensure idle text is visible
      if (!isCheckingIn && !isActiveSession) {
        statusTextOpacity.value = withTiming(1, {
          duration: 300,
          easing: Easing.inOut(Easing.ease),
        });
      }
    }

    // Update previous state trackers
    setPrevIsActiveSession(isActiveSession);
    setPrevIsCheckingIn(isCheckingIn);
  }, [
    isActiveSession,
    isCheckingIn,
    prevIsActiveSession,
    prevIsCheckingIn,
    stateKey,
    activeOpacity,
    statusTextOpacity,
    statusTextTranslateY,
  ]);

  // Run state transition handler on all state changes
  useEffect(() => {
    handleStateTransition();
  }, [isActiveSession, isCheckingIn, handleStateTransition]);

  // Create animated styles
  const animatedCheckStyle = useAnimatedStyle(() => ({
    opacity: activeOpacity.value,
  }));

  const animatedStatusTextStyle = useAnimatedStyle(() => ({
    opacity: statusTextOpacity.value,
    transform: [{ translateY: statusTextTranslateY.value }],
  }));

  // Create breathing animation style
  const animatedBreathingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathingScale.value }],
  }));

  // Handle long press to show join modal
  const handleLongPress = () => {
    if (!isCheckingIn && !isActiveSession) {
      console.log("Long press detected - opening join modal");
      setJoinModalVisible(true);
      if (onLongPress) {
        onLongPress();
      }
    }
  };

  const handleJoinSubmit = async (code: string) => {
    console.log("Attempting to join class with code:", code);
    if (onJoinClass) {
      try {
        return await onJoinClass(code);
      } catch (err) {
        console.error("Error joining class:", err);
        throw err;
      }
    }
    throw new Error("No join handler provided");
  };

  // Determine which text should be visible based on current state
  const idleTextVisible = !isActiveSession && !isCheckingIn;
  const checkingTextVisible = isCheckingIn;

  return (
    <>
      <View style={styles.centerCircleContainer} pointerEvents="box-none">
        <View style={styles.textContainer}>
          {/* Idle state text - ALWAYS render but control visibility with opacity */}
          <Animated.Text
            style={[
              styles.checkInText,
              animatedStatusTextStyle,
              animatedTextStyle,
              { opacity: idleTextVisible ? 1 : 0 },
              // Use pointerEvents to prevent interaction when invisible
              !idleTextVisible && { position: "absolute" },
            ]}
          >
            Tap to Check In
          </Animated.Text>

          {/* Loading text - ALWAYS render but control visibility with opacity */}
          <Animated.Text
            style={[
              styles.checkInText,
              animatedNewTextStyle,
              { opacity: checkingTextVisible ? 1 : 0 },
              // Use pointerEvents to prevent interaction when invisible
              !checkingTextVisible && { position: "absolute" },
            ]}
          >
            Getting you in...
          </Animated.Text>
        </View>
        <Animated.View style={animatedCircleStyle}>
          <Animated.View style={animatedBreathingStyle}>
            <TouchableOpacity
              style={[
                styles.checkInCircle,
                isActiveSession ? styles.checkInCircleActive : {},
              ]}
              activeOpacity={0.7}
              onPress={onPress}
              onLongPress={handleLongPress}
              delayLongPress={500}
              disabled={isCheckingIn || isActiveSession}
            >
              <Animated.View
                style={[styles.checkInActiveIndicator, animatedCheckStyle]}
              >
                <Ionicons name="checkmark" size={36} color="#4CAF50" />
              </Animated.View>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </View>

      {/* Join Class Modal */}
      <JoinClassModal
        visible={joinModalVisible}
        onClose={() => setJoinModalVisible(false)}
        onSubmit={handleJoinSubmit}
      />
    </>
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
