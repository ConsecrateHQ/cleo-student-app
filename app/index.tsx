import React, { useCallback, useMemo, useRef } from "react";
import { View, Text, StyleSheet, StatusBar } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Dimensions } from "react-native";
import theme from "../theme";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolate,
} from "react-native-reanimated";
import ClassCard from "../components/ClassCard";

const App = () => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const insets = useSafeAreaInsets();
  const windowHeight = Dimensions.get("window").height;
  const animatedPosition = useSharedValue(windowHeight);
  const snapPoints = useMemo(() => [130, windowHeight], [windowHeight]);

  const initialBottomSheetHeight = snapPoints[0];
  const fadeDistance = 50;

  const positionAtInitialHeight = windowHeight - initialBottomSheetHeight;
  const positionAtFadeEnd =
    windowHeight - (initialBottomSheetHeight + fadeDistance);
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

  const handleSheetChanges = useCallback((index: number) => {
    console.log("handleSheetChanges", index);
  }, []);

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

  const CustomHandle = () => (
    <Animated.View style={animatedContentStyle}>
      <View
        style={{
          alignItems: "center",
          paddingTop: 15,
          paddingBottom: 8,
          backgroundColor: "transparent",
        }}
      >
        <View
          style={{
            width: 45,
            height: 6,
            borderRadius: 3,
            backgroundColor: "#fff",
          }}
        />
      </View>
    </Animated.View>
  );

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        onChange={handleSheetChanges}
        snapPoints={snapPoints}
        animatedPosition={animatedPosition}
        backgroundStyle={{ backgroundColor: theme.colors.background.card }}
        handleComponent={CustomHandle}
      >
        <BottomSheetView style={styles.contentContainer}>
          <Animated.Text style={[styles.title, animatedTitleStyle]}>
            This Week
          </Animated.Text>
          <Animated.Text
            style={[styles.sessionCount, animatedSessionCountStyle]}
          >
            10 sessions
          </Animated.Text>
          {/* <Text style={styles.title}>My Sessions</Text> */}
          <View style={styles.gridContainer}>
            <View style={styles.gridRow}>
              <ClassCard />
              <ClassCard />
            </View>
            <View style={styles.gridRow}>
              <ClassCard />
              <ClassCard />
            </View>
          </View>
        </BottomSheetView>
      </BottomSheet>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.app,
  },
  contentContainer: {
    paddingHorizontal: 36,
    minHeight: 130,
    alignItems: "flex-start",
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: theme.colors.text.primary,
    marginBottom: 4,
    alignSelf: "flex-start",
    width: "100%",
  },
  sessionCount: {
    fontSize: 20,
    fontWeight: "400",
    color: theme.colors.text.secondary,
  },
  gridContainer: {
    flexDirection: "column",
    width: "100%",
    alignItems: "center",
    marginTop: 20,
  },
  gridRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 10,
  },
});

export default App;
