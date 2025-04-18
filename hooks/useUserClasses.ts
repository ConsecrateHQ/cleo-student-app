// app/hooks/useUserClasses.ts
import { useEffect, useState, useRef, useCallback } from "react";
import {
  getFirestore,
  FirebaseFirestoreTypes,
} from "@react-native-firebase/firestore";
import {
  onStudentClassListUpdate,
  getClassDetails,
  getUserDetails,
  onActiveClassSessionUpdate,
  // Assuming these types were defined in the helpers file or we define them here
  // BaseUserClassInfo, ClassDetails, UserDetails, ActiveSessionData
} from "../utils/firebaseClassSessionHelpers"; // Adjust path as necessary

// Keep the UserClass interface definition here as it represents the hook's output structure
export interface UserClass {
  classId: string;
  className: string;
  teacherName?: string;
  joinDate: FirebaseFirestoreTypes.Timestamp;
  joinCode?: string;
  hasActiveSession: boolean;
  location?: FirebaseFirestoreTypes.GeoPoint | null;
  sessionId?: string;
}

export function useUserClasses(userId: string | undefined) {
  const [classes, setClasses] = useState<UserClass[]>([]);
  const [loading, setLoading] = useState(true);
  const db = getFirestore(); // Firestore instance might not be needed directly if helpers handle it

  // Ref to store unsubscribe functions for active session listeners
  const sessionListenersRef = useRef<{ [classId: string]: () => void }>({});

  // Define error handler
  const handleSubscriptionError = useCallback((error: any) => {
    console.error("Subscription Error:", error);
    // Potentially update state to show an error message to the user
    setLoading(false);
    setClasses([]);
  }, []);

  useEffect(() => {
    if (!userId) {
      setClasses([]);
      setLoading(false);
      // Clear any existing session listeners if user logs out
      Object.values(sessionListenersRef.current).forEach((unsubscribe) =>
        unsubscribe()
      );
      sessionListenersRef.current = {};
      return () => {};
    }

    console.log(`[useUserClasses] Setting up listeners for userId: ${userId}`);
    setLoading(true);

    // Store the main class list unsubscribe function
    let userClassesUnsubscribe: (() => void) | null = null;

    // --- Listener for the user's list of classes using helper ---
    userClassesUnsubscribe = onStudentClassListUpdate(
      userId,
      async (baseClassesInfo) => {
        console.log(
          `[useUserClasses] Received base class list update: ${baseClassesInfo.length} classes`
        );
        // --- Cleanup previous session listeners ---
        const previousClassIds = Object.keys(sessionListenersRef.current);
        const newClassIds = baseClassesInfo.map((c) => c.classId);
        previousClassIds.forEach((classId) => {
          if (
            !newClassIds.includes(classId) &&
            sessionListenersRef.current[classId]
          ) {
            console.log(
              `[useUserClasses] Unsubscribing from session listener for removed class: ${classId}`
            );
            sessionListenersRef.current[classId]();
            delete sessionListenersRef.current[classId];
          }
        });
        // --- Fetch details and set up new session listeners ---
        if (baseClassesInfo.length === 0) {
          console.log("[useUserClasses] User has no classes.");
          setClasses([]);
          setLoading(false);
          return;
        }

        // Fetch static details (class info, teacher name) for all classes concurrently
        const detailedClassesPromises = baseClassesInfo.map(
          async (baseInfo) => {
            try {
              const classDetails = await getClassDetails(baseInfo.classId);
              if (!classDetails) return null; // Class document might not exist yet or was deleted

              let teacherName = "Unknown Teacher";
              if (classDetails.teacherId) {
                const teacherDetails = await getUserDetails(
                  classDetails.teacherId
                );
                teacherName = teacherDetails?.displayName || teacherName;
              }

              // Initial structure, session details will be added via listener
              return {
                ...baseInfo, // Includes classId, className from userClasses subcollection
                className: classDetails.name || baseInfo.className, // Prefer name from /classes if available
                teacherName: teacherName,
                joinCode: classDetails.joinCode,
                hasActiveSession: false, // Default, will be updated by listener
                location: null,
                sessionId: undefined,
              } as UserClass;
            } catch (error) {
              console.error(
                `[useUserClasses] Error fetching details for class ${baseInfo.classId}:`,
                error
              );
              return null; // Exclude this class if details fetching fails
            }
          }
        );

        let initialClassData = (
          await Promise.all(detailedClassesPromises)
        ).filter(Boolean) as UserClass[];

        // Update state with initial data (session status might be stale initially)
        // Preserve existing session status if the class was already present
        setClasses((prevClasses) => {
          const prevClassMap = new Map(prevClasses.map((c) => [c.classId, c]));
          return initialClassData.map((newClass) => {
            const existingClass = prevClassMap.get(newClass.classId);
            return existingClass
              ? {
                  ...newClass,
                  hasActiveSession: existingClass.hasActiveSession,
                  location: existingClass.location,
                  sessionId: existingClass.sessionId,
                }
              : newClass;
          });
        });

        // --- Setup/update real-time listeners for ACTIVE sessions ---
        initialClassData.forEach((classInfo) => {
          // Only set up listener if it doesn't exist already
          if (!sessionListenersRef.current[classInfo.classId]) {
            console.log(
              `[useUserClasses] Setting up session listener for class: ${classInfo.classId}`
            );
            const sessionUnsubscribe = onActiveClassSessionUpdate(
              classInfo.classId,
              (activeSession) => {
                console.log(
                  `[useUserClasses] Active session update for class ${classInfo.classId}:`,
                  activeSession
                    ? `Session ID: ${activeSession.sessionId}`
                    : "No active session"
                );
                setClasses((prevClasses) =>
                  prevClasses.map((cls) =>
                    cls.classId === classInfo.classId
                      ? {
                          ...cls,
                          hasActiveSession: !!activeSession,
                          location: activeSession?.location || null,
                          sessionId: activeSession?.sessionId || undefined,
                        }
                      : cls
                  )
                );
                // Consider setting loading to false only after first session update batch completes?
                // For simplicity, we set it false once after initial details fetch is done.
              },
              (error) => {
                console.error(
                  `Error listening to sessions for class ${classInfo.classId}:`,
                  error
                );
                // Optionally remove the class or show an error state for it
                // Ensure loading is false even if a session listener fails
                setLoading(false);
              }
            );
            sessionListenersRef.current[classInfo.classId] = sessionUnsubscribe;
          }
        });
        // Initial data fetch complete, subsequent updates handled by listeners
        setLoading(false);
      },
      handleSubscriptionError // Pass the error handler
    );

    // Cleanup function for the main effect
    return () => {
      console.log(
        `[useUserClasses] Cleaning up listeners for userId: ${userId}`
      );
      if (userClassesUnsubscribe) {
        userClassesUnsubscribe();
        console.log("[useUserClasses] Unsubscribed from user classes list.");
      }
      // Unsubscribe from all active session listeners
      Object.values(sessionListenersRef.current).forEach((unsubscribe) =>
        unsubscribe()
      );
      sessionListenersRef.current = {};
      console.log("[useUserClasses] Unsubscribed from all session listeners.");
    };
  }, [userId, handleSubscriptionError]); // db removed as dependency if not used directly

  return { classes, loading };
}
