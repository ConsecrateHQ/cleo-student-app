import { useState, useRef, useCallback } from "react";
import { Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  withTiming,
  withSequence,
  useAnimatedStyle,
  cancelAnimation,
} from "react-native-reanimated";

// Animation duration constants
const DURATIONS = {
  TEXT_TRANSITION: 300,
  CIRCLE_SCALE: 500,
  CIRCLE_MOVEMENT: 400,
  CIRCLE_BOUNCE: {
    COMPRESS: 400,
    EXPAND: 200,
    SETTLE: 150,
  },
  ANIMATION_COMPLETION: 750,
  MOVEMENT_INTERVAL: 1600,
};

export const useFireflyAnimation = () => {
  // Animation state
  const [isAnimating, setIsAnimating] = useState(false);
  const [isReturningHome, setIsReturningHome] = useState(false);
  const [isCancelVisible, setIsCancelVisible] = useState(false);

  // Use refs to track state in callbacks - solves timing issues with state updates
  const animationStateRef = useRef({
    isAnimating: false,
    isReturningHome: false,
    moveCounter: 0,
    shouldContinue: true,
    timeoutId: null as NodeJS.Timeout | null,
    moveTimeoutIds: [] as NodeJS.Timeout[],
    onReturnHomeCallback: null as (() => void) | null,
    onCompleteCallback: null as ((reason?: string) => void) | null,
    onMinMovesDoneCallback: null as (() => void) | null,
    minMovesDone: false,
  });

  // Animation values
  const textOpacity = useSharedValue(1);
  const textTranslateX = useSharedValue(0);
  const newTextOpacity = useSharedValue(0);
  const newTextTranslateX = useSharedValue(50);

  // Circle animation values
  const circleScale = useSharedValue(1);
  const circleTranslateX = useSharedValue(0);
  const circleTranslateY = useSharedValue(0);

  // Random number generator within range
  const getRandomInRange = (min: number, max: number) => {
    return Math.random() * (max - min) + min;
  };

  // Animated styles
  const animatedTextStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateX: textTranslateX.value }],
  }));

  const animatedNewTextStyle = useAnimatedStyle(() => ({
    opacity: newTextOpacity.value,
    transform: [{ translateX: newTextTranslateX.value }],
  }));

  // Animated styles for circle
  const animatedCircleStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: circleScale.value },
      { translateX: circleTranslateX.value },
      { translateY: circleTranslateY.value },
    ],
  }));

  // Clear all animation timeouts
  const clearAllTimeouts = useCallback(() => {
    console.log(
      `[clearAllTimeouts] Clearing ${animationStateRef.current.moveTimeoutIds.length} timeouts`
    );

    if (animationStateRef.current.timeoutId) {
      clearTimeout(animationStateRef.current.timeoutId);
      animationStateRef.current.timeoutId = null;
    }

    animationStateRef.current.moveTimeoutIds.forEach((id) => clearTimeout(id));
    animationStateRef.current.moveTimeoutIds = [];
  }, []);

  // Renamed: Animation controls for text elements - now independent from circle
  const animateTextToSearching = useCallback(() => {
    // Log start of text searching animation
    console.log(
      `[animateTextToSearching] Starting text transition to searching state`
    );

    // Fade out the original text
    textOpacity.value = withTiming(0, {
      duration: DURATIONS.TEXT_TRANSITION,
    });

    // Fade in the "searching" text
    newTextOpacity.value = withTiming(1, {
      duration: DURATIONS.TEXT_TRANSITION,
    });
    newTextTranslateX.value = withTiming(0, {
      duration: DURATIONS.TEXT_TRANSITION,
    });
  }, []);

  // Renamed: Animate text back to the idle state
  const animateTextToIdle = useCallback(() => {
    // Fade the original text back in
    textOpacity.value = withTiming(1, {
      duration: DURATIONS.TEXT_TRANSITION,
    });

    // Fade the "searching" text out
    newTextOpacity.value = withTiming(0, {
      duration: DURATIONS.TEXT_TRANSITION,
    });
    newTextTranslateX.value = withTiming(50, {
      duration: DURATIONS.TEXT_TRANSITION,
    });
  }, []);

  // Animation controls for circle - now independent from text
  const animateCircleToSearching = useCallback(() => {
    // console.log(`[animateCircleToSearching] Starting circle scale animation`);
    circleScale.value = withTiming(0.5, { duration: DURATIONS.CIRCLE_SCALE });
  }, []);

  const animateCircleToHome = useCallback(() => {
    // console.log(`[animateCircleToHome] Starting circle return animation`);
    // Reset circle position and add a bounce effect
    circleTranslateX.value = withTiming(0, {
      duration: DURATIONS.CIRCLE_MOVEMENT,
    });

    circleTranslateY.value = withTiming(0, {
      duration: DURATIONS.CIRCLE_MOVEMENT,
    });

    // Let's track the individual parts of the sequence
    circleScale.value = withSequence(
      withTiming(0.9, { duration: DURATIONS.CIRCLE_BOUNCE.COMPRESS }),
      withTiming(1.1, { duration: DURATIONS.CIRCLE_BOUNCE.EXPAND }),
      withTiming(1, { duration: DURATIONS.CIRCLE_BOUNCE.SETTLE })
    );
  }, []);

  // Cancel active animations
  const cancelActiveAnimations = useCallback(() => {
    console.log("[cancelActiveAnimations] Cancelling all active animations");
    cancelAnimation(textOpacity);
    cancelAnimation(textTranslateX);
    cancelAnimation(newTextOpacity);
    cancelAnimation(newTextTranslateX);
    cancelAnimation(circleScale);
    cancelAnimation(circleTranslateX);
    cancelAnimation(circleTranslateY);
  }, []);

  // Renamed: Reset animation to idle state
  const resetAnimationToIdle = useCallback(
    (reason: string, callback?: () => void) => {
      console.log(
        `[resetAnimationToIdle] Resetting with reason: ${reason}, callback exists: ${!!callback}`
      );

      // Update state refs
      animationStateRef.current.isReturningHome = true; // Keep internal name for now if needed elsewhere, but conceptually it's 'returning to idle'
      animationStateRef.current.onReturnHomeCallback = callback || null; // Same as above

      // Update React state (UI)
      setIsReturningHome(true);
      setIsCancelVisible(false);

      // Clear all timeouts and cancel current animations
      clearAllTimeouts();

      // Start smooth animations back to idle/home state
      console.log(
        `[resetAnimationToIdle] Starting smooth animations back to idle/home`
      );
      animateTextToIdle(); // Text is already in the right state, but call for consistency
      animateCircleToHome(); // Animate circle smoothly

      // Schedule final animation completion
      const finalTimeoutId = setTimeout(() => {
        console.log(`[resetAnimationToIdle] Final animation step`);

        // Ensure final state is correct (should be redundant for text now)
        textTranslateX.value = 0;
        textOpacity.value = 1;
        newTextTranslateX.value = 50;
        newTextOpacity.value = 0;
        circleTranslateX.value = 0;
        circleTranslateY.value = 0;
        circleScale.value = 1;

        // Reset all state
        animationStateRef.current.isAnimating = false;
        animationStateRef.current.isReturningHome = false;
        animationStateRef.current.moveCounter = 0;
        animationStateRef.current.shouldContinue = true;
        animationStateRef.current.minMovesDone = false;

        // Update React state
        setIsAnimating(false);
        setIsReturningHome(false);

        // Execute callback passed to this function first
        if (animationStateRef.current.onReturnHomeCallback) {
          console.log("[resetAnimationToIdle] Calling return home callback");
          const callbackToExecute =
            animationStateRef.current.onReturnHomeCallback;
          animationStateRef.current.onReturnHomeCallback = null;
          callbackToExecute();
        }

        // Notify of animation completion
        console.log(`[resetAnimationToIdle] Animation complete: ${reason}`);
        if (animationStateRef.current.onCompleteCallback) {
          const callbackToExecute =
            animationStateRef.current.onCompleteCallback;
          animationStateRef.current.onCompleteCallback = null;
          callbackToExecute(reason);
        } else {
          console.warn("[resetAnimationToIdle] No onComplete callback found");
        }
      }, DURATIONS.ANIMATION_COMPLETION);

      // Track this timeout
      animationStateRef.current.moveTimeoutIds.push(finalTimeoutId);
    },
    [clearAllTimeouts, animateTextToIdle, animateCircleToHome]
  );

  // Start the animation
  const startAnimation = useCallback(
    (
      onComplete: (reason?: string) => void,
      onMinMovesDone?: () => void,
      timeout = 10000
    ) => {
      console.log("[startAnimation] Animation requested");

      // Check if already animating
      if (animationStateRef.current.isAnimating) {
        console.log("[startAnimation] Already animating, ignored");
        return () => false;
      }

      // Save the callbacks
      animationStateRef.current.onCompleteCallback = onComplete;
      animationStateRef.current.onMinMovesDoneCallback = onMinMovesDone || null;
      animationStateRef.current.minMovesDone = false;

      // Update state
      animationStateRef.current.isAnimating = true;
      animationStateRef.current.isReturningHome = false;
      animationStateRef.current.moveCounter = 0;
      animationStateRef.current.shouldContinue = true;

      // Update React state
      setIsAnimating(true);
      setIsReturningHome(false);
      setIsCancelVisible(true);

      // Phase 1: Initial animation - now using independent animations
      const startInitialAnimation = () => {
        console.log("[startAnimation] Starting phase 1: Cross-fade and slide");

        // Use the independent animation functions
        animateTextToSearching();
        animateCircleToSearching();

        // Schedule movement phase
        const phase2TimeoutId = setTimeout(
          startMovementAnimation,
          DURATIONS.TEXT_TRANSITION * 2
        ); // Start movement after text transition
        animationStateRef.current.moveTimeoutIds.push(phase2TimeoutId);
      };

      // Phase 2: Movement animation
      const startMovementAnimation = () => {
        console.log("[startAnimation] Starting movement phase");
        const width = Dimensions.get("window").width / 3;

        // Create movement sequence
        const moveFirefly = (index: number) => {
          // Check if we should continue
          if (!animationStateRef.current.shouldContinue) {
            console.log("[moveFirefly] Movement cancelled, not continuing");
            return;
          }

          console.log(`[moveFirefly] Move ${index} of 3`);

          // Random offsets for natural movement
          const yOffset = getRandomInRange(
            -width / (6 + index * 2),
            width / (6 + index * 2)
          );
          const xOffset =
            index % 2 === 0
              ? -width * (1 - index * 0.2)
              : width * (1 - (index - 1) * 0.2);

          // Execute movement
          circleTranslateX.value = withTiming(xOffset, {
            duration: DURATIONS.CIRCLE_MOVEMENT,
          });
          circleTranslateY.value = withTiming(yOffset, {
            duration: DURATIONS.CIRCLE_MOVEMENT,
          });

          // Track moves
          animationStateRef.current.moveCounter++;

          // Call onMinMovesDone after 2 moves
          if (
            animationStateRef.current.moveCounter === 2 &&
            !animationStateRef.current.minMovesDone &&
            animationStateRef.current.shouldContinue // Only call if not cancelled
          ) {
            console.log("[moveFirefly] Minimum moves reached");
            animationStateRef.current.minMovesDone = true;
            if (animationStateRef.current.onMinMovesDoneCallback) {
              animationStateRef.current.onMinMovesDoneCallback();
            }
          }

          // Schedule next move or completion
          if (index < 3 && animationStateRef.current.shouldContinue) {
            const nextMoveTimeoutId = setTimeout(
              () => moveFirefly(index + 1),
              DURATIONS.MOVEMENT_INTERVAL
            );
            animationStateRef.current.moveTimeoutIds.push(nextMoveTimeoutId);
          } else if (animationStateRef.current.shouldContinue) {
            console.log("[moveFirefly] All moves completed naturally");
            resetAnimationToIdle("complete");
          } else {
            console.log("[moveFirefly] Movement cancelled after this move");
          }
        };

        // Start movement sequence
        moveFirefly(0);

        // Set timeout for animation safety
        animationStateRef.current.timeoutId = setTimeout(() => {
          if (
            animationStateRef.current.isAnimating &&
            !animationStateRef.current.isReturningHome
          ) {
            console.log("[startAnimation] Animation timeout reached");
            stopAndCancelAnimation("timeout");
          }
        }, timeout);
      };

      // Start animation sequence
      startInitialAnimation();

      // Return function to stop animation
      return stopAndCancelAnimation;
    },
    [resetAnimationToIdle, animateTextToSearching, animateCircleToSearching]
  );

  // Function to stop and cancel animation
  const stopAndCancelAnimation = useCallback(
    (reason?: string, callback?: () => void): boolean => {
      console.log(
        `[stopAndCancelAnimation] Called with reason: ${reason || "user"}`
      );
      console.log(
        `Animation state: isAnimating=${animationStateRef.current.isAnimating}, isReturning=${animationStateRef.current.isReturningHome}`
      );

      // If not animating or already returning, ignore
      if (
        !animationStateRef.current.isAnimating ||
        animationStateRef.current.isReturningHome
      ) {
        console.log(
          "[stopAndCancelAnimation] Ignored: not animating or already returning"
        );
        return false;
      }

      // Always mark animation as stopping
      animationStateRef.current.shouldContinue = false;

      // Distinguish between early stop and other reasons
      if (reason !== "early" || animationStateRef.current.minMovesDone) {
        console.log(
          `[stopAndCancelAnimation] Stopping animation (reason: ${
            reason || "user"
          }). Current shared values:
          textOpacity: ${textOpacity.value}
          textTranslateX: ${textTranslateX.value}
          newTextOpacity: ${newTextOpacity.value}
          newTextTranslateX: ${newTextTranslateX.value}
        `
        );

        // Reset animation
        resetAnimationToIdle(reason || "cancelled", callback); // Renamed call
        return true;
      } else {
        console.log(
          "[stopAndCancelAnimation] Early stop ignored: minimum moves not reached"
        );
        return false;
      }
    },
    [resetAnimationToIdle]
  );

  return {
    isAnimating,
    isReturningHome,
    animatedTextStyle,
    animatedNewTextStyle,
    animatedCircleStyle,
    startAnimation,
    isCancelVisible,
  };
};
