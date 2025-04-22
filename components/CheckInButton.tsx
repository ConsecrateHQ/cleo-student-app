import React, { useEffect, useState, useRef, useLayoutEffect } from "react";
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
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  Easing,
  withRepeat,
  cancelAnimation,
  runOnJS,
  withSequence,
  withSpring,
  withDelay,
  interpolateColor,
  AnimateStyle,
  SharedValue,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

// Define callback storage if it doesn't exist
if (typeof window !== "undefined" && !window.__CALLBACKS__) {
  window.__CALLBACKS__ = {};
}

interface CheckInButtonProps {
  isCheckingIn: boolean;
  isActiveSession: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  animatedTextStyle: StyleProp<AnimateStyle<TextStyle>>;
  animatedNewTextStyle: StyleProp<AnimateStyle<TextStyle>>;
  animatedCircleStyle: StyleProp<AnimateStyle<ViewStyle>>;
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
  // Shared animation values
  const activeOpacity = useSharedValue(0);
  const breathingScale = useSharedValue(1);
  const checkScale = useSharedValue(0);
  const borderWidth = useSharedValue(0);
  const borderOpacity = useSharedValue(0);
  const rotation = useSharedValue(0);
  const circleScale = useSharedValue(1);
  const borderColor = useSharedValue("#4CAF50");

  // Text animation values - set explicit initial values
  const [showLongTapText, setShowLongTapText] = useState(false);
  const tapTextOpacity = useSharedValue(1); // Start with 1
  const longTapTextOpacity = useSharedValue(0); // Start with 0
  const showLongTapTextRef = useRef(showLongTapText);

  // Track if this is the first render
  const isInitialRender = useRef(true);

  // Track previous state with refs instead of state to avoid re-renders
  const prevIsActiveSessionRef = useRef(isActiveSession);
  const prevIsCheckingInRef = useRef(isCheckingIn);
  const stateKeyRef = useRef(`${isActiveSession}-${isCheckingIn}`);

  // Use layout effect to ensure opacity values are set before first render
  useLayoutEffect(() => {
    // Explicitly set initial values again to be safe
    tapTextOpacity.value = 1;
    longTapTextOpacity.value = 0;
  }, []);

  // Initialize the state if active on component mount
  useEffect(() => {
    if (isActiveSession) {
      // Set initial active state values
      borderWidth.value = 12; // Thicker border for active state
      borderOpacity.value = 1;
      activeOpacity.value = 1;
      checkScale.value = 1;
    }
  }, []);

  // Start or stop breathing animation based on state
  useEffect(() => {
    if (!isCheckingIn && !isActiveSession) {
      console.log("Starting breathing animation");
      breathingScale.value = withRepeat(
        withTiming(1.1, {
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
        }),
        -1, // Infinite repetitions
        true // Reverse animation
      );
    } else {
      console.log("Stopping breathing animation");
      cancelAnimation(breathingScale);
      breathingScale.value = withTiming(1, { duration: 200 }); // Smoothly return to scale 1
    }

    return () => {
      cancelAnimation(breathingScale);
    };
  }, [isCheckingIn, isActiveSession]);

