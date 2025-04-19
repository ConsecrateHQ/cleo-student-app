import React, { useRef, useMemo, useEffect } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import ThisWeekSheetContent from "./ThisWeekSheetContent";
import theme from "../theme";
import Animated from "react-native-reanimated";

interface HomeBottomSheetProps {
  animatedPosition: Animated.SharedValue<number>;
  animatedTitleStyle: any;
  animatedContentStyle: any;
  animatedGridStyle: any;
  animatedSessionCountContainerStyle: any;
  bottomSheetRef: React.RefObject<BottomSheet>;
  onSheetChange?: (index: number) => void;
  isSearching?: boolean;
}

const HomeBottomSheet: React.FC<HomeBottomSheetProps> = ({
  animatedPosition,
  animatedTitleStyle,
  animatedContentStyle,
  animatedGridStyle,
  animatedSessionCountContainerStyle,
  bottomSheetRef,
  onSheetChange,
  isSearching = false,
}) => {
  const windowHeight = Dimensions.get("window").height;
  const snapPoints = useMemo(() => [140, windowHeight], [windowHeight]);

  // Effect to handle visibility during search
  useEffect(() => {
    // Use a small timeout to avoid immediate transitions
    const timer = setTimeout(() => {
      if (isSearching) {
        // Hide the sheet during search
        bottomSheetRef.current?.close();
      } else {
        bottomSheetRef.current?.snapToIndex(0);
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [isSearching, bottomSheetRef]);

  // Custom handle for bottom sheet
  const CustomHandle = () => (
    <Animated.View style={animatedContentStyle}>
      <View style={styles.handleContainer}>
        <View style={styles.handleIndicator} />
      </View>
    </Animated.View>
  );

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      onChange={onSheetChange}
      snapPoints={snapPoints}
      animatedPosition={animatedPosition}
      backgroundStyle={styles.bottomSheetBackground}
      handleComponent={CustomHandle}
      enableContentPanningGesture={!isSearching}
      enableHandlePanningGesture={!isSearching}
    >
      <BottomSheetView style={styles.bottomSheetContentContainer}>
        <ThisWeekSheetContent
          animatedTitleStyle={animatedTitleStyle}
          animatedSessionCountContainerStyle={
            animatedSessionCountContainerStyle
          }
          animatedGridStyle={animatedGridStyle}
        />
      </BottomSheetView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  bottomSheetBackground: {
    backgroundColor: theme.colors.background.card,
  },
  bottomSheetContentContainer: {
    flex: 1, // Necessary for BottomSheetView content to fill
  },
  handleContainer: {
    alignItems: "center",
    paddingTop: 15,
    paddingBottom: 8,
    backgroundColor: "transparent",
  },
  handleIndicator: {
    width: 45,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#fff",
  },
});

export default HomeBottomSheet;
