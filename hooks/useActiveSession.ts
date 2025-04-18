import { useState, useEffect, useRef } from "react";
import { Alert } from "react-native";
import {
  useSharedValue,
  withTiming,
  withDelay,
  Easing,
  useAnimatedStyle,
} from "react-native-reanimated";
import useAuthStore from "./useAuthStore";
import {
  checkOutFromSession,
  getSessionStatus,
} from "../utils/firebaseClassSessionHelpers";

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
  showActiveSessionElements: (
    className: string,
    sessionId: string
  ) => Promise<void>;
  handleLeaveEarlyPress: () => Promise<void>;
  setActiveSession: React.Dispatch<React.SetStateAction<ActiveSessionState>>;
}

export const useActiveSession = (): UseActiveSessionResult => {
  const user = useAuthStore((state) => state.user);
  const leaveInProgressRef = useRef(false);

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

  // Clear timer interval when component unmounts
  useEffect(() => {
    return () => {
      if (activeSession.timerInterval) {
        clearInterval(activeSession.timerInterval);
      }
    };
  }, []);

  // Show active session elements
  const showActiveSessionElements = async (
    className: string,
    sessionId: string
  ) => {
    console.log("showActiveSessionElements called with:", className, sessionId);

    if (!className || !sessionId) {
      console.error("Invalid parameters: className or sessionId is empty");
      return;
    }

    // Don't allow showing elements if we're in the process of leaving
    if (leaveInProgressRef.current) {
      console.log("Leave in progress, ignoring showActiveSessionElements call");
      return;
    }

    // First check if the session is still active
    try {
      const sessionStatus = await getSessionStatus(sessionId);
      if (sessionStatus !== "active") {
        console.log(
          `Cannot join session ${sessionId} with status ${sessionStatus}`
        );
        Alert.alert(
          "Session Unavailable",
          sessionStatus === "ended"
            ? "This session has already ended."
            : "This session is not currently active."
        );
        return;
      }
    } catch (error) {
      console.error("Error checking session status:", error);
      // Continue anyway in case of error to avoid blocking the user
    }

    if (activeSession.timerInterval) {
      console.log("Clearing existing timer interval");
      clearInterval(activeSession.timerInterval);
    }

    console.log("Before setting activeSession state:", activeSession);

    // Set the active session state immediately
    setActiveSession((prevState) => {
      // Check if already in this session to avoid unnecessary updates
      if (prevState.isActive && prevState.sessionId === sessionId) {
        console.log("Already in this session, skipping state update");
        return prevState;
      }

      console.log("Updating active session state to:", {
        isActive: true,
        className,
        sessionId,
        timer: 0,
        timerInterval: null,
      });

      return {
        isActive: true,
        className: className,
        sessionId: sessionId,
        timer: 0,
        timerInterval: null,
      };
    });

    console.log("Active session state update triggered");

    // Reset animation values first to ensure they animate from the beginning
    classNameOpacity.value = 0;
    classNameTranslateY.value = -20;
    timerOpacity.value = 0;
    timerTranslateY.value = 20;
    leaveButtonOpacity.value = 0;
    leaveButtonTranslateY.value = 20;

    // Small delay to ensure state is updated before animations
    setTimeout(() => {
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
        withTiming(1, {
          duration: 800,
          easing: Easing.bezierFn(0.16, 1, 0.3, 1),
        })
      );
      timerTranslateY.value = withDelay(
        200,
        withTiming(0, {
          duration: 800,
          easing: Easing.bezierFn(0.16, 1, 0.3, 1),
        })
      );
      leaveButtonOpacity.value = withDelay(
        300,
        withTiming(1, {
          duration: 800,
          easing: Easing.bezierFn(0.16, 1, 0.3, 1),
        })
      );
      leaveButtonTranslateY.value = withDelay(
        300,
        withTiming(0, {
          duration: 800,
          easing: Easing.bezierFn(0.16, 1, 0.3, 1),
        })
      );

      console.log("Animations started for active session UI elements");
    }, 50);
  };

  // Reset all session state and animations
  const resetSessionState = () => {
    console.log("Resetting session state to inactive");

    // First update the state to stop timers immediately
    setActiveSession({
      isActive: false,
      className: "",
      sessionId: "",
      timer: 0,
      timerInterval: null,
    });

    // Then animate out UI elements
    classNameOpacity.value = withTiming(0, {
      duration: 400,
      easing: Easing.bezierFn(0.16, 1, 0.3, 1),
    });
    classNameTranslateY.value = withTiming(-20, {
      duration: 400,
      easing: Easing.bezierFn(0.16, 1, 0.3, 1),
    });
    timerOpacity.value = withTiming(0, {
      duration: 400,
      easing: Easing.bezierFn(0.16, 1, 0.3, 1),
    });
    timerTranslateY.value = withTiming(20, {
      duration: 400,
      easing: Easing.bezierFn(0.16, 1, 0.3, 1),
    });
    leaveButtonOpacity.value = withTiming(0, {
      duration: 400,
      easing: Easing.bezierFn(0.16, 1, 0.3, 1),
    });
    leaveButtonTranslateY.value = withTiming(20, {
      duration: 400,
      easing: Easing.bezierFn(0.16, 1, 0.3, 1),
    });
  };

  // Handle leave early button press
  const handleLeaveEarlyPress = async () => {
    console.log("Leave early button pressed, current state:", activeSession);

    if (!activeSession.isActive || !activeSession.sessionId || !user?.uid) {
      console.log("Cannot leave: session not active or missing data");
      return;
    }

    // Don't allow multiple leave requests
    if (leaveInProgressRef.current) {
      console.log("Leave already in progress, ignoring duplicate request");
      return;
    }

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
              // Mark leave as in progress to prevent race conditions
              leaveInProgressRef.current = true;

              console.log("User confirmed leaving class early...");
              const sessionId = activeSession.sessionId; // Store for logging

              // Clear timer interval first to stop counting
              if (activeSession.timerInterval) {
                console.log("Clearing timer interval");
                clearInterval(activeSession.timerInterval);
              }

              // First animate elements out
              console.log("Starting exit animations");
              classNameOpacity.value = withTiming(0, {
                duration: 400,
                easing: Easing.bezierFn(0.16, 1, 0.3, 1),
              });
              classNameTranslateY.value = withTiming(-20, {
                duration: 400,
                easing: Easing.bezierFn(0.16, 1, 0.3, 1),
              });
              timerOpacity.value = withTiming(0, {
                duration: 400,
                easing: Easing.bezierFn(0.16, 1, 0.3, 1),
              });
              timerTranslateY.value = withTiming(20, {
                duration: 400,
                easing: Easing.bezierFn(0.16, 1, 0.3, 1),
              });
              leaveButtonOpacity.value = withTiming(0, {
                duration: 400,
                easing: Easing.bezierFn(0.16, 1, 0.3, 1),
              });
              leaveButtonTranslateY.value = withTiming(20, {
                duration: 400,
                easing: Easing.bezierFn(0.16, 1, 0.3, 1),
              });

              // Set state to inactive immediately
              console.log("Setting active session state to inactive");
              setActiveSession({
                isActive: false,
                className: "",
                sessionId: "",
                timer: 0,
                timerInterval: null,
              });

              // Try to check out from the session after animations start
              try {
                await checkOutFromSession(sessionId, user.uid);
                console.log("Successfully checked out from Firebase");

                // Show confirmation after leaving
                setTimeout(() => {
                  Alert.alert(
                    "Left Class",
                    "Successfully left the class early."
                  );
                  // Always reset the leave in progress flag
                  leaveInProgressRef.current = false;
                }, 500);
              } catch (checkoutError) {
                console.error(
                  "Error checking out from session:",
                  checkoutError
                );
                Alert.alert(
                  "Partial Error",
                  "You've left the class, but we couldn't record your departure time."
                );
                leaveInProgressRef.current = false;
              }
            } catch (error) {
              console.error("Error in leave early flow:", error);
              Alert.alert("Error", "Could not leave class. Try again.");
              leaveInProgressRef.current = false;
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
    setActiveSession,
  };
};
