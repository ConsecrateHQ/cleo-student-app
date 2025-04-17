// app/hooks/useUserClasses.ts
import { useEffect, useState } from "react";
// Import modular functions from Firestore v9+ SDK
import {
  getFirestore,
  collection,
  doc,
  onSnapshot, // Import onSnapshot
  getDoc, // Import getDoc
  query, // Import query
  where, // Import where
  limit, // Import limit
  FirebaseFirestoreTypes,
} from "@react-native-firebase/firestore";

export interface UserClass {
  classId: string;
  className: string;
  teacherName?: string;
  joinDate: FirebaseFirestoreTypes.Timestamp;
  joinCode?: string;
  hasActiveSession?: boolean;
  location?: FirebaseFirestoreTypes.GeoPoint | null;
  sessionId?: string; // Optional: Store the ID of the active session
}

export function useUserClasses(userId: string | undefined) {
  const [classes, setClasses] = useState<UserClass[]>([]);
  const [loading, setLoading] = useState(true);
  const db = getFirestore(); // Get Firestore instance once

  useEffect(() => {
    if (!userId) {
      setClasses([]);
      setLoading(false);
      return () => {}; // Return an empty cleanup function
    }

    setLoading(true);
    let sessionListeners: (() => void)[] = []; // To store unsubscribe functions for sessions

    // --- Listener for the user's list of classes (v9 syntax) ---
    const userClassesRef = collection(db, "userClasses", userId, "classes");
    const userClassesUnsubscribe = onSnapshot(
      userClassesRef, // Use the v9 reference
      async (userClassesSnapshot) => {
        // --- Cleanup previous session listeners ---
        sessionListeners.forEach((unsubscribe) => unsubscribe());
        sessionListeners = [];
        // ---

        if (userClassesSnapshot.empty) {
          setClasses([]);
          setLoading(false); // Stop loading if user has no classes
          return;
        }

        // Initial fetch of class details (v9 syntax)
        const classDetailsPromises = userClassesSnapshot.docs.map(
          async (docSnapshot) => {
            // Changed variable name from doc to docSnapshot for clarity
            const classId = docSnapshot.id;
            const userClassData = docSnapshot.data();

            // Fetch class details using v9 getDoc
            const classDocRef = doc(db, "classes", classId);
            const classDoc = await getDoc(classDocRef);

            if (!classDoc.exists) return null; // Use exists property
            const classData = classDoc.data() || {};

            // Fetch teacher name using teacherId (v9 syntax)
            let teacherName = "Unknown Teacher";
            if (classData.teacherId) {
              try {
                const teacherDocRef = doc(db, "users", classData.teacherId);
                const teacherDoc = await getDoc(teacherDocRef);
                if (teacherDoc.exists) {
                  // Use exists property
                  teacherName = teacherDoc.data()?.displayName || teacherName;
                }
              } catch (error) {
                console.error(
                  `Failed to fetch teacher ${classData.teacherId} for class ${classId}:`,
                  error
                );
              }
            }

            return {
              classId,
              className:
                userClassData.className || classData.name || "Unnamed Class",
              teacherName: teacherName,
              joinDate: userClassData.joinDate,
              joinCode: classData.joinCode,
              hasActiveSession: false,
              location: null,
              sessionId: undefined,
            } as UserClass;
          }
        );

        let initialClassData = (await Promise.all(classDetailsPromises)).filter(
          Boolean
        ) as UserClass[];

        // Update state with initial data (sessions might not be loaded yet)
        setClasses(initialClassData);

        // --- Setup real-time listeners for ACTIVE sessions for each class (v9 syntax) ---
        initialClassData.forEach((classInfo) => {
          const sessionsCollectionRef = collection(db, "sessions");
          const sessionQuery = query(
            // Use v9 query builder
            sessionsCollectionRef,
            where("classId", "==", classInfo.classId),
            where("status", "==", "active"),
            limit(1)
          );

          const sessionUnsubscribe = onSnapshot(
            // Use v9 onSnapshot
            sessionQuery,
            (sessionSnapshot) => {
              const hasActiveSession = !sessionSnapshot.empty;
              let location: FirebaseFirestoreTypes.GeoPoint | null = null;
              let sessionId: string | undefined = undefined;

              if (hasActiveSession) {
                const sessionData = sessionSnapshot.docs[0].data();
                location = sessionData.location || null;
                sessionId = sessionSnapshot.docs[0].id;
              }

              setClasses((prevClasses) =>
                prevClasses.map((cls) =>
                  cls.classId === classInfo.classId
                    ? { ...cls, hasActiveSession, location, sessionId }
                    : cls
                )
              );

              setLoading(false);
            },
            (error) => {
              console.error(
                `Error listening to sessions for class ${classInfo.classId}:`,
                error
              );
              setLoading(false);
            }
          );
          sessionListeners.push(sessionUnsubscribe);
        });
      },
      (error) => {
        console.error("Error fetching user classes:", error);
        // --- Cleanup previous session listeners on error ---
        sessionListeners.forEach((unsubscribe) => unsubscribe());
        sessionListeners = [];
        // ---
        setClasses([]);
        setLoading(false);
      }
    );

    // Cleanup function for the main effect
    return () => {
      userClassesUnsubscribe(); // Unsubscribe from userClasses
      sessionListeners.forEach((unsubscribe) => unsubscribe()); // Unsubscribe from all session listeners
    };
  }, [userId, db]); // Add db to dependency array

  return { classes, loading };
}
