import { useState, useRef } from "react";
import { Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  withTiming,
  withSequence,
  withDelay,
  useAnimatedStyle,
  cancelAnimation,
  runOnJS,
} from "react-native-reanimated";

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
  const clearAllTimeouts = () => {
    console.log(
      `[clearAllTimeouts] Clearing ${animationStateRef.current.moveTimeoutIds.length} timeouts`
    );

    if (animationStateRef.current.timeoutId) {
      clearTimeout(animationStateRef.current.timeoutId);
      animationStateRef.current.timeoutId = null;
    }

    animationStateRef.current.moveTimeoutIds.forEach((id) => clearTimeout(id));
    animationStateRef.current.moveTimeoutIds = [];
  };

  // Cancel active animations
  const cancelActiveAnimations = () => {
    console.log("[cancelActiveAnimations] Cancelling all active animations");
    cancelAnimation(textOpacity);
    cancelAnimation(textTranslateX);
    cancelAnimation(newTextOpacity);
    cancelAnimation(newTextTranslateX);
    cancelAnimation(circleScale);
    cancelAnimation(circleTranslateX);
    cancelAnimation(circleTranslateY);
  };

  // Reset animation to default state
  const resetAnimationToHome = (reason: string, callback?: () => void) => {
    console.log(
      `[resetAnimationToHome] Resetting with reason: ${reason}, callback exists: ${!!callback}`
    );

    // Update state refs
    animationStateRef.current.isReturningHome = true;
    animationStateRef.current.onReturnHomeCallback = callback || null;

    // Update React state (UI)
    setIsReturningHome(true);
    setIsCancelVisible(false);

    // Clear all timeouts and cancel animations
    clearAllTimeouts();
    cancelActiveAnimations();

    console.log(
      `[resetAnimationToHome] Starting return home animation (reason: ${reason})`
    );

    // Return to original position with a quick animation
    circleTranslateX.value = withTiming(0, { duration: 400 });
    circleTranslateY.value = withTiming(0, { duration: 400 });

    // Return to original size with a slight bounce
    circleScale.value = withSequence(
      withTiming(0.9, { duration: 400 }),
      withTiming(1.1, { duration: 200 }),
      withTiming(1, { duration: 150 })
    );

    // Schedule final animation completion
    const finalTimeoutId = setTimeout(() => {
      console.log(
        `[resetAnimationToHome] Final animation step (reason: ${reason})`
      );

      // Reset text animations
      textOpacity.value = withTiming(1, { duration: 300 });
      textTranslateX.value = withTiming(0, { duration: 300 });
      newTextOpacity.value = withTiming(0, { duration: 300 });
      newTextTranslateX.value = withTiming(50, { duration: 300 });

      // Reset all state
      animationStateRef.current.isAnimating = false;
      animationStateRef.current.isReturningHome = false;
      animationStateRef.current.moveCounter = 0;
      animationStateRef.current.shouldContinue = true;

      // Update React state
      setIsAnimating(false);
      setIsReturningHome(false);

      // Execute callbacks
      if (animationStateRef.current.onReturnHomeCallback) {
        console.log("[resetAnimationToHome] Calling return home callback");
        animationStateRef.current.onReturnHomeCallback();
      }

      // Notify of animation completion
      console.log(`[resetAnimationToHome] Animation complete: ${reason}`);
      if (animationStateRef.current.onCompleteCallback) {
        animationStateRef.current.onCompleteCallback(reason);
      } else {
        console.warn("[resetAnimationToHome] No onComplete callback found");
      }
    }, 800);

    // Track this timeout
    animationStateRef.current.moveTimeoutIds.push(finalTimeoutId);
  };

  // Start the animation
  const startAnimation = (
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

    // Save the onComplete callback
    animationStateRef.current.onCompleteCallback = onComplete;

    // Update state
    animationStateRef.current.isAnimating = true;
    animationStateRef.current.isReturningHome = false;
    animationStateRef.current.moveCounter = 0;
    animationStateRef.current.shouldContinue = true;

    // Update React state
    setIsAnimating(true);
    setIsReturningHome(false);
    setIsCancelVisible(true);

    // Phase 1: Initial animation
    const startInitialAnimation = () => {
      console.log("[startAnimation] Starting phase 1");

      // Animate out the current text
      textOpacity.value = withTiming(0, { duration: 300 });
      textTranslateX.value = withTiming(-50, { duration: 300 });

      // Animate in the new text
      newTextOpacity.value = withTiming(1, { duration: 300 });
      newTextTranslateX.value = withTiming(0, { duration: 300 });

      // Shrink the circle
      circleScale.value = withTiming(0.5, { duration: 500 });

      // Schedule movement phase
      const phase2TimeoutId = setTimeout(startMovementAnimation, 600);
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
        circleTranslateX.value = withTiming(xOffset, { duration: 400 });
        circleTranslateY.value = withTiming(yOffset, { duration: 400 });

        // Track moves
        animationStateRef.current.moveCounter++;

        // Call onMinMovesDone after 2 moves
        if (animationStateRef.current.moveCounter === 2 && onMinMovesDone) {
          console.log("[moveFirefly] Minimum moves reached");
          onMinMovesDone();
        }

        // Schedule next move or completion
        if (index < 3 && animationStateRef.current.shouldContinue) {
          const nextMoveTimeoutId = setTimeout(
            () => moveFirefly(index + 1),
            1600
          );
          animationStateRef.current.moveTimeoutIds.push(nextMoveTimeoutId);
        } else if (animationStateRef.current.shouldContinue) {
          console.log("[moveFirefly] All moves completed naturally");
          resetAnimationToHome("complete");
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
  };

  // Function to stop and cancel animation
  const stopAndCancelAnimation = (
    reason?: string,
    callback?: () => void
  ): boolean => {
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

    // Distinguish between early stop and other reasons
    if (reason !== "early" || animationStateRef.current.moveCounter >= 2) {
      // Mark animation as stopping
      animationStateRef.current.shouldContinue = false;

      console.log(
        `[stopAndCancelAnimation] Stopping animation (reason: ${
          reason || "user"
        })`
      );

      // Reset animation
      resetAnimationToHome(reason || "cancelled", callback);
      return true;
    } else {
      console.log(
        "[stopAndCancelAnimation] Early stop ignored: minimum moves not reached"
      );
      return false;
    }
  };

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
