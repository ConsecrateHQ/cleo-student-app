import { useState } from "react";
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
import { FirebaseFirestoreTypes } from "@react-native-firebase/firestore";

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
  joinDate: FirebaseFirestoreTypes.Timestamp;
}

interface ActiveSessionData {
  sessionId: string;
  classId: string;
  location: FirebaseFirestoreTypes.GeoPoint | null;
  startTime: FirebaseFirestoreTypes.Timestamp;
}

/**
 * Simulates network latency in DEV mode
 * @param minSeconds Minimum delay in seconds
 * @param maxSeconds Maximum delay in seconds
 * @returns Promise that resolves after the delay
 */
const mockDelay = async (minSeconds = 1, maxSeconds = 7): Promise<void> => {
  // Only simulate delay in DEV mode
  if (!__DEV__) return Promise.resolve();

  // Generate random delay between minSeconds and maxSeconds
  const delayMs =
    Math.floor(Math.random() * (maxSeconds - minSeconds + 1) + minSeconds) *
    1000;
  console.log(`[DEV] Simulating network latency: ${delayMs / 1000}s`);

  return new Promise((resolve) => setTimeout(resolve, delayMs));
};

export interface SessionCheckResult {
  success: boolean;
  message: string;
  isAttending: boolean;
  sessionId?: string; // Optional session ID when attending a class
}

export const useClassSessionChecker = () => {
  const [isChecking, setIsChecking] = useState(false);
  const user = useAuthStore((state) => state.user);
  const { location } = useLocation();

  /**
   * Determines if the student is attending a class session based on location
   *
   * @param studentLocation Student's current location
   * @param activeSessions List of active sessions
   * @returns Object containing attendance status and the class being attended (if any)
   */
  const checkAttendanceByLocation = async (
    studentLocation: { latitude: number; longitude: number },
    activeSessions: ActiveSessionData[]
  ) => {
    // Default values
    let isAttending = false;
    let attendingClass: ClassDetails | null = null;
    let closestDistance = Number.MAX_VALUE;

    // Check each active session to see if student is within attendance radius
    for (const session of activeSessions) {
      if (session.location) {
        // Log class name for debugging
        const classDetails = await getClassDetails(session.classId);
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

    return { isAttending, attendingClass };
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
    enrolledClasses: ClassDetails[],
    classesWithActiveSessions: ClassDetails[],
    isAttending: boolean,
    attendingClass: ClassDetails | null
  ): string => {
    // First determine the final attendance status message
    let attendanceStatus = "";
    if (isAttending && attendingClass) {
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
      enrolledClasses.forEach((cls, index) => {
        detailedInfo += `- ${index + 1}. ${cls.name}\n`;
      });
    }

    // Classes with active sessions
    detailedInfo += "\nClasses that have active sessions:\n";
    if (classesWithActiveSessions.length === 0) {
      detailedInfo += "- None\n";
    } else {
      classesWithActiveSessions.forEach((cls, index) => {
        detailedInfo += `- ${index + 1}. ${cls.name}\n`;
      });
    }

    // Return only the attendance status for display
    return attendanceStatus;
  };

  const checkSessions = async (): Promise<SessionCheckResult> => {
    if (!user?.uid) {
      return {
        success: false,
        message: "User not logged in",
        isAttending: false,
      };
    }

    setIsChecking(true);

    try {
      // Add mock delay in DEV mode to simulate network latency
      await mockDelay();

      // Get all classes the student is enrolled in
      const studentClasses: BaseUserClassInfo[] = await getStudentClasses(
        user.uid
      );

      // Get all active sessions for the student's classes
      const activeSessions: ActiveSessionData[] =
        await getActiveSessionsForStudent(user.uid);

      // Get class details for enrolled classes
      const enrolledClassDetails: ClassDetails[] = await Promise.all(
        studentClasses.map(async (cls) => {
          const details = await getClassDetails(cls.classId);
          return (
            details || {
              classId: cls.classId,
              name: cls.className,
              teacherId: "",
            }
          );
        })
      );

      // Get class details for classes with active sessions
      const activeClassDetails: ClassDetails[] = await Promise.all(
        activeSessions.map(async (session) => {
          const details = await getClassDetails(session.classId);
          return (
            details || {
              classId: session.classId,
              name: "Unknown Class",
              teacherId: "",
            }
          );
        })
      );

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
        activeSessions
      );

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

      // --- Add check-in logic ---
      if (isAttending && sessionId && user?.uid) {
        try {
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
      // --- End of added logic ---

      return {
        success: true,
        message,
        isAttending,
        sessionId,
      };
    } catch (error) {
      console.error("Error checking sessions:", error);
      return {
        success: false,
        message: "Could not check sessions. Please try again.",
        isAttending: false,
      };
    } finally {
      setIsChecking(false);
    }
  };

  return {
    isChecking,
    checkSessions,
  };
};
