import { useState } from "react";
import { Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  withTiming,
  withSequence,
  withDelay,
  useAnimatedStyle,
  cancelAnimation,
} from "react-native-reanimated";

export const useFireflyAnimation = () => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [isReturningHome, setIsReturningHome] = useState(false);

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

  // Start the animation
  const startAnimation = (
    onComplete: () => void,
    onMinMovesDone?: () => void,
    timeout = 10000
  ) => {
    if (isAnimating) return;

    setIsAnimating(true);
    setIsReturningHome(false);
    let timeoutId: NodeJS.Timeout | null = null;
    let moveTimeoutIds: NodeJS.Timeout[] = [];
    let moveCounter = 0;
    let shouldContinue = true;
    let onReturnHomeCallback: (() => void) | null = null;

    // Animation phases
    const startPhase1 = () => {
      // Animate out the current text
      textOpacity.value = withTiming(0, { duration: 300 });
      textTranslateX.value = withTiming(-50, { duration: 300 });

      // Animate in the new text
      newTextOpacity.value = withTiming(1, { duration: 300 });
      newTextTranslateX.value = withTiming(0, { duration: 300 });

      // Shrink the circle
      circleScale.value = withTiming(0.5, { duration: 500 });

      // Wait for the shrink animation to complete before moving
      const phase2TimeoutId = setTimeout(startPhase2, 600);
      moveTimeoutIds.push(phase2TimeoutId);
    };

    const startPhase2 = () => {
      const width = Dimensions.get("window").width / 3;

      // Create alternating left-right movement with proper timing
      const moveFirefly = (index: number) => {
        if (!shouldContinue) return;

        // Get random y offset for more natural movement
        const yOffset = getRandomInRange(
          -width / (6 + index * 2),
          width / (6 + index * 2)
        );

        // Alternate left and right with decreasing intensity
        const xOffset =
          index % 2 === 0
            ? -width * (1 - index * 0.2)
            : width * (1 - (index - 1) * 0.2);

        // Move the firefly
        circleTranslateX.value = withTiming(xOffset, { duration: 400 });
        circleTranslateY.value = withTiming(yOffset, { duration: 400 });

        moveCounter++;

        // Call onMinMovesDone after 2 moves
        if (moveCounter === 2 && onMinMovesDone) {
          onMinMovesDone();
        }

        // Continue to next movement or complete
        if (index < 3 && shouldContinue) {
          const nextMoveTimeoutId = setTimeout(
            () => moveFirefly(index + 1),
            1600
          ); // 400ms move + 1200ms pause
          moveTimeoutIds.push(nextMoveTimeoutId);
        } else {
          resetAnimation("complete");
        }
      };

      // Start the movement sequence
      moveFirefly(0);

      // Set timeout to cancel if taking too long
      timeoutId = setTimeout(() => {
        if (isAnimating) {
          shouldContinue = false;
          resetAnimation("timeout");
        }
      }, timeout);
    };

    const resetAnimation = (
      reason?: "timeout" | "complete" | "early",
      callback?: () => void
    ) => {
      // Set returning home state
      setIsReturningHome(true);

      // Store callback
      onReturnHomeCallback = callback || null;

      // Clear all timeouts
      if (timeoutId) clearTimeout(timeoutId);
      moveTimeoutIds.forEach((id) => clearTimeout(id));
      moveTimeoutIds = [];

      // Cancel any ongoing animations
      cancelAnimation(circleTranslateX);
      cancelAnimation(circleTranslateY);
      cancelAnimation(circleScale);

      console.log(`Animation reset reason: ${reason || "manual"}`);

      // Return to original position with a quick animation
      circleTranslateX.value = withTiming(0, { duration: 400 });
      circleTranslateY.value = withTiming(0, { duration: 400 });

      // Return to original size with a slight bounce
      circleScale.value = withSequence(
        withTiming(0.9, { duration: 400 }),
        withTiming(1.1, { duration: 200 }),
        withTiming(1, { duration: 150 })
      );

      // Reset text
      const textResetTimeoutId = setTimeout(() => {
        textOpacity.value = withTiming(1, { duration: 300 });
        textTranslateX.value = withTiming(0, { duration: 300 });
        newTextOpacity.value = withTiming(0, { duration: 300 });
        newTextTranslateX.value = withTiming(50, { duration: 300 });

        setIsAnimating(false);
        setIsReturningHome(false);

        // Call the return home callback if it exists
        if (onReturnHomeCallback) {
          onReturnHomeCallback();
        }

        onComplete();
      }, 800);
      moveTimeoutIds.push(textResetTimeoutId);
    };

    // Execute early stop (called when logic completes after min moves)
    const earlyStop = (callback?: () => void) => {
      if (moveCounter >= 2) {
        shouldContinue = false;
        resetAnimation("early", callback);
        return true;
      }
      return false;
    };

    // Start the animation
    startPhase1();

    return earlyStop;
  };

  return {
    isAnimating,
    isReturningHome,
    animatedTextStyle,
    animatedNewTextStyle,
    animatedCircleStyle,
    startAnimation,
  };
};
