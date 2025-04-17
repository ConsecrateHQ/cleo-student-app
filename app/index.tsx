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
  Platform,
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
import { SafeAreaView } from "react-native-safe-area-context";
import { useUserClasses } from "../hooks/useUserClasses";
import * as Location from "expo-location";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";

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
  const { classes: currentUserClasses, loading: isLoadingUserClasses } =
    useUserClasses(user?.uid);

  // State for location
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [locationErrorMsg, setLocationErrorMsg] = useState<string | null>(null);
  const [isLocationLoading, setIsLocationLoading] = useState(true);

  // Effect for location fetching
  useEffect(() => {
    (async () => {
      setIsLocationLoading(true);
      setLocationErrorMsg(null);
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationErrorMsg(
          "Permission to access location was denied. Please enable it in settings."
        );
        setIsLocationLoading(false);
        return;
      }

      try {
        let currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation, // Highest accuracy
        });
        setLocation(currentLocation);
        console.log("Fetched Location:", currentLocation.coords);
      } catch (error) {
        console.error("Error fetching location:", error);
        setLocationErrorMsg("Failed to fetch location.");
      } finally {
        setIsLocationLoading(false);
      }
    })();
  }, []);

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
                  <View style={styles.classTextContainer}>
                    <Text style={styles.classNameText}>{cls.className}</Text>
                    {cls.teacherName && (
                      <Text style={styles.teacherNameText}>
                        Teacher: {cls.teacherName}
                      </Text>
                    )}
                    {cls.joinCode && (
                      <Text style={styles.infoText}>
                        Join Code:{" "}
                        <Text style={styles.highlightText}>{cls.joinCode}</Text>
                      </Text>
                    )}
                    {cls.hasActiveSession && (
                      <View style={styles.activeSessionContainer}>
                        <View style={styles.activeBadge}>
                          <Text style={styles.activeBadgeText}>
                            Active Session
                          </Text>
                        </View>
                        {cls.location && (
                          <Text style={styles.locationText}>
                            Location: {cls.location.latitude.toFixed(4)},{" "}
                            {cls.location.longitude.toFixed(4)}
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* My Location Section */}
        <View style={styles.locationContainer}>
          <Text style={styles.sectionTitle}>My Location</Text>
          {isLocationLoading ? (
            <ActivityIndicator
              color={theme.colors.button.primary}
              size="large"
            />
          ) : locationErrorMsg ? (
            <Text style={styles.errorText}>{locationErrorMsg}</Text>
          ) : location ? (
            <>
              <Text style={styles.coordinateText}>
                Latitude: {location.coords.latitude.toFixed(6)}
              </Text>
              <Text style={styles.coordinateText}>
                Longitude: {location.coords.longitude.toFixed(6)}
              </Text>
              <MapView
                style={styles.map}
                initialRegion={{
                  latitude: location.coords.latitude,
                  longitude: location.coords.longitude,
                  latitudeDelta: 0.005, // Zoom level
                  longitudeDelta: 0.005, // Zoom level
                }}
                showsUserLocation={false} // We'll use a marker instead
                scrollEnabled={false} // Disable scroll for a static view
                zoomEnabled={false} // Disable zoom
              >
                <Marker
                  coordinate={{
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                  }}
                  title="Your Location"
                />
              </MapView>
            </>
          ) : (
            <Text style={styles.emptyText}>Location data not available.</Text>
          )}
        </View>

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
