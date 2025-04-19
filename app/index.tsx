import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, StatusBar, Alert, Dimensions } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import BottomSheet from "@gorhom/bottom-sheet";
import theme from "../theme";
import { useSharedValue } from "react-native-reanimated";
import DevMenu from "../components/DevMenu";
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

const App = () => {
  // Refs and basic setup
  const bottomSheetRef = useRef<BottomSheet>(null);
  const windowHeight = Dimensions.get("window").height;
  const animatedPosition = useSharedValue(windowHeight);
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const [devMenuVisible, setDevMenuVisible] = useState(false);
  const processedCheckRef = useRef<string | null>(null);

  // Custom hooks
  const {
    activeSession,
    animations: sessionAnimations,
    showActiveSessionElements,
    handleLeaveEarlyPress,
  } = useActiveSession();

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

  // Effect to handle pending check result display
  useEffect(() => {
    if (pendingCheckResult && !isAnimating && !isReturningHome) {
      // Skip if already processed this specific result
      const resultId = `${pendingCheckResult.sessionId || ""}-${
        pendingCheckResult.success
      }-${pendingCheckResult.isAttending}`;
      if (processedCheckRef.current === resultId) {
        return;
      }

      // Add check for cancellation state to ensure cancelled check-ins are never processed
      if (isCheckInCancelled || checkCancellationRef.current.cancelled) {
        console.log("Ignoring pending check result due to user cancellation");
        return;
      }

      if (pendingCheckResult.success && pendingCheckResult.isAttending) {
        const sessionIdMatch = pendingCheckResult.sessionId || "";
        const classNameMatch = pendingCheckResult.message.match(
          /Student is attending (.*)\./
        );
        const className = classNameMatch ? classNameMatch[1] : "Class";

        // Mark as processed before handling to prevent loops
        processedCheckRef.current = resultId;

        // Now show the active session UI
        showActiveSessionElements(className, sessionIdMatch);
      } else {
        // Mark as processed
        processedCheckRef.current = resultId;

        Alert.alert(
          pendingCheckResult.success ? "Class Check Results" : "Error",
          pendingCheckResult.message
        );
      }
    }
  }, [
    pendingCheckResult,
    isAnimating,
    isReturningHome,
    isCheckInCancelled,
    checkCancellationRef,
    showActiveSessionElements,
  ]);

  // Handle bottom sheet changes
  const handleSheetChanges = useCallback((index: number) => {
    console.log("handleSheetChanges", index);
  }, []);

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
        <DevToolsButtons
          onDevPress={() => setDevMenuVisible(true)}
          onExpPress={() => router.push("/playground")}
        />

        {/* Dev Menu Modal */}
        <DevMenu
          visible={devMenuVisible}
          onClose={() => setDevMenuVisible(false)}
        />

        {/* Cancel Button */}
        <CancelButton
          isVisible={isCancelVisible}
          onPress={handleCancelPress}
          bottomPosition={Math.max(insets.bottom + 40, 40)}
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
});

export default App;
