import { useState, useEffect, useRef } from "react";
import * as Location from "expo-location";

export const useLocation = () => {
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [locationErrorMsg, setLocationErrorMsg] = useState<string | null>(null);
  const [isLocationLoading, setIsLocationLoading] = useState(true);
  const locationSubscription = useRef<Location.LocationSubscription | null>(
    null
  );

  useEffect(() => {
    let isMounted = true;

    const startWatching = async () => {
      console.log("[useLocation] Starting location services");
      setIsLocationLoading(true);
      setLocationErrorMsg(null);

      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationErrorMsg(
          "Permission to access location was denied. Please enable it in settings."
        );
        if (isMounted) {
          setIsLocationLoading(false);
        }
        return;
      }

      try {
        // First get a single location update immediately
        const initialLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
        });

        if (isMounted) {
          console.log("[useLocation] Initial location acquired");
          setLocation(initialLocation);
          setIsLocationLoading(false);
        }

        // Then start watching for ongoing updates
        locationSubscription.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 1000, // More frequent updates (every 1 second, reduced from 2 seconds)
            distanceInterval: 1, // Smaller distance threshold (1 meter, reduced from 5 meters)
          },
          (newLocation) => {
            if (isMounted) {
              // Compare with previous location to check if it's actually different
              if (
                location &&
                location.coords.latitude === newLocation.coords.latitude &&
                location.coords.longitude === newLocation.coords.longitude
              ) {
                // Skip logging unchanged locations
                return;
              }

              // Only log significant changes (more than 10 meters)
              const hasSignificantChange =
                !location ||
                Math.abs(
                  location.coords.latitude - newLocation.coords.latitude
                ) > 0.00005 ||
                Math.abs(
                  location.coords.longitude - newLocation.coords.longitude
                ) > 0.00005;

              if (hasSignificantChange) {
                console.log(
                  "[useLocation] Significant location change detected"
                );
              }

              setLocation(newLocation); // Update state with the new location
            }
          }
        );

        // SIMULATOR HELPER: For simulator testing, explicitly poll for location changes
        // This is needed because simulator location changes don't always trigger watch updates
        if (__DEV__) {
          // Poll every 3 seconds
          const simulatorPollInterval = setInterval(async () => {
            try {
              if (!isMounted) return;

              const polledLocation = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.BestForNavigation,
              });

              // Only update if the coordinates are actually different
              if (
                location &&
                location.coords.latitude === polledLocation.coords.latitude &&
                location.coords.longitude === polledLocation.coords.longitude
              ) {
                return;
              }

              // Only log significant changes
              const hasSignificantChange =
                !location ||
                Math.abs(
                  location.coords.latitude - polledLocation.coords.latitude
                ) > 0.00005 ||
                Math.abs(
                  location.coords.longitude - polledLocation.coords.longitude
                ) > 0.00005;

              if (hasSignificantChange) {
                console.log(
                  "[useLocation] Simulator detected significant location change"
                );
              }

              if (isMounted) {
                setLocation(polledLocation);
              }
            } catch (error) {
              console.error("[useLocation] Simulator poll error:", error);
            }
          }, 1000);

          // Clean up the polling interval when unmounting
          return () => {
            clearInterval(simulatorPollInterval);
          };
        }
      } catch (error) {
        console.error("[useLocation] Error starting location watcher:", error);
        setLocationErrorMsg("Failed to start location tracking.");
        if (isMounted) {
          setIsLocationLoading(false);
        }
      }
    };

    startWatching();

    // Cleanup function
    return () => {
      isMounted = false;
      console.log("[useLocation] Cleaning up location watcher.");
      locationSubscription.current?.remove(); // Remove the subscription
      // Note: The simulator polling interval is cleaned up in the nested return if __DEV__ is true
    };
  }, []); // Keep empty array: We only want to set up the watcher once

  return { location, locationErrorMsg, isLocationLoading };
};
