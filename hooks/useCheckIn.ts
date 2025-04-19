import { useRef, useState } from "react";
import { Alert } from "react-native";
import { useFireflyAnimation } from "./useFireflyAnimation";
import {
  SessionCheckResult,
  useClassSessionChecker,
} from "./useClassSessionChecker";

interface UseCheckInResult {
  isChecking: boolean;
  isAnimating: boolean;
  isReturningHome: boolean;
  isCancelVisible: boolean;
  pendingCheckResult: SessionCheckResult | null;
  animatedTextStyle: any;
  animatedNewTextStyle: any;
  animatedCircleStyle: any;
  isCheckInCancelled: boolean;
  checkCancellationRef: React.MutableRefObject<{ cancelled: boolean }>;
  handleCheckInPress: () => Promise<void>;
  handleCancelPress: () => void;
}

export const useCheckIn = (): UseCheckInResult => {
  // Firefly animation hook
  const {
    isAnimating,
    isReturningHome,
    animatedTextStyle,
    animatedNewTextStyle,
    animatedCircleStyle,
    startAnimation,
    isCancelVisible,
  } = useFireflyAnimation();

  // Class session checker hook
  const { isChecking, checkSessions } = useClassSessionChecker();

  // State for pending check result
  const [pendingCheckResult, setPendingCheckResult] =
    useState<SessionCheckResult | null>(null);

  // State to track if check-in was cancelled by the user
  const [isCheckInCancelled, setIsCheckInCancelled] = useState(false);

  // Ref to store the stop animation function
  const stopAnimationFnRef = useRef<
    ((reason?: string, callback?: () => void) => boolean) | null
  >(null);

  // Ref to signal cancellation to the checkSessions function
  const checkCancellationRef = useRef({ cancelled: false });

  // Handle check-in button press
  const handleCheckInPress = async () => {
    if (isAnimating || isChecking) return;

    setIsCheckInCancelled(false); // Reset cancellation flag
    checkCancellationRef.current.cancelled = false; // Reset cancellation ref

    stopAnimationFnRef.current = startAnimation(
      // onComplete callback for animation
      (reason) => {
        console.log(`Animation completed/stopped naturally: ${reason}`);
        stopAnimationFnRef.current = null; // Clear ref when animation ends
      },
      // onMinMovesDone callback
      () => {
        console.log("Minimum animation moves completed");
      },
      10000 // Timeout
    );

    try {
      // Pass the cancellation ref to checkSessions
      const result = await checkSessions(checkCancellationRef);

      // First check if cancellation occurred at any point
      if (isCheckInCancelled || checkCancellationRef.current.cancelled) {
        console.log(
          "Check-in process was cancelled, ignoring results completely"
        );
        // Ensure animation is stopped if it hasn't already been
        if (stopAnimationFnRef.current) {
          stopAnimationFnRef.current("cancelled");
        }
        return; // Exit early to avoid any further processing
      }

      // Only process results if not cancelled
      if (stopAnimationFnRef.current) {
        // Attempt to stop the animation early as the check is complete
        const stopped = stopAnimationFnRef.current("early", () => {
          console.log("Firefly returned home after early stop.");
        });
        console.log("Attempted early animation stop:", stopped);
        // Only set result if animation was successfully stopped or allowed to stop early
        if (stopped) {
          setPendingCheckResult(result);
        } else {
          // If stop was ignored (e.g., min moves not met), wait for natural completion
          // The onComplete handler will clear the ref.
          setPendingCheckResult(result);
        }
      } else {
        // Animation already stopped (completed/timed out/cancelled before checkSessions finished)
        setPendingCheckResult(result);
        console.log("Animation already stopped, setting check result.");
      }
    } catch (error) {
      console.error("Error during check-in:", error);
      // Only show error and stop animation if not cancelled by user
      if (!isCheckInCancelled && !checkCancellationRef.current.cancelled) {
        setPendingCheckResult({
          success: false,
          message: "Location check failed.",
          isAttending: false,
        });
        if (stopAnimationFnRef.current) {
          stopAnimationFnRef.current("error"); // Stop animation due to error
        }
      } else {
        console.log(
          "Error occurred but check-in was already cancelled, ignoring error"
        );
      }
    }
  };

  // Handle cancel button press
  const handleCancelPress = () => {
    console.log("User initiated check-in cancellation");

    // Set both cancellation flags
    setIsCheckInCancelled(true);
    checkCancellationRef.current.cancelled = true;

    // Always attempt to stop the animation if it exists
    if (stopAnimationFnRef.current) {
      console.log("Stopping check-in animation");
      stopAnimationFnRef.current("cancelled", () => {
        console.log("Animation stopped due to user cancellation");
        // Clear any pending results that might have been set
        setPendingCheckResult(null);
      });
    } else {
      console.log(
        "No animation to stop, cancellation only affects check-in process"
      );
      // Clear any pending results that might have been set
      setPendingCheckResult(null);
    }
  };

  return {
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
  };
};
