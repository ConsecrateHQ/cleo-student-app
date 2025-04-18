import Animated, {
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolate,
  SharedValue,
} from "react-native-reanimated";
import { useMemo } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Dimensions } from "react-native";

interface UseBottomSheetAnimationsProps {
  animatedPosition: SharedValue<number>;
  windowHeight: number;
  snapPoints: number[];
}

export const useBottomSheetAnimations = ({
  animatedPosition,
  windowHeight,
  snapPoints,
}: UseBottomSheetAnimationsProps) => {
  const insets = useSafeAreaInsets();

  const initialBottomSheetHeight = snapPoints[0];
  const fadeDistance = 20;
  const collapseDistance = 20;

  const positionAtInitialHeight = windowHeight - initialBottomSheetHeight;
  const positionAtFadeEnd = positionAtInitialHeight - fadeDistance;
  const positionAtCollapseEnd = positionAtFadeEnd - collapseDistance;

  const titleAnimationEndPosition =
    positionAtInitialHeight - positionAtInitialHeight / 3;

  const animatedSessionCountStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      animatedPosition.value,
      [positionAtFadeEnd, positionAtInitialHeight],
      [0, 1],
      Extrapolate.CLAMP
    );

    return {
      opacity: opacity,
    };
  });

  const animatedTitleStyle = useAnimatedStyle(() => {
    const targetScale = 1.1;
    const targetTranslateX = 20;
    const targetMarginTop = 20;

    const scale = interpolate(
      animatedPosition.value,
      [titleAnimationEndPosition, positionAtInitialHeight],
      [targetScale, 1],
      Extrapolate.CLAMP
    );

    const translateX = interpolate(
      animatedPosition.value,
      [titleAnimationEndPosition, positionAtInitialHeight],
      [targetTranslateX, 0],
      Extrapolate.CLAMP
    );

    const marginTop = interpolate(
      animatedPosition.value,
      [titleAnimationEndPosition, positionAtInitialHeight],
      [targetMarginTop, 0],
      Extrapolate.CLAMP
    );

    return {
      transform: [{ scale }, { translateX }],
      marginTop: marginTop,
    };
  });

  const animatedContentStyle = useAnimatedStyle(() => {
    const sheetTop = animatedPosition.value;
    const paddingTop = interpolate(
      sheetTop,
      [insets.top, 0],
      [0, insets.top],
      Extrapolate.CLAMP
    );

    return {
      paddingTop: paddingTop,
    };
  });

  const animatedGridStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      animatedPosition.value,
      [windowHeight - snapPoints[0], windowHeight - snapPoints[1]],
      [0, 1],
      Extrapolate.CLAMP
    );
    return { opacity };
  });

  const animatedSessionCountContainerStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      animatedPosition.value,
      [positionAtFadeEnd, positionAtInitialHeight],
      [0, 1],
      Extrapolate.CLAMP
    );
    const height = interpolate(
      animatedPosition.value,
      [positionAtCollapseEnd, positionAtFadeEnd],
      [0, 24],
      Extrapolate.CLAMP
    );
    return {
      opacity,
      height,
      overflow: "hidden",
    };
  });

  return {
    animatedSessionCountStyle,
    animatedTitleStyle,
    animatedContentStyle,
    animatedGridStyle,
    animatedSessionCountContainerStyle,
  };
};
