import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
  useEffect,
} from "react";
import { View, Text, StyleSheet, StatusBar } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Dimensions } from "react-native";
import theme from "../theme";

const CustomHandle = () => (
  <View style={{ paddingTop: useSafeAreaInsets().top }}>
    <View
      style={{
        alignItems: "center",
        paddingTop: 12,
        paddingBottom: 8,
        backgroundColor: "transparent",
      }}
    >
      <View
        style={{
          width: 45,
          height: 5,
          borderRadius: 3,
          backgroundColor: "#fff",
        }}
      />
    </View>
  </View>
);

const App = () => {
  // ref
  const bottomSheetRef = useRef<BottomSheet>(null);

  const insets = useSafeAreaInsets();
  const windowHeight = Dimensions.get("window").height;

  // snap points
  // const snapPoints = useMemo(
  //   () => [130, windowHeight - insets.top],
  //   [windowHeight, insets.top]
  // );

  const snapPoints = useMemo(() => [130, windowHeight], [windowHeight]);

  // callbacks
  const handleSheetChanges = useCallback((index: number) => {
    console.log("handleSheetChanges", index);
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <BottomSheet
        ref={bottomSheetRef}
        onChange={handleSheetChanges}
        snapPoints={snapPoints}
        enableDynamicSizing
        backgroundStyle={{ backgroundColor: theme.colors.background.card }}
        handleComponent={CustomHandle}
      >
        <BottomSheetView
          style={[styles.contentContainer, { paddingTop: insets.top }]}
        >
          <Text style={styles.title}>This Week</Text>
          <Text style={styles.sessionCount}>10 sessions</Text>
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
    padding: 36,
    paddingTop: 0,
    backgroundColor: theme.colors.background.card,
    alignItems: "flex-start",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: theme.colors.text.primary,
    marginBottom: 4,
    marginTop: 0,
  },
  sessionCount: {
    fontSize: 20,
    fontWeight: "400",
    color: theme.colors.text.secondary,
  },
});

export default App;
