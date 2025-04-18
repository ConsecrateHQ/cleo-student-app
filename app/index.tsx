import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  Dimensions,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import theme from "../theme";
import Animated, {
  useSharedValue,
  withTiming,
  withSequence,
  withDelay,
  useAnimatedStyle,
  Easing,
  FadeIn,
  FadeOut,
  SlideInLeft,
  SlideInUp,
} from "react-native-reanimated";
import DevMenu from "../components/DevMenu";
import useAuthStore from "../hooks/useAuthStore";
import { SafeAreaView } from "react-native-safe-area-context";
import { useBottomSheetAnimations } from "../hooks/useBottomSheetAnimations";
import { useFireflyAnimation } from "../hooks/useFireflyAnimation";
import {
  useClassSessionChecker,
  SessionCheckResult,
} from "../hooks/useClassSessionChecker";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { checkOutFromSession } from "../utils/firebaseClassSessionHelpers";
import ActiveSessionDisplay from "../components/ActiveSessionDisplay";
import CheckInButton from "../components/CheckInButton";
import ThisWeekSheetContent from "../components/ThisWeekSheetContent";
import DevToolsButtons from "../components/DevToolsButtons";

const App = () => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const windowHeight = Dimensions.get("window").height;
  const animatedPosition = useSharedValue(windowHeight);
  const snapPoints = useMemo(() => [140, windowHeight], [windowHeight]);

  // State for active session
  const [activeSession, setActiveSession] = useState<{
    isActive: boolean;
    className: string;
    sessionId: string;
    timer: number;
    timerInterval: NodeJS.Timeout | null;
  }>({
    isActive: false,
    className: "",
    sessionId: "",
    timer: 0,
    timerInterval: null,
  });

  // Animation values for active session display
  const classNameOpacity = useSharedValue(0);
  const classNameTranslateY = useSharedValue(-20);
  const timerOpacity = useSharedValue(0);
  const timerTranslateY = useSharedValue(20);
  const leaveButtonOpacity = useSharedValue(0);
  const leaveButtonTranslateY = useSharedValue(20);

  // Animated styles for active session display
  const animatedClassNameStyle = useAnimatedStyle(() => {
    return {
      opacity: classNameOpacity.value,
      transform: [{ translateY: classNameTranslateY.value }],
    };
  });

  const animatedTimerStyle = useAnimatedStyle(() => {
    return {
      opacity: timerOpacity.value,
      transform: [{ translateY: timerTranslateY.value }],
    };
  });

  const animatedLeaveButtonStyle = useAnimatedStyle(() => {
    return {
      opacity: leaveButtonOpacity.value,
      transform: [{ translateY: leaveButtonTranslateY.value }],
    };
  });

  // State for pending check result
  const [pendingCheckResult, setPendingCheckResult] =
    useState<SessionCheckResult | null>(null);

  // Bottom sheet animation hook
  const {
    animatedTitleStyle,
    animatedContentStyle,
    animatedGridStyle,
    animatedSessionCountContainerStyle,
  } = useBottomSheetAnimations({
    animatedPosition,
    windowHeight,
    snapPoints,
  });

  // Firefly animation hook
  const {
    isAnimating,
    isReturningHome,
    animatedTextStyle,
    animatedNewTextStyle,
    animatedCircleStyle,
    startAnimation,
  } = useFireflyAnimation();

  // Class session checker hook
  const { isChecking, checkSessions } = useClassSessionChecker();

  // Timer update effect
  useEffect(() => {
    if (activeSession.isActive && !activeSession.timerInterval) {
      const interval = setInterval(() => {
        setActiveSession((prev) => ({
          ...prev,
          timer: prev.timer + 1,
        }));
      }, 60000);

      setActiveSession((prev) => ({
        ...prev,
        timerInterval: interval,
      }));
    }

    return () => {
      if (activeSession.timerInterval) {
        clearInterval(activeSession.timerInterval);
      }
    };
  }, [activeSession.isActive]);

  // Show active session elements
  const showActiveSessionElements = (className: string, sessionId: string) => {
    if (activeSession.timerInterval) {
      clearInterval(activeSession.timerInterval);
    }

    setActiveSession({
      isActive: true,
      className: className,
      sessionId: sessionId,
      timer: 0,
      timerInterval: null,
    });

    // Animate elements in
    classNameOpacity.value = withTiming(1, {
      duration: 800,
      easing: Easing.bezierFn(0.16, 1, 0.3, 1),
    });
    classNameTranslateY.value = withTiming(0, {
      duration: 800,
      easing: Easing.bezierFn(0.16, 1, 0.3, 1),
    });
    timerOpacity.value = withDelay(
      200,
      withTiming(1, { duration: 800, easing: Easing.bezierFn(0.16, 1, 0.3, 1) })
    );
    timerTranslateY.value = withDelay(
      200,
      withTiming(0, { duration: 800, easing: Easing.bezierFn(0.16, 1, 0.3, 1) })
    );
    leaveButtonOpacity.value = withDelay(
      300,
      withTiming(1, { duration: 800, easing: Easing.bezierFn(0.16, 1, 0.3, 1) })
    );
    leaveButtonTranslateY.value = withDelay(
      300,
      withTiming(0, { duration: 800, easing: Easing.bezierFn(0.16, 1, 0.3, 1) })
    );
  };

  // Effect to handle pending check result display
  React.useEffect(() => {
    if (pendingCheckResult && !isAnimating && !isReturningHome) {
      if (pendingCheckResult.success && pendingCheckResult.isAttending) {
        const sessionIdMatch = pendingCheckResult.sessionId || "";
        const classNameMatch = pendingCheckResult.message.match(
          /Student is attending (.*)\./
        );
        const className = classNameMatch ? classNameMatch[1] : "Class";
        showActiveSessionElements(className, sessionIdMatch);
      } else {
        Alert.alert(
          pendingCheckResult.success ? "Class Check Results" : "Error",
          pendingCheckResult.message
        );
      }
      setPendingCheckResult(null);
    }
  }, [pendingCheckResult, isAnimating, isReturningHome]);

  // Handle bottom sheet changes
  const handleSheetChanges = useCallback((index: number) => {
    console.log("handleSheetChanges", index);
  }, []);

  // Custom handle for bottom sheet
  const CustomHandle = () => (
    <Animated.View style={animatedContentStyle}>
      <View style={styles.handleContainer}>
        <View style={styles.handleIndicator} />
      </View>
    </Animated.View>
  );

  const user = useAuthStore((state) => state.user);
  const [devMenuVisible, setDevMenuVisible] = useState(false);
  const insets = useSafeAreaInsets();

  // Handle check-in button press
  const handleCheckInPress = async () => {
    if (isAnimating || isChecking) return;

    let animationStopFunction: ((callback?: () => void) => boolean) | undefined;

    animationStopFunction = startAnimation(
      () => {
        console.log("Animation completed naturally");
      },
      () => {
        console.log("Minimum moves completed");
      },
      10000
    );

    try {
      const result = await checkSessions();
      setPendingCheckResult(result);

      if (animationStopFunction) {
        const stopped = animationStopFunction(() => {
          console.log("Firefly returned home");
        });
        console.log("Animation stop attempted:", stopped);
      }
    } catch (error) {
      console.error("Error during check-in:", error);
      setPendingCheckResult({
        success: false,
        message: "Location check failed.",
        isAttending: false,
      });
      if (animationStopFunction) animationStopFunction();
    }
  };

  // Handle leave early button press
  const handleLeaveEarlyPress = async () => {
    if (!activeSession.isActive || !activeSession.sessionId || !user?.uid)
      return;

    Alert.alert(
      "Leave Class Early",
      "Are you sure you want to leave this class early?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            try {
              await checkOutFromSession(activeSession.sessionId, user.uid);

              if (activeSession.timerInterval) {
                clearInterval(activeSession.timerInterval);
              }

              // Animate elements out
              classNameOpacity.value = withTiming(0, {
                duration: 400,
                easing: Easing.bezierFn(0.16, 1, 0.3, 1),
              });
              timerOpacity.value = withTiming(0, {
                duration: 400,
                easing: Easing.bezierFn(0.16, 1, 0.3, 1),
              });
              leaveButtonOpacity.value = withTiming(0, {
                duration: 400,
                easing: Easing.bezierFn(0.16, 1, 0.3, 1),
              });
              // Optionally animate translate Y back
              // classNameTranslateY.value = withTiming(-20, { duration: 400 });
              // timerTranslateY.value = withTiming(20, { duration: 400 });
              // leaveButtonTranslateY.value = withTiming(20, { duration: 400 });

              setTimeout(() => {
                setActiveSession({
                  isActive: false,
                  className: "",
                  sessionId: "",
                  timer: 0,
                  timerInterval: null,
                });
                // Reset translate values if they were animated
                // classNameTranslateY.value = -20;
                // timerTranslateY.value = 20;
                // leaveButtonTranslateY.value = 20;
              }, 400);

              Alert.alert("Left Class", "Successfully left the class early.");
            } catch (error) {
              console.error("Error leaving class early:", error);
              Alert.alert("Error", "Could not leave class. Try again.");
            }
          },
        },
      ]
    );
  };

  console.log("Is DEV mode?", __DEV__);

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <StatusBar barStyle="light-content" />

        {/* Active Session Display */}
        <ActiveSessionDisplay
          isVisible={activeSession.isActive}
          className={activeSession.className}
          timerValue={activeSession.timer}
          onLeavePress={handleLeaveEarlyPress}
          animatedClassNameStyle={animatedClassNameStyle}
          animatedTimerStyle={animatedTimerStyle}
          animatedLeaveButtonStyle={animatedLeaveButtonStyle}
          classNameContainerStyle={{ top: insets.top + 16 }}
          timerContainerStyle={{
            bottom: Math.max(insets.bottom + 140, 140 + 16),
          }}
          leaveButtonContainerStyle={{
            bottom: Math.max(insets.bottom + 140, 140 + 16),
            right: 36,
          }}
        />

        {/* Check-in Button */}
        <CheckInButton
          isCheckingIn={isChecking || isAnimating}
          isActiveSession={activeSession.isActive}
          onPress={handleCheckInPress}
          animatedTextStyle={animatedTextStyle}
          animatedNewTextStyle={animatedNewTextStyle}
          animatedCircleStyle={animatedCircleStyle}
        />

        {/* Bottom Sheet */}
        <BottomSheet
          ref={bottomSheetRef}
          index={0}
          onChange={handleSheetChanges}
          snapPoints={snapPoints}
          animatedPosition={animatedPosition}
          backgroundStyle={styles.bottomSheetBackground}
          handleComponent={CustomHandle}
        >
          <BottomSheetView style={styles.bottomSheetContentContainer}>
            <ThisWeekSheetContent
              animatedTitleStyle={animatedTitleStyle}
              animatedSessionCountContainerStyle={
                animatedSessionCountContainerStyle
              }
              animatedGridStyle={animatedGridStyle}
            />
          </BottomSheetView>
        </BottomSheet>

        {/* Dev Tools Buttons */}
        <DevToolsButtons
          onDevPress={() => setDevMenuVisible(true)}
          onExpPress={() => router.push("/playground")}
        />

        {/* Dev Menu Modal */}
        <DevMenu
          visible={devMenuVisible}
          onClose={() => setDevMenuVisible(false)}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

// Styles for the main App component layout
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.app,
  },
  safeArea: {
    flex: 1,
  },
  bottomSheetBackground: {
    backgroundColor: theme.colors.background.card,
  },
  bottomSheetContentContainer: {
    flex: 1, // Necessary for BottomSheetView content to fill
  },
  handleContainer: {
    alignItems: "center",
    paddingTop: 15,
    paddingBottom: 8,
    backgroundColor: "transparent",
  },
  handleIndicator: {
    width: 45,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#fff",
  },
  // All other styles specific to ActiveSessionDisplay, CheckInButton,
  // ThisWeekSheetContent, and DevToolsButtons have been moved
  // to their respective component files.
});

export default App;
