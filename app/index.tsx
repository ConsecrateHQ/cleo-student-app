import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  StatusBar,
  Alert,
  Dimensions,
  View,
  ActivityIndicator,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import BottomSheet from "@gorhom/bottom-sheet";
import theme from "../theme";
import { useSharedValue } from "react-native-reanimated";
import useAuthStore from "../hooks/useAuthStore";
import { SafeAreaView } from "react-native-safe-area-context";
import { useBottomSheetAnimations } from "../hooks/useBottomSheetAnimations";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ActiveSessionDisplay from "../components/ActiveSessionDisplay";
import CheckInButton from "../components/CheckInButton";
import DevToolsButtons from "../components/DevToolsButtons";
import CancelButton from "../components/CancelButton";
import HomeBottomSheet from "../components/HomeBottomSheet";
import { useCheckIn } from "../hooks/useCheckIn";
import { useActiveSession } from "../hooks/useActiveSession";
import { useSessionStatusListener } from "../hooks/useSessionStatusListener";
import CongratulationsDrawer from "../components/CongratulationsDrawer";
import { getClassDetails } from "../utils/firebaseClassSessionHelpers";
import { Timestamp } from "firebase/firestore";

const App = () => {
  // Refs and basic setup
  const bottomSheetRef = useRef<BottomSheet>(null);
  const windowHeight = Dimensions.get("window").height;
  const animatedPosition = useSharedValue(windowHeight);
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const activeSessionInfo = useAuthStore((state) => state.activeSessionInfo);
  const isRestoringSession = useAuthStore((state) => state.isRestoringSession);
  const setActiveSessionInStore = useAuthStore(
    (state) => state.setActiveSession
  );
  const [isJoinModalVisible, setIsJoinModalVisible] = useState(false);
  const processedCheckRef = useRef<string | null>(null);

  // Custom hooks
  const {
    activeSession,
    animations: sessionAnimations,
    showActiveSessionElements,
    handleLeaveEarlyPress: originalHandleLeaveEarlyPress,
    setActiveSession: setActiveSessionLocally,
  } = useActiveSession();

  // Session status listener hook
  const {
    showCongratulations,
    hideCongratulations,
    className: endedClassName,
  } = useSessionStatusListener(activeSessionInfo?.sessionId || null);

  const {
    isChecking,
    isAnimating,
    isReturningHome,
    isCancelVisible,
    pendingCheckResult,
    animatedTextStyle,
    animatedNewTextStyle,
    animatedCircleStyle,
    isCheckInCancelled,
    checkCancellationRef,
    handleCheckInPress,
    handleCancelPress,
    resetCancellationState,
  } = useCheckIn();

  const {
    animatedTitleStyle,
    animatedContentStyle,
    animatedGridStyle,
    animatedSessionCountContainerStyle,
  } = useBottomSheetAnimations({
    animatedPosition,
    windowHeight,
    snapPoints: [140, windowHeight],
  });

  // Wrap handleLeaveEarlyPress to clear store state as well
  const handleLeaveEarlyPress = useCallback(async () => {
    await originalHandleLeaveEarlyPress();
    setActiveSessionInStore(null);
  }, [originalHandleLeaveEarlyPress, setActiveSessionInStore]);

  // Effect to reset cancellation state when leaving a session
  useEffect(() => {
    // Only reset cancellation state when explicitly leaving a session
    // (not during cancellation or check-in process)
    if (
      !activeSession.isActive &&
      !isAnimating &&
      !isChecking &&
      !isReturningHome
    ) {
      console.log(
        "Session inactive and not checking in - resetting cancellation state"
      );
      resetCancellationState();
      processedCheckRef.current = null;
    }
  }, [
    activeSession.isActive,
    resetCancellationState,
    isAnimating,
    isChecking,
    isReturningHome,
  ]);

  // Effect to handle pending check result display
  useEffect(() => {
    if (
      !pendingCheckResult ||
      isCheckInCancelled ||
      checkCancellationRef.current.cancelled
    ) {
      // Skip if no result or cancelled
      return;
    }

    // Unique ID for this result to prevent duplicate processing
    const resultId = `${pendingCheckResult.sessionId || ""}-${
      pendingCheckResult.success
    }-${pendingCheckResult.isAttending}`;

    console.log("Processing check result:", pendingCheckResult);
    console.log("Result ID:", resultId);
    console.log("Previous processed ID:", processedCheckRef.current);
    console.log(
      "Cancellation state:",
      isCheckInCancelled,
      checkCancellationRef.current.cancelled
    );

    // Skip if already processed this result
    if (processedCheckRef.current === resultId) {
      console.log("Already processed this result, skipping");
      return;
    }

    // Mark as processed immediately to prevent duplicate processing
    processedCheckRef.current = resultId;

    // Handle successful check-in
    if (pendingCheckResult.success && pendingCheckResult.isAttending) {
      console.log("Processing successful check-in result:", pendingCheckResult);

      const sessionIdMatch = pendingCheckResult.sessionId || "";
      const classIdMatch = pendingCheckResult.classId || ""; // Get classId

      // Extract the class name
      let className = "Class";
      if (pendingCheckResult.message.includes("Student is attending")) {
        className = pendingCheckResult.message
          .replace("Student is attending ", "")
          .replace(".", "");
      }

      console.log("Extracted class name:", className);
      console.log("Session ID:", sessionIdMatch);
      console.log("Class ID:", classIdMatch); // Log classId

      // Extra validation to ensure we have valid data
      if (!className || !sessionIdMatch || !classIdMatch) {
        console.error(
          "Invalid className, sessionId, or classId, cannot activate session"
        );
        Alert.alert("Error", "Could not determine class details");
        return;
      }

      // Collapse bottom sheet
      if (bottomSheetRef.current) {
        console.log("Collapsing bottom sheet");
        bottomSheetRef.current.collapse();
      }

      // Show active session UI and Update store
      (async () => {
        try {
          console.log("Showing active session elements...");
          await showActiveSessionElements(className, sessionIdMatch);
          console.log("Active session state updated successfully");

          // *** FIX: Update activeSessionInfo in the store ***
          const now = Timestamp.now();
          setActiveSessionInStore({
            sessionId: sessionIdMatch,
            classId: classIdMatch,
            checkInTime: now, // Use current time for simplicity
            lastUpdated: now, // Use current time for simplicity
            joinTimestamp: Date.now(), // Store local timestamp when user joined
          });
          console.log("Active session info saved to store.");
        } catch (error) {
          console.error("Error updating active session state or store:", error);
          Alert.alert(
            "Error",
            "Something went wrong processing your check-in."
          );
        }
      })();
    } else if (pendingCheckResult.success === false) {
      Alert.alert("Error", pendingCheckResult.message);
    }
  }, [
    pendingCheckResult,
    isCheckInCancelled,
    checkCancellationRef,
    showActiveSessionElements,
    setActiveSessionInStore,
  ]);

  // Effect to handle restoration of session from store
  useEffect(() => {
    if (activeSessionInfo && !activeSession.isActive && !isRestoringSession) {
      console.log(
        "[App Index] Restored session detected, activating UI:",
        activeSessionInfo
      );
      // Fetch class name using classId from the restored session info
      getClassDetails(activeSessionInfo.classId)
        .then((classDetails) => {
          if (classDetails) {
            // Calculate initial time based on local joinTimestamp
            const now = Date.now();
            const joinTime = activeSessionInfo.joinTimestamp || now; // Fallback to now if missing
            const initialElapsedSeconds = Math.floor((now - joinTime) / 1000);

            console.log(
              `[App Index] Restored Session - Class: ${classDetails.name}, Initial Elapsed: ${initialElapsedSeconds}s`
            );

            // Update lastUpdated time only
            const updatedSessionInfo = {
              ...activeSessionInfo,
              lastUpdated: Timestamp.now(),
            };
            setActiveSessionInStore(updatedSessionInfo);

            // Activate the session UI with fetched name and calculated time
            showActiveSessionElements(
              classDetails.name,
              activeSessionInfo.sessionId,
              initialElapsedSeconds
            );
          } else {
            console.error(
              `[App Index] Could not fetch class details for restored session: ${activeSessionInfo.classId}`
            );
            // Handle error - maybe clear the invalid session state?
            setActiveSessionInStore(null);
            Alert.alert(
              "Error",
              "Could not restore previous session details. Please check in again if needed."
            );
          }
        })
        .catch((error) => {
          console.error(
            "[App Index] Error fetching class details for restored session:",
            error
          );
          setActiveSessionInStore(null);
          Alert.alert(
            "Error",
            "Could not restore previous session details due to an error."
          );
        });
    }
  }, [
    activeSessionInfo,
    activeSession.isActive,
    isRestoringSession,
    showActiveSessionElements,
    setActiveSessionInStore,
  ]);

  // Handle bottom sheet changes
  const handleSheetChanges = useCallback((index: number) => {
    console.log("handleSheetChanges", index);
  }, []);

  // Inside the App component, add a new handler function:
  const handleSessionEndComplete = useCallback(() => {
    // First hide the congratulations drawer
    hideCongratulations();

    // Then reset the session state - but skip the confirmation dialog
    // since the session has already ended
    if (activeSession.isActive && activeSession.sessionId) {
      console.log("Ending completed session and resetting state");

      // Clear timer interval if any
      if (activeSession.timerInterval) {
        clearInterval(activeSession.timerInterval);
      }

      // Animate session elements out and reset state
      sessionAnimations.classNameOpacity.value = 0;
      sessionAnimations.classNameTranslateY.value = -20;
      sessionAnimations.timerOpacity.value = 0;
      sessionAnimations.timerTranslateY.value = 20;
      sessionAnimations.leaveButtonOpacity.value = 0;
      sessionAnimations.leaveButtonTranslateY.value = 20;

      // Reset session state
      setActiveSessionLocally({
        isActive: false,
        className: "",
        sessionId: "",
        timer: 0,
        timerInterval: null,
      });

      // Reset other important state references
      processedCheckRef.current = null;
      resetCancellationState();

      // *** Also clear session state in the store ***
      setActiveSessionInStore(null);

      console.log("Session ended and reset complete");
    }
  }, [
    hideCongratulations,
    activeSession,
    sessionAnimations,
    setActiveSessionLocally,
    resetCancellationState,
    setActiveSessionInStore,
  ]);

  console.log("Is DEV mode?", __DEV__);

  // Show loading indicator while restoring session state
  if (isRestoringSession) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.colors.button.primary} />
      </View>
    );
  }

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
          animatedClassNameStyle={sessionAnimations.animatedClassNameStyle}
          animatedTimerStyle={sessionAnimations.animatedTimerStyle}
          animatedLeaveButtonStyle={sessionAnimations.animatedLeaveButtonStyle}
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
        <HomeBottomSheet
          bottomSheetRef={bottomSheetRef}
          animatedPosition={animatedPosition}
          animatedTitleStyle={animatedTitleStyle}
          animatedContentStyle={animatedContentStyle}
          animatedGridStyle={animatedGridStyle}
          animatedSessionCountContainerStyle={
            animatedSessionCountContainerStyle
          }
          onSheetChange={handleSheetChanges}
          isSearching={(isChecking || isAnimating) && !isReturningHome}
        />

        {/* Dev Tools Buttons */}
        <DevToolsButtons />

        {/* Cancel Button */}
        <CancelButton
          isVisible={isCancelVisible}
          onPress={handleCancelPress}
          bottomPosition={Math.max(insets.bottom + 40, 40)}
        />

        {/* Congratulations Drawer */}
        <CongratulationsDrawer
          isVisible={showCongratulations}
          className={endedClassName || activeSession.className}
          onClose={handleSessionEndComplete}
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
  contentContainer: {
    flex: 1,
    alignItems: "center",
  },
  // Add centered style for loading indicator
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
});

export default App;
