import { useRef, useState, useCallback, useEffect } from "react";
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
  resetCancellationState: () => void;
  clearPendingResult: () => void;
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
  const { isChecking, checkSessions, cancelChecking } =
    useClassSessionChecker();

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

  // Ref to track if we're waiting for animation to complete before setting result
  const pendingResultRef = useRef<SessionCheckResult | null>(null);

  // Ref to track if check-in is in progress
  const checkInProgressRef = useRef(false);

  // Ref to track if minimum moves have been completed
  const minMovesCompletedRef = useRef(false);

  // Use effect to ensure cancellation is properly handled when component unmounts
  useEffect(() => {
    return () => {
      // Clean up on unmount
      if (checkInProgressRef.current) {
        cancelChecking();
      }
    };
  }, [cancelChecking]);

  // Clear any pending result when component unmounts or when cancelled
  useEffect(() => {
    if (isCheckInCancelled) {
      console.log(
        "Cancellation state changed to true - clearing pending results"
      );
      pendingResultRef.current = null;
      setPendingCheckResult(null);
    }
  }, [isCheckInCancelled]);

  // Function to explicitly clear pending result states
  const clearPendingResult = useCallback(() => {
    console.log("[useCheckIn] Clearing pending check result states explicitly");
    setPendingCheckResult(null);
    pendingResultRef.current = null;
  }, []); // Dependencies: none, it just uses setters/refs

  // Handle setting check result with proper sequencing
  const setCheckResult = useCallback(
    (result: SessionCheckResult) => {
      // Double-check cancellation state before processing any result
      if (isCheckInCancelled || checkCancellationRef.current.cancelled) {
        console.log("Ignoring check result due to cancellation");
        return;
      }

      if (result.success && result.isAttending) {
        // Success with attendance - store the result and wait for animation
        console.log(
          "Storing successful check result to process after animation"
        );
        pendingResultRef.current = result;

        // If minimum moves are already completed, we can stop the animation
        if (minMovesCompletedRef.current && stopAnimationFnRef.current) {
          console.log(
            "Minimum moves already completed, stopping animation to process check-in"
          );
          stopAnimationFnRef.current("complete", () => {
            // This callback runs after the animation has completely returned home
            if (
              !isCheckInCancelled &&
              !checkCancellationRef.current.cancelled
            ) {
              console.log(
                "Animation returned home, now setting successful check result"
              );
              setPendingCheckResult(pendingResultRef.current);
              pendingResultRef.current = null;
            }
          });
        }
        // If not, the onMinMovesDone callback will handle it when the minimum moves are done
      } else {
        // For non-success or non-attending results, update immediately if not cancelled
        console.log("Setting non-attending check result immediately");

        // Final cancellation check before setting result
        if (!isCheckInCancelled && !checkCancellationRef.current.cancelled) {
          setPendingCheckResult(result);
        } else {
          console.log("Last minute cancellation detected, not setting result");
        }

        // For error cases, we can stop animation immediately
        if (stopAnimationFnRef.current) {
          stopAnimationFnRef.current("error");
        }
      }
    },
    [isCheckInCancelled, minMovesCompletedRef]
  );

  // Handle check-in button press
  const handleCheckInPress = async () => {
    if (isAnimating || isChecking) return;

    // Reset all cancellation and result states
    setIsCheckInCancelled(false);
    checkCancellationRef.current.cancelled = false;
    pendingResultRef.current = null;
    setPendingCheckResult(null);
    minMovesCompletedRef.current = false;

    // Mark check-in as in progress
    checkInProgressRef.current = true;

    // Start animation first
    stopAnimationFnRef.current = startAnimation(
      // onComplete callback for animation
      (reason) => {
        console.log(`Animation completed/stopped naturally: ${reason}`);
        stopAnimationFnRef.current = null;

        // Check if we were cancelled during animation
        if (isCheckInCancelled || checkCancellationRef.current.cancelled) {
          console.log(
            "Animation completed but cancellation was detected, not processing results"
          );
          return;
        }

        // If we have a pending result waiting for animation completion, process it now
        if (
          pendingResultRef.current &&
          !isCheckInCancelled &&
          !checkCancellationRef.current.cancelled
        ) {
          console.log("Processing pending result after animation completion");
          setPendingCheckResult(pendingResultRef.current);
          pendingResultRef.current = null;
        }
      },
      // onMinMovesDone callback - called when 2 moves are completed
      () => {
        console.log("Minimum animation moves completed");
        minMovesCompletedRef.current = true;

        // If we already have a result waiting, we can stop the animation now
        if (pendingResultRef.current && stopAnimationFnRef.current) {
          console.log(
            "Result already available, stopping animation after minimum moves"
          );
          stopAnimationFnRef.current("complete", () => {
            // This callback runs after the animation has completely returned home
            if (
              !isCheckInCancelled &&
              !checkCancellationRef.current.cancelled &&
              pendingResultRef.current
            ) {
              console.log("Animation returned home, now setting check result");
              const resultToSet = pendingResultRef.current;
              pendingResultRef.current = null;
              setPendingCheckResult(resultToSet);
              console.log("Check result set after minimum moves completion");
            }
          });
        }
      },
      10000 // Timeout
    );

    try {
      // Pass the cancellation ref to checkSessions
      const result = await checkSessions(checkCancellationRef);

      // First check if cancellation occurred during the session check
      if (isCheckInCancelled || checkCancellationRef.current.cancelled) {
        console.log(
          "Check-in process was cancelled, ignoring results completely"
        );
        // Ensure animation is stopped if it hasn't already been
        if (stopAnimationFnRef.current) {
          stopAnimationFnRef.current("cancelled");
        }
        checkInProgressRef.current = false;
        return; // Exit early to avoid any further processing
      }

      // Use the coordinator to handle the result - this will also handle stopping
      // the animation if minimum moves are completed
      setCheckResult(result);

      checkInProgressRef.current = false;
    } catch (error) {
      console.error("Error during check-in:", error);

      // Check for cancellation one last time
      if (!isCheckInCancelled && !checkCancellationRef.current.cancelled) {
        setPendingCheckResult({
          success: false,
          message: "Location check failed.",
          isAttending: false,
        });
        if (stopAnimationFnRef.current) {
          stopAnimationFnRef.current("error");
        }
      } else {
        console.log(
          "Error occurred but check-in was already cancelled, ignoring error"
        );
      }
      checkInProgressRef.current = false;
    }
  };

  // Handle cancel button press
  const handleCancelPress = () => {
    console.log("User initiated check-in cancellation");

    // Set both cancellation flags immediately
    setIsCheckInCancelled(true);
    checkCancellationRef.current.cancelled = true;

    // Clear any pending results immediately
    pendingResultRef.current = null;
    setPendingCheckResult(null);

    // Force cancel any ongoing API calls
    cancelChecking();

    // Stop the animation if it exists
    if (stopAnimationFnRef.current) {
      console.log("Stopping check-in animation");
      stopAnimationFnRef.current("cancelled");
    } else {
      console.log(
        "No animation to stop, cancellation only affects check-in process"
      );
    }

    checkInProgressRef.current = false;
  };

  // Add function to reset cancellation state
  const resetCancellationState = () => {
    console.log("Explicitly resetting cancellation state flags");

    // Only clear pending result if there isn't a successful result waiting
    if (!pendingResultRef.current || !pendingResultRef.current.isAttending) {
      console.log("No successful result pending, clearing all state");
      pendingResultRef.current = null;
      setPendingCheckResult(null);
    } else {
      console.log("Successful result pending, preserving it during reset");
      // Set the pending result to state if it hasn't been set yet
      if (pendingResultRef.current && !pendingCheckResult) {
        console.log("Setting successful pending result during reset");
        setPendingCheckResult(pendingResultRef.current);
      }
    }

    setIsCheckInCancelled(false);
    checkCancellationRef.current.cancelled = false;
    checkInProgressRef.current = false;
    minMovesCompletedRef.current = false;
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
    resetCancellationState,
    clearPendingResult,
  };
};
