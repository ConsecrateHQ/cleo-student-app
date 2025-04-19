import { useState, useEffect } from "react";
import { Alert } from "react-native";
import {
  useSharedValue,
  withTiming,
  withDelay,
  Easing,
  useAnimatedStyle,
} from "react-native-reanimated";
import useAuthStore from "./useAuthStore";
import { checkOutFromSession } from "../utils/firebaseClassSessionHelpers";

interface ActiveSessionState {
  isActive: boolean;
  className: string;
  sessionId: string;
  timer: number;
  timerInterval: NodeJS.Timeout | null;
}

interface ActiveSessionAnimations {
  classNameOpacity: any;
  classNameTranslateY: any;
  timerOpacity: any;
  timerTranslateY: any;
  leaveButtonOpacity: any;
  leaveButtonTranslateY: any;
  animatedClassNameStyle: any;
  animatedTimerStyle: any;
  animatedLeaveButtonStyle: any;
}

interface UseActiveSessionResult {
  activeSession: ActiveSessionState;
  animations: ActiveSessionAnimations;
  showActiveSessionElements: (className: string, sessionId: string) => void;
  handleLeaveEarlyPress: () => Promise<void>;
}

export const useActiveSession = (): UseActiveSessionResult => {
  const user = useAuthStore((state) => state.user);

  // State for active session
  const [activeSession, setActiveSession] = useState<ActiveSessionState>({
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
  const animatedClassNameStyle = useAnimatedStyle(() => ({
    opacity: classNameOpacity.value,
    transform: [{ translateY: classNameTranslateY.value }],
  }));

  const animatedTimerStyle = useAnimatedStyle(() => ({
    opacity: timerOpacity.value,
    transform: [{ translateY: timerTranslateY.value }],
  }));

  const animatedLeaveButtonStyle = useAnimatedStyle(() => ({
    opacity: leaveButtonOpacity.value,
    transform: [{ translateY: leaveButtonTranslateY.value }],
  }));

  // Timer update effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (activeSession.isActive && !activeSession.timerInterval) {
      interval = setInterval(() => {
        setActiveSession((prev) => ({
          ...prev,
          timer: prev.timer + 1,
        }));
      }, 60000);

      // Update state with the interval in a single call
      setActiveSession((prev) => ({
        ...prev,
        timerInterval: interval,
      }));
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      } else if (activeSession.timerInterval) {
        clearInterval(activeSession.timerInterval);
      }
    };
  }, [activeSession.isActive, activeSession.timerInterval]);

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

              setTimeout(() => {
                setActiveSession({
                  isActive: false,
                  className: "",
                  sessionId: "",
                  timer: 0,
                  timerInterval: null,
                });
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

  return {
    activeSession,
    animations: {
      classNameOpacity,
      classNameTranslateY,
      timerOpacity,
      timerTranslateY,
      leaveButtonOpacity,
      leaveButtonTranslateY,
      animatedClassNameStyle,
      animatedTimerStyle,
      animatedLeaveButtonStyle,
    },
    showActiveSessionElements,
    handleLeaveEarlyPress,
  };
};
