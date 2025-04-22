import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  StatusBar,
  Alert,
  Dimensions,
  View,
  ActivityIndicator,
  Platform,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import BottomSheet from "@gorhom/bottom-sheet";
import theme from "../theme";
import { useSharedValue } from "react-native-reanimated";
import useAuthStore from "../hooks/useAuthStore";
import { SafeAreaView } from "react-native-safe-area-context";
import { useBottomSheetAnimations } from "../hooks/useBottomSheetAnimations";
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
import * as Notifications from "expo-notifications";
import * as LocalAuthentication from "expo-local-authentication";
import { updateBiometricVerificationStatus } from "../utils/firebaseClassSessionHelpers";

// --- Notification Handler Configuration ---
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

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
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();
  // State to store the ID of the scheduled biometric verification notification
  const [biometricNotificationId, setBiometricNotificationId] = useState<
    string | null
  >(null);

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
    clearPendingResult,
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

  // --- Utility Function to Cancel Scheduled Notification ---
  const cancelBiometricNotification = useCallback(async () => {
    if (biometricNotificationId) {
      console.log(
        `Cancelling scheduled biometric notification: ${biometricNotificationId}`
      );
      try {
        await Notifications.cancelScheduledNotificationAsync(
          biometricNotificationId
        );
        setBiometricNotificationId(null); // Reset the ID
      } catch (error) {
        console.error("Error cancelling scheduled notification:", error);
      }
    }
  }, [biometricNotificationId]);

  // Wrap handleLeaveEarlyPress to clear store state and cancel notification
  const handleLeaveEarlyPress = useCallback(async () => {
    await cancelBiometricNotification(); // Cancel notification first
    await originalHandleLeaveEarlyPress();
    setActiveSessionInStore(null);
  }, [
    originalHandleLeaveEarlyPress,
    setActiveSessionInStore,
    cancelBiometricNotification,
  ]);

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

  // --- Notification Permission and Listener Setup Effect ---
  useEffect(() => {
    // --- Simplified Permission Request for Local Notifications ---
    const requestPermissions = async () => {
      try {
        const { status: existingStatus } =
          await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync({
            ios: {
              allowAlert: true,
              allowBadge: true,
              allowSound: true,
            },
          });
          finalStatus = status;
        }
        if (finalStatus !== "granted") {
          Alert.alert(
            "Permissions Required",
            "Notifications permission is needed for reminders and verification prompts. Please enable them in settings."
          );
          return false;
        }

        // Configure Android channel (safe to keep, does nothing on iOS)
        if (Platform.OS === "android") {
          Notifications.setNotificationChannelAsync("default", {
            name: "default",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#FF231F7C",
          });
        }

        return true;
      } catch (error) {
        console.error("Error requesting notification permissions:", error);
        Alert.alert(
          "Permission Error",
          "Could not request notification permissions."
        );
        return false;
      }
    };

    requestPermissions().then((granted) => {
      if (granted) {
        console.log("Notification permissions granted.");
        // Permissions granted, listeners will be set up below.
      } else {
        console.log("Notification permissions denied.");
      }
    });
    // ---------------------------------------------------------

    // Listener for when a notification is received while the app is foregrounded
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log("Notification Received:", notification);
        // You might want to do something here, like update UI
      });

    // Listener for when a user interacts with a notification (taps on it)
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener(
        async (response) => {
          console.log("Notification Response Received:", response);
          const notificationData = response.notification.request.content.data;

          if (notificationData?.action === "VERIFY_BIOMETRIC") {
            const { sessionId, classId, studentId } = notificationData;

            if (!sessionId || !classId || !studentId) {
              console.error("Missing data in notification for verification");
              Alert.alert(
                "Error",
                "Could not process verification request due to missing information."
              );
              return;
            }

            console.log(
              `Attempting biometric verification for session: ${sessionId}, student: ${studentId}`
            );

            try {
              // Check for Face ID support first
              const hasHardware = await LocalAuthentication.hasHardwareAsync();
              const supportedTypes =
                await LocalAuthentication.supportedAuthenticationTypesAsync();
              const isFaceIdSupported = supportedTypes.includes(
                LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
              );

              // First explicitly check for enrollment and permission
              const isEnrolled = await LocalAuthentication.isEnrolledAsync();
              if (!isEnrolled) {
                console.log("No biometrics enrolled on this device");
                Alert.alert(
                  "Biometric Setup Required",
                  "Please set up Face ID or Touch ID in your device settings to use this feature."
                );
                return;
              }

              // On iOS, we need to ensure permission to use Face ID
              if (Platform.OS === "ios") {
                // This will trigger the permission dialog if not already granted
                const permResult =
                  await LocalAuthentication.supportedAuthenticationTypesAsync();
                console.log(
                  "Authentication types after permission check:",
                  permResult
                );
              }

              // Configure options
              const authOptions: LocalAuthentication.LocalAuthenticationOptions =
                {
                  promptMessage: "Verify your identity",
                  fallbackLabel: "Enter Passcode", // Keep passcode as fallback
                  disableDeviceFallback: false, // Can be true to prefer biometrics strongly
                };

              // If Face ID is supported, try it first
              if (hasHardware && isFaceIdSupported) {
                console.log(
                  "Face ID is supported, attempting facial recognition."
                );
                // Note: AuthenticationType cannot be directly forced on iOS easily,
                // but the system usually defaults to Face ID if available.
                // The promptMessage can guide the user.
                authOptions.promptMessage = "Verify using Face ID";
              } else {
                console.log(
                  "Face ID not supported or unavailable, using default biometric/passcode prompt."
                );
              }

              console.log("Requesting biometric authentication...");
              const result = await LocalAuthentication.authenticateAsync(
                authOptions
              );

              if (result.success) {
                console.log("Biometric authentication successful");
                Alert.alert("Success", "Verification successful!");
                // Report success to Firebase
                await updateBiometricVerificationStatus(
                  sessionId,
                  studentId,
                  "verified" // Or your specific status for biometric success
                );
              } else {
                console.log("Biometric authentication failed or cancelled");
                Alert.alert("Failed", "Biometric verification failed.");
                // Report failure to Firebase
                await updateBiometricVerificationStatus(
                  sessionId,
                  studentId,
                  "failed_biometric" // New status
                );
              }
            } catch (error) {
              console.error("Error during biometric authentication:", error);
              Alert.alert(
                "Error",
                "An error occurred during biometric verification."
              );
              // Optionally report error to Firebase
              await updateBiometricVerificationStatus(
                sessionId,
                studentId,
                "failed_other" // Or a more specific error status
              );
            }
          }
        }
      );

    // Cleanup listeners on unmount
    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(
          notificationListener.current
        );
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []); // Run only once on mount

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

    // Mark as processed immediately to prevent duplicate processing for handled cases
    processedCheckRef.current = resultId;

    // Handle successful check-in
    if (pendingCheckResult.success && pendingCheckResult.isAttending) {
      console.log("Processing successful check-in result:", pendingCheckResult);

      const sessionIdMatch = pendingCheckResult.sessionId || "";
      const classIdMatch = pendingCheckResult.classId || ""; // Get classId
      const currentUserId = user?.uid; // Get current user ID

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

      // Extra validation
      if (!className || !sessionIdMatch || !classIdMatch || !currentUserId) {
        console.error(
          "Invalid className, sessionId, classId, or userId, cannot activate session or schedule notification"
        );
        Alert.alert("Error", "Could not determine class or user details");
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
            checkInTime: now,
            lastUpdated: now,
            joinTimestamp: Date.now(),
          });
          console.log("Active session info saved to store.");

          // --- Schedule Biometric Verification Notification ---
          // Cancel any potentially existing notification first
          await cancelBiometricNotification();

          const notificationDelaySeconds = 10; // TODO: Change to 30 * 60 for production
          console.log(
            `Scheduling biometric verification notification for session ${sessionIdMatch} in ${notificationDelaySeconds} seconds.`
          );
          const scheduleTime = new Date();
          console.log(
            `Scheduling initiated at: ${scheduleTime.toLocaleTimeString()}`
          );

          try {
            const notificationId =
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: `Verify Attendance: ${className}`,
                  body: "Tap here to verify your presence with biometrics.",
                  data: {
                    action: "VERIFY_BIOMETRIC", // Custom action identifier
                    sessionId: sessionIdMatch,
                    classId: classIdMatch,
                    studentId: currentUserId, // Pass student ID
                  },
                },
                trigger: {
                  type: Notifications.SchedulableTriggerInputTypes
                    .TIME_INTERVAL,
                  seconds: notificationDelaySeconds,
                },
              });
            console.log(
              "Notification scheduled successfully with ID:",
              notificationId
            );
            setBiometricNotificationId(notificationId); // Store the ID
          } catch (error) {
            console.error("Error scheduling notification:", error);
            Alert.alert(
              "Notification Error",
              "Could not schedule the verification reminder."
            );
          }
          // -----------------------------------------------------

          // *** CLEAR PENDING RESULT AFTER SUCCESSFUL PROCESSING ***
          console.log(
            "Clearing pending check result after successful handling."
          );
          clearPendingResult();
        } catch (error) {
          console.error("Error updating active session state or store:", error);
          Alert.alert(
            "Error",
            "Something went wrong processing your check-in."
          );
        }
      })();
    } else if (
      pendingCheckResult.success === true &&
      !pendingCheckResult.isAttending
    ) {
      // Handle successful check, but no session to attend
      console.log(
        "Check successful, but no session found:",
        pendingCheckResult.message
      );
      Alert.alert("Check Complete", pendingCheckResult.message);
      clearPendingResult();
      // processedCheckRef already set above
    } else if (pendingCheckResult.success === false) {
      // Handle check-in failure
      console.log("Check failed:", pendingCheckResult.message);
      Alert.alert("Error", pendingCheckResult.message);
      clearPendingResult();
      // processedCheckRef already set above
    }
  }, [
    pendingCheckResult,
    isCheckInCancelled,
    checkCancellationRef,
    showActiveSessionElements,
    setActiveSessionInStore,
    user,
    clearPendingResult,
    cancelBiometricNotification,
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
  const handleSessionEndComplete = useCallback(async () => {
    // Make async
    // First hide the congratulations drawer
    hideCongratulations();

    // Cancel any pending biometric notification
    await cancelBiometricNotification();

    // Then reset the session state - but skip the confirmation dialog
    // since the session has already ended
    if (activeSession.isActive && activeSession.sessionId) {
      console.log("Ending completed session and resetting state");

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
    cancelBiometricNotification,
  ]);

  // Effect for component unmount cleanup
  useEffect(() => {
    // Cleanup function to cancel notification on unmount
    return () => {
      cancelBiometricNotification(); // Use the cancel function
    };
  }, [cancelBiometricNotification]); // Depend on the cancel function

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