  // Text alternation effect (Cross-fade)
  useEffect(() => {
    console.log(
      `Setting up text cross-fade. isCheckingIn: ${isCheckingIn}, isActiveSession: ${isActiveSession}`
    );
    let intervalId: NodeJS.Timeout | null = null;
    let startDelayTimeoutId: NodeJS.Timeout | null = null;

    const cleanupTimeouts = () => {
      console.log("Cleanup: Clearing timeouts/intervals");
      runOnJS(setShowLongTapText)(false); // Ensure state matches
      showLongTapTextRef.current = false; // Reset ref during cleanup
      if (intervalId) clearInterval(intervalId);
      if (startDelayTimeoutId) clearTimeout(startDelayTimeoutId);
      intervalId = null;
      startDelayTimeoutId = null;
    };

    if (!isCheckingIn && !isActiveSession) {
      console.log("Idle state: Initializing cross-fade effect.");

      // Forcibly set initial state every time we enter idle mode
      tapTextOpacity.value = 1;
      longTapTextOpacity.value = 0;

      // Ensure the logical state matches the visual state
      runOnJS(setShowLongTapText)(false);
      showLongTapTextRef.current = false; // Sync ref immediately

      const animationDuration = 300; // Reduced duration for a quicker fade

      const toggleText = () => {
        const nextShowLongTap = !showLongTapTextRef.current;
        console.log(
          `Toggling text. Current ref state: ${
            showLongTapTextRef.current
          }. Next state will be: ${nextShowLongTap}. Idle state: ${
            !isCheckingIn && !isActiveSession
          }`
        );

        // GUARD: Only proceed if still in the idle state
        if (isCheckingIn || isActiveSession) {
          console.log("Aborting toggleText - no longer in idle state.");
          cleanupTimeouts(); // Ensure cleanup happens if state changed mid-animation
          return;
        }

        if (nextShowLongTap) {
          console.log("Animating: Tap -> Long-tap");
          tapTextOpacity.value = withTiming(0, { duration: animationDuration });
          longTapTextOpacity.value = withTiming(1, {
            duration: animationDuration,
          });
        } else {
          console.log("Animating: Long-tap -> Tap");
          tapTextOpacity.value = withTiming(1, { duration: animationDuration });
          longTapTextOpacity.value = withTiming(0, {
            duration: animationDuration,
          });
        }

        // Update the logical state AND the ref's current value
        runOnJS(() => {
          setShowLongTapText(nextShowLongTap);
          showLongTapTextRef.current = nextShowLongTap; // Update ref directly here
          console.log(
            `State and Ref updated inside runOnJS for next state: ${nextShowLongTap}`
          );
        })(); // Immediately invoke the function passed to runOnJS

        // Log after runOnJS is scheduled
        console.log(
          `Animation started, runOnJS scheduled for next state: ${nextShowLongTap}`
        );
      };

      // Start alternating after 2 seconds, then every 5 seconds
      startDelayTimeoutId = setTimeout(() => {
        toggleText(); // First toggle
        intervalId = setInterval(toggleText, 5000 + animationDuration); // Adjust interval to account for animation time
      }, 2000);

      return () => {
        console.log(
          "Cleaning up text alternation effect due to dependency change or unmount"
        );
        cleanupTimeouts();
        // Force reset opacities on cleanup to avoid lingering states
        tapTextOpacity.value = 1;
        longTapTextOpacity.value = 0;
      };
    } else {
      // Reset opacities and state if not in idle state
      tapTextOpacity.value = withTiming(1, { duration: 300 });
      longTapTextOpacity.value = withTiming(0, { duration: 300 });
      runOnJS(setShowLongTapText)(false); // Reset logical state
      cleanupTimeouts(); // Clear any running timers/intervals
    }

    // Only re-run the effect if the activity/checking-in state changes
  }, [isCheckingIn, isActiveSession]);

  // Handle state transitions with useEffect instead of useCallback+useEffect pattern
  useEffect(() => {
    const newStateKey = `${isActiveSession}-${isCheckingIn}`;
    const prevStateKey = stateKeyRef.current;

    // Skip if the state hasn't changed
    if (newStateKey === prevStateKey) return;

    console.log(`Button state transition: ${prevStateKey} -> ${newStateKey}`);
    stateKeyRef.current = newStateKey;

    const wasActive = prevIsActiveSessionRef.current;
    const isActive = isActiveSession;

    // Going from inactive to active
    if (!wasActive && isActive) {
      console.log("Transitioning to active state");

      // 1. Quick outward pulse of the circle
      circleScale.value = withSequence(
        withTiming(1.1, { duration: 150, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 200, easing: Easing.inOut(Easing.cubic) })
      );

      // 2. Border animation - expand and then settle (at 12px for boldness)
      borderWidth.value = withSequence(
        withTiming(14, { duration: 250, easing: Easing.out(Easing.cubic) }),
        withTiming(12, { duration: 150, easing: Easing.inOut(Easing.cubic) })
      );

      // Make sure border is visible with animated opacity
      borderOpacity.value = withTiming(1, { duration: 250 });

      // 3. Checkmark animation - rotate in and bounce slightly
      rotation.value = withSequence(
        withTiming(-30, { duration: 10 }),
        withTiming(0, {
          duration: 300,
          easing: Easing.out(Easing.back(2)),
        })
      );

      // 4. Scale in the checkmark with a spring effect
      checkScale.value = withSequence(
        withTiming(0, { duration: 10 }),
        withDelay(
          50,
          withSpring(1.2, {
            damping: 12,
            stiffness: 120,
          })
        ),
        withDelay(
          120,
          withSpring(1, {
            damping: 15,
            stiffness: 150,
          })
        )
      );

      // 5. Opacity for the checkmark
      activeOpacity.value = withTiming(1, {
        duration: 200,
        easing: Easing.inOut(Easing.cubic),
      });

      // 6. Animated border color pulsation
      // Create a pulsating effect for the border when active
      borderColor.value = withRepeat(
        withTiming("#2E7D32", { duration: 2000 }),
        -1,
        true
      );
    }
    // Going from active to inactive
    else if (wasActive && !isActive) {
      console.log("Transitioning to inactive state");

      activeOpacity.value = withTiming(0, {
        duration: 200,
        easing: Easing.inOut(Easing.cubic),
      });

      checkScale.value = withTiming(0, {
        duration: 150,
        easing: Easing.out(Easing.cubic),
      });

      borderWidth.value = withTiming(0, {
        duration: 200,
        easing: Easing.inOut(Easing.cubic),
      });

      borderOpacity.value = withTiming(0, { duration: 200 });

      // Cancel border color animation
      cancelAnimation(borderColor);
      borderColor.value = "#4CAF50";

      // Quick tiny pulse on exit
      circleScale.value = withSequence(
        withTiming(0.95, { duration: 100 }),
        withTiming(1, { duration: 150 })
      );
    }

    // Update previous state refs
    prevIsActiveSessionRef.current = isActiveSession;
    prevIsCheckingInRef.current = isCheckingIn;
  }, [isActiveSession, isCheckingIn]);

