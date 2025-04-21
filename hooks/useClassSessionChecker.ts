import React, { useState, useRef, useCallback } from "react";
import {
  getActiveSessionsForStudent,
  getStudentClasses,
  getClassDetails,
  checkInToSession,
} from "../utils/firebaseClassSessionHelpers";
import useAuthStore from "./useAuthStore";
import { useLocation } from "./useLocation";
import {
  validateLocationForSession,
  calculateDistance,
} from "../utils/locationHelpers";
// Remove react-native-firebase import
// import { FirebaseFirestoreTypes } from "@react-native-firebase/firestore";

// Import Web SDK types
import { Timestamp, GeoPoint } from "firebase/firestore";

/**
 * Local interfaces to match the structures used in firebaseClassSessionHelpers
 */
interface ClassDetails {
  classId: string;
  name: string;
  teacherId: string;
  joinCode?: string;
}

interface BaseUserClassInfo {
  classId: string;
  className: string;
  joinDate: Timestamp; // Use Web SDK Timestamp
}

interface ActiveSessionData {
  sessionId: string;
  classId: string;
  location: GeoPoint | null; // Use Web SDK GeoPoint
  startTime: Timestamp; // Use Web SDK Timestamp
}

/**
 * Simulates network latency in DEV mode, interruptible by cancellationRef
 * @param cancellationRef Ref object to check for cancellation signal
 * @param minSeconds Minimum delay in seconds
 * @param maxSeconds Maximum delay in seconds
 * @returns Promise that resolves after the delay or rejects if cancelled
 */
const mockDelay = (
  cancellationRef: React.MutableRefObject<{ cancelled: boolean }>,
  minSeconds = 1,
  maxSeconds = 7
): Promise<void> => {
  // Only simulate delay in DEV mode
  if (!__DEV__) return Promise.resolve();

  // Generate random delay between minSeconds and maxSeconds
  const totalDelayMs =
    Math.floor(Math.random() * (maxSeconds - minSeconds + 1) + minSeconds) *
    1000;
  console.log(
    `[DEV][mockDelay] Simulating network latency: ${totalDelayMs / 1000}s`
  );

  return new Promise((resolve, reject) => {
    let elapsedTime = 0;
    const intervalTime = 100; // Check every 100ms
    let intervalId: NodeJS.Timeout | null = null;

    const checkCancellation = () => {
      if (cancellationRef.current.cancelled) {
        console.log("[DEV][mockDelay] Delay cancelled.");
        if (intervalId) clearInterval(intervalId);
        reject(new Error("Delay cancelled")); // Reject promise on cancellation
        return true;
      }
      return false;
    };

    if (checkCancellation()) return;

    intervalId = setInterval(() => {
      if (checkCancellation()) return;

      elapsedTime += intervalTime;
      // console.log(`[DEV][mockDelay] Elapsed: ${elapsedTime}ms / ${totalDelayMs}ms`); // Optional: verbose logging

      if (elapsedTime >= totalDelayMs) {
        console.log("[DEV][mockDelay] Delay completed.");
        if (intervalId) clearInterval(intervalId);
        resolve();
      }
    }, intervalTime);
  });
};

export interface SessionCheckResult {
  success: boolean;
  message: string;
  isAttending: boolean;
  sessionId?: string; // Optional session ID when attending a class
  classId?: string; // Add classId here
  cancelled?: boolean; // Add flag for user cancellation
}

