import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker, Circle } from "react-native-maps";
import useAuthStore from "../hooks/useAuthStore"; // Path updated
import { useUserClasses } from "../hooks/useUserClasses"; // Path updated
import { useLocation } from "../hooks/useLocation"; // Path updated
import { isWithinRadius } from "../utils/locationHelpers"; // Import the helper
import theme from "../theme"; // Path updated

const ATTENDANCE_RADIUS_METERS = 100; // Define attendance radius

export default function PlaygroundScreen() {
  // Hooks moved from index.tsx
  const { location, locationErrorMsg, isLocationLoading } = useLocation();
  const user = useAuthStore((state) => state.user);
  const { classes: currentUserClasses, loading: isLoadingUserClasses } =
    useUserClasses(user?.uid);

  // --- Calculate Attendance Status ---
  let attendanceStatus = "Not attending";
  let attendingClass = null;

  if (location && currentUserClasses && currentUserClasses.length > 0) {
    for (const cls of currentUserClasses) {
      if (cls.hasActiveSession && cls.location) {
        const studentCoords = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };

        // Debug log to check distances
        console.log(`Checking ${cls.className}:`);
        console.log(
          `- Class location: ${cls.location.latitude}, ${cls.location.longitude}`
        );
        console.log(
          `- User location: ${studentCoords.latitude}, ${studentCoords.longitude}`
        );

        // Force the radius to be larger for testing
        const isWithin = isWithinRadius(
          cls.location,
          studentCoords,
          ATTENDANCE_RADIUS_METERS
        );
        console.log(
          `- Within ${ATTENDANCE_RADIUS_METERS}m radius: ${isWithin}`
        );

        if (isWithin) {
          attendingClass = cls;
          attendanceStatus = `Attending class ${cls.className}`;
          console.log(`✅ Attending ${cls.className}!`);
          break; // Attend only one class at a time
        }
      }
    }
  }
  // ---------------------------------

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
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

        {/* Attendance Status Section */}
        {user && location && (
          <View style={styles.statusContainer}>
            <Text style={styles.sectionTitle}>Status</Text>
            <Text
              style={[
                styles.statusText,
                attendingClass
                  ? styles.statusAttending
                  : styles.statusNotAttending,
              ]}
            >
              {attendanceStatus}
            </Text>
          </View>
        )}

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
                  pinColor="blue" // Make user marker blue for consistency
                />
                {/* Blue circle for user location */}
                <Circle
                  center={{
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                  }}
                  radius={ATTENDANCE_RADIUS_METERS} // Use consistent radius
                  strokeColor="rgba(0, 0, 255, 0.5)" // Blue border
                  fillColor="rgba(0, 0, 255, 0.2)" // Blue fill
                />
                {/* Purple circles for active class locations */}
                {currentUserClasses.map(
                  (cls) =>
                    cls.hasActiveSession &&
                    cls.location && (
                      <React.Fragment key={`marker-circle-${cls.classId}`}>
                        <Marker
                          coordinate={{
                            latitude: cls.location.latitude,
                            longitude: cls.location.longitude,
                          }}
                          title={`${cls.className} Location`}
                          pinColor="purple" // Use purple for class markers
                        />
                        <Circle
                          center={{
                            latitude: cls.location.latitude,
                            longitude: cls.location.longitude,
                          }}
                          radius={ATTENDANCE_RADIUS_METERS} // Use consistent radius
                          strokeColor="rgba(128, 0, 128, 0.5)" // Purple border
                          fillColor="rgba(128, 0, 128, 0.2)" // Purple fill
                        />
                      </React.Fragment>
                    )
                )}
              </MapView>
            </>
          ) : (
            <Text style={styles.emptyText}>Location data not available.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background.app, // Added background color
  },
  container: {
    flexGrow: 1,
    padding: 24,
  },
  // Styles moved from index.tsx
  userInfoContainer: {
    width: "100%",
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
  classListContainer: {
    width: "100%",
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
  locationText: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    marginTop: 4,
  },
  locationContainer: {
    width: "100%",
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
  // --- Status Section Styles ---
  statusContainer: {
    width: "100%",
    marginTop: 16,
    marginBottom: 8,
    padding: 14,
    backgroundColor: "#fff",
    borderRadius: 10,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statusText: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  statusAttending: {
    color: theme.colors.status.success, // Use success color
  },
  statusNotAttending: {
    color: theme.colors.status.error, // Use error color
  },
  // --- End Status Section Styles ---
});