  // Animated styles
  const animatedCheckStyle = useAnimatedStyle(() => ({
    opacity: activeOpacity.value,
    transform: [
      { scale: checkScale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  // Animated styles for cross-fading text
  const animatedTapTextStyle = useAnimatedStyle(() => ({
    opacity: tapTextOpacity.value,
  }));

  const animatedLongTapTextStyle = useAnimatedStyle(() => ({
    opacity: longTapTextOpacity.value,
  }));

  const animatedBreathingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathingScale.value }],
  }));

  const animatedBorderStyle = useAnimatedStyle(() => {
    return {
      borderWidth: borderWidth.value,
      borderColor:
        borderOpacity.value === 0 ? "transparent" : borderColor.value,
    };
  });

  const animatedCircleTransformStyle = useAnimatedStyle(() => ({
    transform: [{ scale: circleScale.value }],
  }));

  // Handle long press
  const handleLongPress = () => {
    if (!isCheckingIn && !isActiveSession) {
      console.log("Long press detected - navigating to join class screen");

      if (onJoinClass) {
        const callbackId = `join_class_${Date.now()}`;
        window.__CALLBACKS__[callbackId] = onJoinClass;
        router.push({
          pathname: "/join-class",
          params: { callbackId },
        });
      } else {
        router.push("/join-class");
      }

      if (onLongPress) onLongPress();
    }
  };

  // Determine text visibility
  const idleTextVisible = !isActiveSession && !isCheckingIn;
  const checkingTextVisible = isCheckingIn;

  return (
    <View style={styles.centerCircleContainer} pointerEvents="box-none">
      <View style={styles.textContainer}>
        {/* Idle Text: Render both, control visibility with opacity */}
        {idleTextVisible && (
          <>
            {showLongTapText ? (
              <Animated.Text
                style={[
                  styles.checkInText,
                  styles.absoluteText,
                  animatedTextStyle,
                  animatedLongTapTextStyle,
                ]}
              >
                Long-tap to Join Class
              </Animated.Text>
            ) : (
              <Animated.Text
                style={[
                  styles.checkInText,
                  styles.absoluteText,
                  animatedTextStyle,
                  animatedTapTextStyle,
                ]}
              >
                Tap to Check In
              </Animated.Text>
            )}
          </>
        )}

        {checkingTextVisible && (
          <Animated.Text style={[styles.checkInText, animatedNewTextStyle]}>
            Getting you in...
          </Animated.Text>
        )}
      </View>

      <Animated.View style={animatedCircleStyle}>
        <Animated.View
          style={[
            animatedBreathingStyle,
            animatedCircleTransformStyle,
            animatedBorderStyle,
            { borderRadius: Dimensions.get("window").width * 3 },
          ]}
        >
          <TouchableOpacity
            style={[styles.checkInCircle]}
            activeOpacity={0.7}
            onPress={onPress}
            onLongPress={handleLongPress}
            delayLongPress={500}
            disabled={isCheckingIn || isActiveSession}
            pressRetentionOffset={{ top: 20, left: 20, right: 20, bottom: 20 }}
          >
            <Animated.View
              style={[styles.checkInActiveIndicator, animatedCheckStyle]}
            >
              <Ionicons
                name="checkmark"
                size={48}
                color="#4CAF50"
                weight="bold"
              />
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  centerCircleContainer: {
    position: "absolute",
    top: "30%", // shift upward, adjust as needed
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: -1, // Negative zIndex to ensure it stays behind BottomSheet
  },
  textContainer: {
    height: 80, // Increased from 40 to 80 to accommodate two lines of text
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    position: "relative",
    width: "80%", // Give container some width
  },
  checkInText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    width: "100%", // Ensure text has full width
  },
  checkInCircle: {
    width: Dimensions.get("window").width * 0.3,
    height: Dimensions.get("window").width * 0.3,
    borderRadius: Dimensions.get("window").width * 0.15,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  checkInActiveIndicator: {
    justifyContent: "center",
    alignItems: "center",
  },
  absoluteText: {
    position: "absolute",
  },
});

export default CheckInButton;
