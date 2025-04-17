import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
  useEffect,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from "react-native";
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
import LogoutButton from "../components/LogoutButton";
import DevMenu from "../components/DevMenu";
import { Ionicons } from "@expo/vector-icons";
import useAuthStore from "../hooks/useAuthStore";
import useFirestoreStore from "../hooks/useFirestoreStore";
import { SafeAreaView } from "react-native-safe-area-context";

const App = () => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const insets = useSafeAreaInsets();
  const windowHeight = Dimensions.get("window").height;
  const animatedPosition = useSharedValue(windowHeight);
  const snapPoints = useMemo(() => [140, windowHeight], [windowHeight]);

  const initialBottomSheetHeight = snapPoints[0];
  const fadeDistance = 20;
  const collapseDistance = 20;

  const positionAtInitialHeight = windowHeight - initialBottomSheetHeight;
  const positionAtFadeEnd = positionAtInitialHeight - fadeDistance;
  const positionAtCollapseEnd = positionAtFadeEnd - collapseDistance;

  const titleAnimationEndPosition =
    positionAtInitialHeight - positionAtInitialHeight / 3;

  const fadeStart = positionAtFadeEnd;
  const fadeEnd = fadeStart + fadeDistance;
  const collapseStart = fadeEnd;
  const collapseEnd = collapseStart + collapseDistance;

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

  // Firestore store hooks
  const {
    currentUserClasses,
    isLoadingUserClasses,
    fetchUserClasses,
    sessions,
    fetchClassSessions,
    isLoadingSessions,
  } = useFirestoreStore();

  // Fetch user classes on login
  useEffect(() => {
    if (user) {
      fetchUserClasses(user.uid);
    }
  }, [user]);

  // Fetch sessions for all classes (for active session check)
  useEffect(() => {
    if (user && currentUserClasses.length > 0) {
      currentUserClasses.forEach((cls) => {
        fetchClassSessions(cls.classId);
      });
    }
  }, [user, currentUserClasses]);

  // Helper: Map classId to its active session (if any)
  const classActiveSessionMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    sessions.forEach((session) => {
      if (session.status === "active") {
        map[session.classId] = true;
      }
    });
    return map;
  }, [sessions]);

  console.log("Is DEV mode?", __DEV__);

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <StatusBar barStyle="light-content" />

        {/* User Info Section */}
        <View style={styles.userInfoContainer}>
          {!user ? (
            <Text style={styles.userInfoBypassed}>Login is bypassed.</Text>
          ) : (
            <View>
              <Text style={styles.userInfoName}>
                {user.displayName || "No Name"}
              </Text>
              <Text style={styles.userInfoDetail}>
                Email: {user.email || "N/A"}
              </Text>
              <Text style={styles.userInfoDetail}>UUID: {user.uid}</Text>
            </View>
          )}
        </View>

        {/* User's Classes */}
        {user && (
          <View style={styles.classListContainer}>
            <Text style={styles.sectionTitle}>Your Classes</Text>
            {isLoadingUserClasses ? (
              <ActivityIndicator
                color={theme.colors.button.primary}
                size="large"
              />
            ) : currentUserClasses.length === 0 ? (
              <Text style={styles.emptyText}>No classes found.</Text>
            ) : (
              currentUserClasses.map((cls) => (
                <View key={cls.classId} style={styles.classCardRow}>
                  <ClassCard classData={cls} />
                  {classActiveSessionMap[cls.classId] && (
                    <View style={styles.activeBadge}>
                      <Text style={styles.activeBadgeText}>Active Session</Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        )}

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

        {/* Dev menu button - positioned at top right */}
        {__DEV__ && (
          <TouchableOpacity
            style={styles.devMenuButton}
            onPress={() => setDevMenuVisible(true)}
          >
            <Ionicons name="construct-outline" size={20} color="white" />
            <Text style={styles.devMenuButtonText}>Dev</Text>
          </TouchableOpacity>
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
  devMenuButton: {
    position: "absolute",
    top: 50,
    right: 20,
    backgroundColor: "rgba(102, 102, 102, 0.9)",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    zIndex: 2000,
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
    marginLeft: 10,
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
});

export default App;
