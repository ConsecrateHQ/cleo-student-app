import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { Dimensions } from "react-native";
import theme from "../theme";
import Animated, { useSharedValue } from "react-native-reanimated";
import ClassCard from "../components/ClassCard";
import LogoutButton from "../components/LogoutButton";
import DevMenu from "../components/DevMenu";
import { Ionicons } from "@expo/vector-icons";
import useAuthStore from "../hooks/useAuthStore";
import { SafeAreaView } from "react-native-safe-area-context";
import { useBottomSheetAnimations } from "../hooks/useBottomSheetAnimations";
import { router } from "expo-router";

const App = () => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const windowHeight = Dimensions.get("window").height;
  const animatedPosition = useSharedValue(windowHeight);
  const snapPoints = useMemo(() => [140, windowHeight], [windowHeight]);

  // Use the bottom sheet animation hook
  const {
    animatedTitleStyle,
    animatedContentStyle,
    animatedGridStyle,
    animatedSessionCountContainerStyle,
  } = useBottomSheetAnimations({
    animatedPosition,
    windowHeight,
    snapPoints,
  });

  const handleSheetChanges = useCallback((index: number) => {
    console.log("handleSheetChanges", index);
  }, []);

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

  const user = useAuthStore((state) => state.user);
  const [devMenuVisible, setDevMenuVisible] = useState(false);

  console.log("Is DEV mode?", __DEV__);

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
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
            <Animated.View style={animatedSessionCountContainerStyle}>
              <Text style={styles.sessionCount}>10 sessions</Text>
            </Animated.View>
            <Animated.View style={[styles.gridContainer, animatedGridStyle]}>
              <View style={styles.gridRow}>
                <ClassCard />
                <ClassCard />
              </View>
              <View style={styles.gridRow}>
                <ClassCard />
                <ClassCard />
              </View>
            </Animated.View>

            <LogoutButton />
          </BottomSheetView>
        </BottomSheet>

        {/* Dev and Exp menu buttons - positioned at top right */}
        {__DEV__ && (
          <View style={styles.topRightButtonsContainer}>
            <TouchableOpacity
              style={styles.devMenuButton}
              onPress={() => setDevMenuVisible(true)}
            >
              <Ionicons name="construct-outline" size={20} color="white" />
              <Text style={styles.devMenuButtonText}>Dev</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.expMenuButton}
              onPress={() => router.push("/playground")}
            >
              <Ionicons name="flask-outline" size={20} color="white" />
              <Text style={styles.devMenuButtonText}>Exp.</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Dev menu modal */}
        <DevMenu
          visible={devMenuVisible}
          onClose={() => setDevMenuVisible(false)}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.app,
  },
  safeArea: {
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
  topRightButtonsContainer: {
    position: "absolute",
    top: 50,
    right: 20,
    flexDirection: "row",
    zIndex: 2000,
  },
  devMenuButton: {
    backgroundColor: "rgba(102, 102, 102, 0.9)",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    elevation: 10,
    marginRight: 8,
  },
  expMenuButton: {
    backgroundColor: "rgba(102, 102, 102, 0.9)",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    elevation: 10,
  },
  devMenuButtonText: {
    color: "white",
    marginLeft: 6,
    fontWeight: "500",
  },
  logoutButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: "#666",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    zIndex: 1000,
  },
  logoutButtonText: {
    color: "white",
    marginLeft: 6,
    fontWeight: "500",
  },
  overlay: {
    flex: 1,
  },
  menuContainer: {
    position: "absolute",
    top: 40,
    right: 20,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  bypassedBox: {
    backgroundColor: "#ffb347",
    padding: 12,
    borderRadius: 10,
    margin: 20,
    alignSelf: "center",
    minWidth: 160,
    alignItems: "center",
    elevation: 2,
    zIndex: 100,
  },
  bypassedText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    letterSpacing: 1,
  },
  classListContainer: {
    width: "100%",
    paddingHorizontal: 24,
    marginTop: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  emptyText: {
    color: theme.colors.text.secondary,
    fontSize: 16,
    textAlign: "center",
    marginTop: 16,
  },
  classCardRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  activeBadge: {
    backgroundColor: "#4caf50",
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginRight: 10,
    marginVertical: 6,
  },
  activeBadgeText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 13,
  },
  userInfoContainer: {
    width: "100%",
    paddingHorizontal: 24,
    marginTop: 24,
    marginBottom: 8,
  },
  userInfoBypassed: {
    color: "#ff9800",
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 4,
  },
  userInfoName: {
    fontSize: 20,
    fontWeight: "bold",
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  userInfoDetail: {
    fontSize: 15,
    color: theme.colors.text.secondary,
    marginBottom: 1,
  },
  classTextContainer: {
    flexDirection: "column",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    flex: 1,
  },
  classNameText: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 2,
  },
  teacherNameText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  infoText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  highlightText: {
    fontWeight: "bold",
    color: "#3949ab",
  },
  activeSessionContainer: {
    marginTop: 8,
    flexDirection: "column",
    alignItems: "flex-start",
  },
  locationText: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    marginTop: 4,
  },
  locationContainer: {
    width: "100%",
    paddingHorizontal: 24,
    marginTop: 16,
    marginBottom: 8,
  },
  map: {
    width: "100%",
    height: 200, // Adjust height as needed
    borderRadius: 10,
    overflow: "hidden", // Ensure map corners are rounded
    marginTop: 8,
  },
  errorText: {
    color: theme.colors.status.error, // Use status.error color from theme
    fontSize: 16,
    textAlign: "center",
    marginTop: 16,
  },
  coordinateText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 4,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace", // Use monospace font
  },
});

export default App;