export const useClassSessionChecker = () => {
  const [isChecking, setIsChecking] = useState(false);
  const user = useAuthStore((state) => state.user);
  const { location } = useLocation();

  // Store ongoing abort controller
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Cancel any ongoing check operation
   */
  const cancelChecking = useCallback(() => {
    console.log(
      "[useClassSessionChecker] Forcing cancellation of any ongoing checks"
    );

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setIsChecking(false);
  }, []);

  /**
   * Determines if the student is attending a class session based on location
   *
   * @param studentLocation Student's current location
   * @param activeSessions List of active sessions
   * @returns Object containing attendance status and the class being attended (if any)
   */
  const checkAttendanceByLocation = async (
    studentLocation: { latitude: number; longitude: number },
    activeSessions: ActiveSessionData[],
    cancellationRef: React.MutableRefObject<{ cancelled: boolean }>,
    abortSignal: AbortSignal
  ) => {
    // Default values
    let isAttending = false;
    let attendingClass: ClassDetails | null = null;
    let closestDistance = Number.MAX_VALUE;

    // Check each active session to see if student is within attendance radius
    for (const session of activeSessions) {
      // Check for cancellation or abort
      if (cancellationRef.current.cancelled || abortSignal.aborted) {
        console.log(
          "[checkAttendanceByLocation] Cancelled during session loop."
        );
        return { isAttending: false, attendingClass: null, cancelled: true };
      }

      if (session.location) {
        // Log class name for debugging
        const classDetails = await getClassDetails(session.classId);

        // Check again after async call
        if (cancellationRef.current.cancelled || abortSignal.aborted) {
          console.log(
            "[checkAttendanceByLocation] Cancelled after fetching class details."
          );
          return { isAttending: false, attendingClass: null, cancelled: true };
        }

        const className = classDetails?.name || "Unknown Class";

        console.log(`Checking ${className}:`);
        console.log(
          `- Class location: ${session.location.latitude}, ${session.location.longitude}`
        );
        console.log(
          `- User location: ${studentLocation.latitude}, ${studentLocation.longitude}`
        );

        // Calculate distance using Haversine formula
        const distance = calculateDistance(
          {
            latitude: session.location.latitude,
            longitude: session.location.longitude,
          },
          studentLocation
        );

        // Use the helper function directly
        const isWithinRadius = validateLocationForSession(
          session.location,
          studentLocation,
          100 // Default radius of 100 meters, can be adjusted or made dynamic if needed
        );

        console.log(`- Within 100m radius: ${isWithinRadius}`);

        // If within radius and closer than current closest, update
        if (isWithinRadius && distance < closestDistance) {
          closestDistance = distance;
          isAttending = true;
          // Fetch class details only if attending
          attendingClass = classDetails;
          console.log(`✅ Attending ${className}!`);
        }
      }
    }

    if (isAttending && attendingClass) {
      console.log(
        `Selected closest class: ${
          attendingClass.name
        } (${closestDistance.toFixed(2)}m away)`
      );
    }

    return { isAttending, attendingClass, cancelled: false };
  };

  /**
   * Formats an informational message about the student's classes and attendance
   *
   * @param enrolledClasses List of classes the student is enrolled in
   * @param classesWithActiveSessions List of classes with active sessions
   * @param isAttending Whether the student is attending a class
   * @param attendingClass The class the student is attending (if any)
   * @returns Formatted message string
   */
  const formatAttendanceMessage = (
    enrolledClasses: (ClassDetails | null)[],
    classesWithActiveSessions: (ClassDetails | null)[],
    isAttending: boolean,
    attendingClass: ClassDetails | null
  ): string => {
    // First determine the final attendance status message
    let attendanceStatus = "";
    if (isAttending && attendingClass) {
      console.log(
        `ATTENDANCE SUCCESS: Student is attending ${attendingClass.name}.`
      );
      attendanceStatus = `Student is attending ${attendingClass.name}.`;
    } else {
      attendanceStatus = "Student currently doesn't attend any sessions.";

      // Check if there are active sessions but none are in range
      if (classesWithActiveSessions.length > 0) {
        attendanceStatus += " No active classes are within attendance radius.";
      }
    }

    // Then build the detailed information message
    let detailedInfo = "\n\n--- Detailed Information ---\n";

    // Classes student is enrolled in
    detailedInfo += "Student is enrolled in classes:\n";
    if (enrolledClasses.length === 0) {
      detailedInfo += "- None\n";
    } else {
      enrolledClasses
        .filter((cls) => cls !== null)
        .forEach((cls, index) => {
          detailedInfo += `- ${index + 1}. ${cls!.name}\n`;
        });
    }

    // Classes with active sessions
    detailedInfo += "\nClasses that have active sessions:\n";
    if (classesWithActiveSessions.length === 0) {
      detailedInfo += "- None\n";
    } else {
      classesWithActiveSessions
        .filter((cls) => cls !== null)
        .forEach((cls, index) => {
          detailedInfo += `- ${index + 1}. ${cls!.name}\n`;
        });
    }

    // Return only the attendance status for display
    return attendanceStatus;
  };

  const checkSessions = async (
    cancellationRef: React.MutableRefObject<{ cancelled: boolean }>
  ): Promise<SessionCheckResult> => {
    if (!user?.uid) {
      return {
        success: false,
        message: "User not logged in",
        isAttending: false,
      };
    }

    // Cancel any existing check operations
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create a new abort controller for this operation
    abortControllerRef.current = new AbortController();
    const abortSignal = abortControllerRef.current.signal;

    setIsChecking(true);

    try {
      // Check for cancellation early
      if (cancellationRef.current.cancelled || abortSignal.aborted) {
        console.log(
          "[useClassSessionChecker] Check cancelled before starting."
        );
        return {
          success: false,
          message: "Check-in cancelled.",
          isAttending: false,
          cancelled: true,
        };
      }

      // Add mock delay in DEV mode - now interruptible
      try {
        await mockDelay(cancellationRef); // Pass the ref
      } catch (delayError: any) {
        if (delayError.message === "Delay cancelled") {
          // If delay was cancelled, return the cancelled state immediately
          console.log("[useClassSessionChecker] Caught delay cancellation.");
          return {
            success: false,
            message: "Check-in cancelled.",
            isAttending: false,
            cancelled: true,
          };
        } else {
          // Handle other potential errors from mockDelay if any
          throw delayError;
        }
      }

      // Check for cancellation or abort after delay
      if (cancellationRef.current.cancelled || abortSignal.aborted) {
        console.log(
          "[useClassSessionChecker] Check cancelled after initial delay."
        );
        return {
          success: false,
          message: "Check-in cancelled.",
          isAttending: false,
          cancelled: true,
        };
      }

      // Get all classes the student is enrolled in
      const studentClasses: BaseUserClassInfo[] = await getStudentClasses(
        user.uid
      );

      // Check for cancellation
      if (cancellationRef.current.cancelled || abortSignal.aborted) {
        console.log(
          "[useClassSessionChecker] Cancelled after fetching student classes"
        );
        return {
          success: false,
          message: "Check-in cancelled.",
          isAttending: false,
          cancelled: true,
        };
      }

      // Get all active sessions for the student's classes
      const activeSessions: ActiveSessionData[] =
        await getActiveSessionsForStudent(user.uid);

      // Check for cancellation
      if (cancellationRef.current.cancelled || abortSignal.aborted) {
        console.log(
          "[useClassSessionChecker] Cancelled after fetching active sessions"
        );
        return {
          success: false,
          message: "Check-in cancelled.",
          isAttending: false,
          cancelled: true,
        };
      }

      // Get class details for enrolled classes
      const enrolledClassDetailsPromises = studentClasses.map(async (cls) => {
        if (cancellationRef.current.cancelled || abortSignal.aborted)
          return null;

        const details = await getClassDetails(cls.classId);

        if (cancellationRef.current.cancelled || abortSignal.aborted)
          return null;

        return (
          details || {
            classId: cls.classId,
            name: cls.className,
            teacherId: "",
          }
        );
      });

      let enrolledClassDetails: (ClassDetails | null)[] = [];
      if (!cancellationRef.current.cancelled && !abortSignal.aborted) {
        enrolledClassDetails = await Promise.all(enrolledClassDetailsPromises);
        // Filter out nulls potentially caused by cancellation during Promise.all
        enrolledClassDetails = enrolledClassDetails.filter((d) => d !== null);
        // Final check after all details are fetched
        if (cancellationRef.current.cancelled || abortSignal.aborted) {
          console.log(
            "[useClassSessionChecker] Cancelled after fetching enrolled class details."
          );
          return {
            success: false,
            message: "Check-in cancelled.",
            isAttending: false,
            cancelled: true,
          };
        }
      }

      // Get class details for classes with active sessions
      const activeClassDetailsPromises = activeSessions.map(async (session) => {
        if (cancellationRef.current.cancelled || abortSignal.aborted)
          return null;

        const details = await getClassDetails(session.classId);

        if (cancellationRef.current.cancelled || abortSignal.aborted)
          return null;

        return (
          details || {
            classId: session.classId,
            name: "Unknown Class",
            teacherId: "",
          }
        );
      });

      let activeClassDetails: (ClassDetails | null)[] = [];
      if (!cancellationRef.current.cancelled && !abortSignal.aborted) {
        activeClassDetails = await Promise.all(activeClassDetailsPromises);
        activeClassDetails = activeClassDetails.filter((d) => d !== null);
        // Final check after all details are fetched
        if (cancellationRef.current.cancelled || abortSignal.aborted) {
          console.log(
            "[useClassSessionChecker] Cancelled after fetching active class details."
          );
          return {
            success: false,
            message: "Check-in cancelled.",
            isAttending: false,
            cancelled: true,
          };
        }
      }

      // Default values if location check is not possible
      let isAttending = false;
      let attendingClass = null;

      // Check if we have location data
      if (!location) {
        return {
          success: true,
          message:
            "Cannot check attendance: Location data not available. Please ensure location services are enabled.",
          isAttending: false,
        };
      }

      // Check if we have active sessions
      if (activeSessions.length === 0) {
        return {
          success: true,
          message:
            "No active class sessions found. Please wait for your teacher to start a session.",
          isAttending: false,
        };
      }

      // Check attendance based on location if available
      const studentCoords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      const attendanceStatus = await checkAttendanceByLocation(
        studentCoords,
        activeSessions,
        cancellationRef,
        abortSignal
      );

      // Check if checkAttendanceByLocation itself was cancelled
      if (
        attendanceStatus.cancelled ||
        cancellationRef.current.cancelled ||
        abortSignal.aborted
      ) {
        console.log("[useClassSessionChecker] Location check was cancelled.");
        return {
          success: false,
          message: "Check-in cancelled.",
          isAttending: false,
          cancelled: true,
        };
      }

      isAttending = attendanceStatus.isAttending;
      attendingClass = attendanceStatus.attendingClass;

      // Find the session ID for the attending class
      let sessionId = "";
      if (isAttending && attendingClass) {
        const matchingSession = activeSessions.find(
          (session) => session.classId === attendingClass?.classId
        );
        sessionId = matchingSession?.sessionId || "";
      }

      // Format the message
      const message = formatAttendanceMessage(
        enrolledClassDetails,
        activeClassDetails,
        isAttending,
        attendingClass
      );

      // Add check-in logic
      if (isAttending && sessionId && user?.uid) {
        try {
          // Final check before writing to DB
          if (cancellationRef.current.cancelled || abortSignal.aborted) {
            console.log(
              "[useClassSessionChecker] Check cancelled just before writing check-in."
            );
            return {
              success: false,
              message: "Check-in cancelled.",
              isAttending: false,
              cancelled: true,
            };
          }

          console.log(
            `Attempting to automatically check in student ${user.uid} to session ${sessionId}`
          );
          await checkInToSession(sessionId, user.uid, studentCoords);
          console.log(
            `Successfully recorded check-in for student ${user.uid} in session ${sessionId}`
          );
        } catch (checkInError) {
          console.error(
            `Failed to automatically record check-in for session ${sessionId}:`,
            checkInError
          );
          // Decide how to handle this error. Maybe return a specific message or status?
          // For now, we'll log it and continue, but the session check result might be misleading
          // if the check-in failed. Consider adding a specific error state or message.
          return {
            success: false,
            message: `Attendance detected, but failed to record check-in: ${
              (checkInError as Error).message
            }`,
            isAttending: false, // Set to false as check-in failed
          };
        }
      }

      return {
        success: true,
        message,
        isAttending,
        sessionId: isAttending ? sessionId : undefined, // Only return sessionId if attending
        classId: isAttending ? attendingClass?.classId : undefined, // Return classId if attending
      };
    } catch (error) {
      console.error("Error checking sessions:", error);
      // Check if error occurred *after* cancellation
      if (cancellationRef.current.cancelled || abortSignal.aborted) {
        return {
          success: false,
          message: "Check-in cancelled.",
          isAttending: false,
          cancelled: true,
        };
      }
      return {
        success: false,
        message: "Could not check sessions. Please try again.",
        isAttending: false,
      };
    } finally {
      // Clear the abort controller reference
      abortControllerRef.current = null;

      // Only set isChecking to false if not cancelled, to prevent UI flicker if cancel happens fast
      if (!cancellationRef.current.cancelled) {
        setIsChecking(false);
      } else {
        // If cancelled, ensure the loading state is definitively turned off.
        setIsChecking(false);
      }
    }
  };

  return {
    isChecking,
    checkSessions,
    cancelChecking,
  };
};
