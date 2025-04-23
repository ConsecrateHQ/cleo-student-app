import { useState, useEffect, useRef, useCallback } from "react";
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
import { doc, getDoc } from "firebase/firestore";
import { webDb } from "../utils/firebaseConfig";

interface ActiveSessionState {
  isActive: boolean;
  className: string;
  sessionId: string;
  timer: number; // This is now minutes
  seconds: number;
  hours: number; // Add hours field
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
    sessionId: string,
    initialElapsedSeconds?: number
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
    seconds: 0,
    hours: 0, // Initialize hours field
  });

  // Ref to store the timer interval ID
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

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
    // Clear any existing interval when isActive or sessionId changes
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Start a new interval if the session is active
    if (activeSession.isActive && activeSession.sessionId) {
      console.log(
        `[useActiveSession] Starting timer interval for session ${activeSession.sessionId}`
      );
      // Update timer every second for more granular time tracking
      intervalRef.current = setInterval(() => {
        console.log("[useActiveSession] Timer interval tick");
        setActiveSession((prev) => {
          // Ensure we are still active before incrementing
          if (!prev.isActive) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            intervalRef.current = null;
            return prev;
          }

          // Calculate new seconds, minutes, and hours
          const newSeconds = prev.seconds + 1;
          const totalMinutes = prev.timer + Math.floor(newSeconds / 60);
          const remainingSeconds = newSeconds % 60;
          const newHours = prev.hours + Math.floor(totalMinutes / 60);
          const remainingMinutes = totalMinutes % 60;

          return {
            ...prev,
            timer: remainingMinutes,
            seconds: remainingSeconds,
            hours: newHours,
          };
        });
      }, 1000); // Update every second
    }

    // Cleanup function: clear interval on component unmount or when dependencies change
    return () => {
      if (intervalRef.current) {
        console.log(
          `[useActiveSession] Clearing timer interval ${intervalRef.current}`
        );
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // Depend only on isActive and sessionId to restart the timer when the session changes
  }, [activeSession.isActive, activeSession.sessionId]);

  // Show active session elements
  const showActiveSessionElements = async (
    className: string,
    sessionId: string,
    initialElapsedSeconds: number = 0
  ) => {
    console.log(
      "showActiveSessionElements called with:",
      className,
      sessionId,
      `Initial Seconds: ${initialElapsedSeconds}`
    );

    if (!className || !sessionId) {
      console.error("Invalid parameters: className or sessionId is empty");
      return;
    }

    // Don't allow showing elements if we're in the process of leaving
    if (leaveInProgressRef.current) {
      console.log("Leave in progress, ignoring showActiveSessionElements call");
      return;
    }

    // Get activeSessionInfo from store to check for duration
    const activeSessionInfo = useAuthStore.getState().activeSessionInfo;

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

      // Check for stored duration from activeSessionInfo (for app restart case)
      if (
        activeSessionInfo &&
        activeSessionInfo.sessionId === sessionId &&
        activeSessionInfo.duration !== undefined &&
        activeSessionInfo.duration > 0
      ) {
        console.log(
          `Found stored duration in activeSessionInfo: ${activeSessionInfo.duration} seconds`
        );

        // Use the stored duration in seconds
        initialElapsedSeconds = activeSessionInfo.duration;
        console.log(`Using stored duration: ${initialElapsedSeconds} seconds`);
      }
      // If no duration in activeSessionInfo, check if user is rejoining (for leave and rejoin case)
      else if (user?.uid) {
        try {
          console.log(
            "Checking if user is rejoining a session they left earlier"
          );
          const attendanceRef = doc(
            webDb,
            `sessions/${sessionId}/attendance/${user.uid}`
          );
          const attendanceSnap = await getDoc(attendanceRef);

          if (attendanceSnap.exists()) {
            const attendanceData = attendanceSnap.data();

            // Check for duration field directly
            if (
              attendanceData.duration !== undefined &&
              attendanceData.duration > 0
            ) {
              console.log(
                `User is rejoining session with ${attendanceData.duration} seconds already accumulated`
              );
              initialElapsedSeconds = attendanceData.duration; // Use stored duration directly
              console.log(
                `Setting initial elapsed time to ${initialElapsedSeconds} seconds (${Math.floor(
                  initialElapsedSeconds / 60
                )} minutes)`
              );
            }
            // Fallback to previous logic if duration not available but status is checked_out
            else if (attendanceData.status === "checked_out") {
              console.log(
                `User has previously left session but no duration found. Using status to determine rejoin.`
              );
              // Default to 0 since we don't have actual duration
              initialElapsedSeconds = 0;
            }
          }
        } catch (error) {
          console.error("Error checking previous attendance:", error);
          // Continue anyway in case of error
        }
      }
    } catch (error) {
      console.error("Error checking session status:", error);
      // Continue anyway in case of error to avoid blocking the user
    }

    // Clear existing timer interval using ref before setting state
    if (intervalRef.current) {
      console.log(
        "[showActiveSessionElements] Clearing existing timer interval"
      );
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    console.log("Before setting activeSession state:", activeSession);

    // Set the active session state immediately
    setActiveSession((prevState) => {
      // Check if already in this session to avoid unnecessary updates
      if (prevState.isActive && prevState.sessionId === sessionId) {
        console.log("Already in this session, skipping state update");
        return prevState;
      }

      // Calculate hours, minutes and remaining seconds
      const initialTotalMinutes = Math.floor(initialElapsedSeconds / 60);
      const initialHours = Math.floor(initialTotalMinutes / 60);
      const initialMinutes = initialTotalMinutes % 60;
      const initialRemainingSeconds = initialElapsedSeconds % 60;

      console.log("Updating active session state to:", {
        isActive: true,
        className,
        sessionId,
        timer: initialMinutes,
        seconds: initialRemainingSeconds,
        hours: initialHours,
      });

      return {
        isActive: true,
        className: className,
        sessionId: sessionId,
        timer: initialMinutes,
        seconds: initialRemainingSeconds,
        hours: initialHours,
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
      seconds: 0,
      hours: 0,
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

              // Get current accumulated time from active session in hours, minutes and seconds
              const currentHours = activeSession.hours;
              const currentMinutes = activeSession.timer;
              const currentSeconds =
                currentHours * 3600 +
                currentMinutes * 60 +
                activeSession.seconds;

              // Get any previous duration from store
              const activeSessionInfo =
                useAuthStore.getState().activeSessionInfo;
              const previousDuration = activeSessionInfo?.duration || 0;

              // Calculate total duration
              const totalDuration = previousDuration + currentSeconds;

              console.log(
                `Current session time: ${currentHours} hours ${currentMinutes} minutes ${activeSession.seconds} seconds (${currentSeconds} total seconds)`
              );
              console.log(
                `Previous stored duration: ${previousDuration} seconds`
              );
              console.log(
                `Total duration to be saved: ${totalDuration} seconds`
              );

              // Clear timer interval first using ref
              if (intervalRef.current) {
                console.log("Clearing timer interval via ref");
                clearInterval(intervalRef.current);
                intervalRef.current = null;
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
                seconds: 0,
                hours: 0,
              });

              // Try to check out from the session after animations start
              try {
                // Call the updated checkOutFromSession which now tracks duration
                console.log(
                  "Calling checkOutFromSession to record duration and check-out time"
                );

                // Send the totalDuration as a parameter to checkOutFromSession so it can be saved
                await checkOutFromSession(sessionId, user.uid, totalDuration);
                console.log(
                  "Successfully checked out from Firebase with duration tracking"
                );

                // Show confirmation after leaving
                setTimeout(() => {
                  Alert.alert(
                    "Left Class",
                    "Successfully left the class early. You can rejoin this session later if needed.",
                    [
                      {
                        text: "OK",
                        onPress: () => {
                          console.log("User acknowledged leave confirmation");
                          // Always reset the leave in progress flag
                          leaveInProgressRef.current = false;
                        },
                      },
                    ]
                  );
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
