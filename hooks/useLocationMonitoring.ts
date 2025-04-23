import { useRef, useCallback, useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { webDb } from "../utils/firebaseConfig";
import * as Notifications from "expo-notifications";
import { checkOutFromSession } from "../utils/firebaseClassSessionHelpers";
import { useLocation } from "./useLocation";
import {
  validateLocationForSession,
  calculateDistance,
} from "../utils/locationHelpers";
import { GeoPoint } from "firebase/firestore";

/**
 * Options for the useLocationMonitoring hook
 */
interface LocationMonitoringOptions {
  /** Callback when user is detected outside the boundary */
  onOutOfBounds?: () => void;
  /** Callback when user returns within bounds */
  onReturnedInBounds?: () => void;
  /** Callback when auto-checkout occurs */
  onAutoCheckout?: (sessionId: string) => void;
  /** Check interval in seconds (defaults to 5s for testing) */
  checkIntervalSeconds?: number;
  /** Auto-checkout timeout in seconds (defaults to 10s for testing) */
  autoCheckoutSeconds?: number;
}

/**
 * Custom hook to monitor user location relative to an active session
 * and trigger notifications/actions when the user leaves the area.
 */
export const useLocationMonitoring = (
  options: LocationMonitoringOptions = {}
) => {
  const { location } = useLocation();
  const [isSessionDetailsLoaded, setIsSessionDetailsLoaded] =
    useState<boolean>(false);
  const [sessionInfo, setSessionInfo] = useState<{
    sessionId: string;
    userId: string;
  } | null>(null);

  // Use the provided options or fallback to defaults
  const checkIntervalSeconds = options.checkIntervalSeconds || 1; // Check every 1 second for faster response
  const autoCheckoutSeconds = options.autoCheckoutSeconds || 30; // Default to 30 seconds

  // All state is managed with refs to avoid re-renders and effect loops
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);
  const autoCheckoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const notificationIdRef = useRef<string | null>(null);
  const isOutOfBoundsRef = useRef<boolean>(false);
  const isMonitoringActiveRef = useRef<boolean>(false);
  const currentSessionInfoRef = useRef<{
    sessionId: string;
    userId: string;
  } | null>(null);
  const sessionDetailsRef = useRef<{
    location: GeoPoint | null;
    radius: number;
  } | null>(null);

  /**
   * Wrap the internal check in useCallback, depending on location
   */
  const performLocationCheck = useCallback(() => {
    // Get the most current location at the time this function is called
    if (location) {
      // Only log when debugging is needed
      if (__DEV__ && location.mocked) {
        console.log(
          `[LocationMonitoring] Check with location: ${location.coords.latitude.toFixed(
            6
          )}, ${location.coords.longitude.toFixed(6)}`
        );
      }

      // Check immediately on any location change if we're out of bounds
      // This helps us return to bounds faster
      if (
        isOutOfBoundsRef.current &&
        location &&
        sessionDetailsRef.current?.location
      ) {
        const { location: sessionLocation, radius } = sessionDetailsRef.current;
        const userCoords = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };

        const distance = calculateDistance(
          {
            latitude: sessionLocation.latitude,
            longitude: sessionLocation.longitude,
          },
          userCoords
        );

        const isInBounds = validateLocationForSession(
          sessionLocation,
          userCoords,
          radius
        );

        const isActuallyInBounds = isInBounds && distance <= radius;

        if (isActuallyInBounds) {
          console.log(
            "[LocationMonitoring] User has returned INSIDE session boundary"
          );
          console.log(
            "[LocationMonitoring] State change: INSIDE -> Clearing timers/notifications"
          );
          isOutOfBoundsRef.current = false;
          options.onReturnedInBounds?.();

          if (autoCheckoutTimerRef.current) {
            clearTimeout(autoCheckoutTimerRef.current);
            autoCheckoutTimerRef.current = null;
            console.log("[LocationMonitoring] Cleared auto-checkout timer");
          }

          if (notificationIdRef.current) {
            Notifications.cancelScheduledNotificationAsync(
              notificationIdRef.current
            ).catch((err) =>
              console.error(
                "[LocationMonitoring] Error cancelling notification:",
                err
              )
            );
            notificationIdRef.current = null;
            console.log(
              "[LocationMonitoring] Cancelled auto-checkout notification"
            );
          }

          Notifications.scheduleNotificationAsync({
            content: {
              title: "Welcome Back!",
              body: "You have returned to the class area.",
            },
            trigger: null,
          });

          return; // Skip the regular check if we've already processed returning to bounds
        }
      }

      // Define the check inside the callback to ensure it captures the latest location
      // Now check refs for session details and location
      if (!location || !sessionDetailsRef.current?.location || !sessionInfo) {
        // Limited logging for missing data scenarios
        if (__DEV__) {
          console.log(
            `[LocationMonitoring] Skipping check: Missing data. L:${!!location}, SD:${!!sessionDetailsRef
              .current?.location}, SI:${!!sessionInfo}`
          );
        }
        return;
      }

      const { sessionId, userId } = sessionInfo;
      const { location: sessionLocation, radius } = sessionDetailsRef.current;

      const userCoords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      // Calculate actual distance for logging and verification
      // Import the calculation function if needed
      const distance = calculateDistance(
        {
          latitude: sessionLocation.latitude,
          longitude: sessionLocation.longitude,
        },
        userCoords
      );

      // Add debug logging for distance
      if (__DEV__) {
        console.log(
          `[LocationMonitoring] Distance to session: ${distance.toFixed(
            2
          )}m (Radius: ${radius}m)`
        );
      }

      const isInBounds = validateLocationForSession(
        sessionLocation,
        userCoords,
        radius
      );

      // Perform a double-check to prevent false "in-bounds" determinations
      // Only consider user in-bounds if both validateLocationForSession returns true
      // AND the actual distance is within the radius
      const isActuallyInBounds = isInBounds && distance <= radius;

      // Only log status changes, not every check
      if (!isActuallyInBounds && !isOutOfBoundsRef.current) {
        console.log(
          "[LocationMonitoring] User is now OUTSIDE session boundary"
        );
        if (!isOutOfBoundsRef.current) {
          console.log(
            "[LocationMonitoring] State change: OUTSIDE -> Setting up notifications/timers"
          );
          isOutOfBoundsRef.current = true;
          options.onOutOfBounds?.();

          // Show immediate notification
          Notifications.scheduleNotificationAsync({
            content: {
              title: "Outside Class Area",
              body: `Please return to the class area within ${autoCheckoutSeconds} seconds to avoid being marked absent.`,
            },
            trigger: null,
          })
            .then(() => {
              console.log(
                "[LocationMonitoring] Scheduled IMMEDIATE 'Outside Class Area' notification."
              );
            })
            .catch((error) => {
              console.error(
                "[LocationMonitoring] FAILED to schedule IMMEDIATE 'Outside Class Area' notification:",
                error
              );
            });

          // Clear existing timer before setting a new one
          if (autoCheckoutTimerRef.current) {
            clearTimeout(autoCheckoutTimerRef.current);
          }

          // Set up auto-checkout timer
          autoCheckoutTimerRef.current = setTimeout(async () => {
            console.log(
              `[LocationMonitoring] Auto-checkout timer fired for session ${sessionId}`
            );
            try {
              // Check again before checking out - maybe user returned just in time?
              // Get the most current location directly from the hook at checkout time
              // This ensures we have the very latest location data
              const latestLocation = location;
              console.log(
                `[LocationMonitoring] Auto-checkout: final location check with:`,
                JSON.stringify(latestLocation?.coords || "null")
              );

              const latestSessionDetails = sessionDetailsRef.current;
              if (
                latestLocation &&
                latestSessionDetails?.location &&
                validateLocationForSession(
                  latestSessionDetails.location,
                  latestLocation.coords,
                  latestSessionDetails.radius
                )
              ) {
                console.log(
                  "[LocationMonitoring] User returned just before auto-checkout timer fired. Cancelling checkout."
                );
                isOutOfBoundsRef.current = false; // Reset flag

                // Clear the checkout notification
                if (notificationIdRef.current) {
                  Notifications.cancelScheduledNotificationAsync(
                    notificationIdRef.current
                  ).catch((err) =>
                    console.error(
                      "[LocationMonitoring] Error cancelling checkout notification on return:",
                      err
                    )
                  );
                  notificationIdRef.current = null;
                }
                return; // Don't check out
              }

              // Proceed with checkout
              await checkOutFromSession(sessionId, userId);
              console.log(
                "[LocationMonitoring] Successfully checked out user automatically"
              );
              options.onAutoCheckout?.(sessionId);
              await clearLocationCheck(); // Full cleanup after checkout
            } catch (error) {
              console.error(
                "[LocationMonitoring] Error during auto-checkout:",
                error
              );
              await clearLocationCheck(); // Cleanup on error too
            }
          }, autoCheckoutSeconds * 1000);

          // Schedule checkout notification
          if (notificationIdRef.current) {
            Notifications.cancelScheduledNotificationAsync(
              notificationIdRef.current
            ).catch((err) =>
              console.warn(
                "[LocationMonitoring] Could not cancel previous checkout notification:",
                err
              )
            );
          }

          Notifications.scheduleNotificationAsync({
            content: {
              title: "Automatic Check-Out",
              body: "You have been automatically checked out for being outside the class area.",
              data: { type: "AUTO_CHECKOUT_WARNING" },
            },
            trigger: {
              seconds: autoCheckoutSeconds,
              repeats: false,
              type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            },
          }).then((id) => {
            notificationIdRef.current = id;
            console.log(
              `[LocationMonitoring] Scheduled auto-checkout notification: ${id}`
            );
          });
        }
      } else if (isActuallyInBounds && isOutOfBoundsRef.current) {
        // Only trigger "return to bounds" if we're confident user is actually in bounds
        console.log(
          "[LocationMonitoring] User has returned INSIDE session boundary"
        );
        console.log(
          "[LocationMonitoring] State change: INSIDE -> Clearing timers/notifications"
        );
        isOutOfBoundsRef.current = false;
        options.onReturnedInBounds?.();

        if (autoCheckoutTimerRef.current) {
          clearTimeout(autoCheckoutTimerRef.current);
          autoCheckoutTimerRef.current = null;
          console.log("[LocationMonitoring] Cleared auto-checkout timer");
        }

        if (notificationIdRef.current) {
          Notifications.cancelScheduledNotificationAsync(
            notificationIdRef.current
          ).catch((err) =>
            console.error(
              "[LocationMonitoring] Error cancelling notification:",
              err
            )
          );
          notificationIdRef.current = null;
          console.log(
            "[LocationMonitoring] Cancelled auto-checkout notification"
          );
        }

        Notifications.scheduleNotificationAsync({
          content: {
            title: "Welcome Back!",
            body: "You have returned to the class area.",
          },
          trigger: null,
        });
      } else {
        // User status hasn't changed - either still in bounds or still out of bounds
        // No action needed
        if (__DEV__) {
          if (isActuallyInBounds) {
            console.log(
              "[LocationMonitoring] User remains INSIDE session boundary"
            );
          } else {
            console.log(
              "[LocationMonitoring] User remains OUTSIDE session boundary"
            );
          }
        }
      }
    } else {
      console.log(
        `[LocationMonitoring] performLocationCheck called but location is null`
      );
    }
  }, [
    location,
    options,
    autoCheckoutSeconds,
    isSessionDetailsLoaded,
    sessionInfo,
  ]);

  /**
   * Effect to start/stop monitoring interval when conditions are met
   */
  useEffect(() => {
    // Only log state transition events, not every effect evaluation
    const isReadyToStart =
      sessionInfo &&
      isSessionDetailsLoaded &&
      location &&
      !isMonitoringActiveRef.current;
    const wasMonitoring = isMonitoringActiveRef.current;

    if (isReadyToStart) {
      console.log(
        `[LocationMonitoring] Starting monitoring for session ${sessionInfo.sessionId}.`
      );

      // Perform an initial check immediately
      performLocationCheck();

      // Start the interval
      intervalIdRef.current = setInterval(
        performLocationCheck,
        checkIntervalSeconds * 1000
      );
      isMonitoringActiveRef.current = true;
    }

    // Cleanup function: Clears the interval if dependencies change
    // or component unmounts while monitoring is active.
    return () => {
      if (wasMonitoring && !isReadyToStart) {
        console.log(
          "[LocationMonitoring] Cleaning up: interval stopped due to dependency changes."
        );
        if (intervalIdRef.current) {
          clearInterval(intervalIdRef.current);
          intervalIdRef.current = null;
        }
        isMonitoringActiveRef.current = false;
      }
    };
  }, [
    location,
    performLocationCheck,
    checkIntervalSeconds,
    isSessionDetailsLoaded,
    sessionInfo,
  ]);

  /**
   * Clean up all timers, notifications, and reset state refs
   */
  const clearLocationCheck = useCallback(async () => {
    console.log("[LocationMonitoring] Clearing all resources...");

    // Use the effect cleanup logic to stop the interval first
    if (isMonitoringActiveRef.current) {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
        console.log("[LocationMonitoring] Cleared location check interval");
      }
      isMonitoringActiveRef.current = false; // Mark as inactive
    }

    // Clear auto-checkout timer
    if (autoCheckoutTimerRef.current) {
      clearTimeout(autoCheckoutTimerRef.current);
      autoCheckoutTimerRef.current = null;
      console.log("[LocationMonitoring] Cleared auto-checkout timer");
    }

    // Cancel scheduled notification
    if (notificationIdRef.current) {
      try {
        await Notifications.cancelScheduledNotificationAsync(
          notificationIdRef.current
        );
        console.log(
          `[LocationMonitoring] Cancelled notification: ${notificationIdRef.current}`
        );
      } catch (error) {
        console.error(
          "[LocationMonitoring] Error cancelling notification:",
          error
        );
      }
      notificationIdRef.current = null;
    }

    // Reset state refs
    isOutOfBoundsRef.current = false;
    sessionDetailsRef.current = null;
    currentSessionInfoRef.current = null; // Also clear session info
    setSessionInfo(null);
    setIsSessionDetailsLoaded(false);
    console.log("[LocationMonitoring] All resources cleared and state reset.");
  }, []); // No dependencies needed for cleanup

  /**
   * Initialize location monitoring - Fetches session data and stores it.
   * The actual interval start is handled by the useEffect.
   */
  const initLocationCheck = useCallback(
    async (sessionId: string, userId: string) => {
      // Clean up any previous monitoring state *completely*
      await clearLocationCheck();

      console.log(
        `[LocationMonitoring] initLocationCheck called for session ${sessionId}, user ${userId}`
      );
      currentSessionInfoRef.current = { sessionId, userId }; // Store basic session info
      setSessionInfo({ sessionId, userId }); // ALSO set the state variable

      try {
        const sessionRef = doc(webDb, "sessions", sessionId);
        const sessionSnap = await getDoc(sessionRef);

        if (!sessionSnap.exists()) {
          console.error(`[LocationMonitoring] Session ${sessionId} not found!`);
          currentSessionInfoRef.current = null; // Clear session info if not found
          setSessionInfo(null);
          return;
        }

        const data = sessionSnap.data();
        const fetchedLocation = data.location as GeoPoint | null;
        const fetchedRadius = data.radius || 100;

        // Store detailed session location/radius info
        sessionDetailsRef.current = {
          location: fetchedLocation,
          radius: fetchedRadius,
        };
        setIsSessionDetailsLoaded(true);

        // In case session info got cleared during the async fetch, set it again
        if (!currentSessionInfoRef.current) {
          currentSessionInfoRef.current = { sessionId, userId };
          setSessionInfo({ sessionId, userId });
        }

        console.log(
          `[LocationMonitoring] Session details loaded: ${JSON.stringify({
            location: fetchedLocation
              ? `${fetchedLocation.latitude},${fetchedLocation.longitude}`
              : "null",
            radius: fetchedRadius,
          })}`
        );

        console.log("[LocationMonitoring] Successfully set sessionDetailsRef.");
        // *** IMPORTANT: Interval is NO LONGER started here. ***
        // The useEffect watching 'location' will handle starting the interval
        // once both location and session details are available.

        // If location is already available, the useEffect might run immediately
        // after this function completes and state updates propagate.
      } catch (error) {
        console.error(
          "[LocationMonitoring] Error fetching session details:",
          error
        );
        // Ensure cleanup happens on error
        currentSessionInfoRef.current = null;
        setSessionInfo(null);
        sessionDetailsRef.current = null;
        setIsSessionDetailsLoaded(false);
      }
    },
    [clearLocationCheck] // Remove sessionInfo dependency
  );

  // Return the public functions
  return {
    initLocationCheck,
    clearLocationCheck,
  };
};
