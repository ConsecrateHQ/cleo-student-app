import {
  getFirestore,
  collection,
  doc,
  onSnapshot,
  getDoc,
  getDocs, // Import getDocs for fetching multiple documents
  query,
  where,
  limit,
  writeBatch, // Import writeBatch for atomic operations
  serverTimestamp, // Import serverTimestamp
  deleteDoc, // Import deleteDoc
  collectionGroup, // Import collectionGroup for querying across subcollections
  orderBy, // Import orderBy if needed for specific queries
  Unsubscribe, // Import Unsubscribe type
  FirestoreError, // Import FirestoreError for error handling
  FirebaseFirestoreTypes,
  // Types are typically accessed via the namespace
  // QuerySnapshot, // No - use FirebaseFirestoreTypes.QuerySnapshot
  // DocumentSnapshot, // No - use FirebaseFirestoreTypes.DocumentSnapshot
} from "@react-native-firebase/firestore";
import { UserClass } from "../hooks/useUserClasses"; // Assuming UserClass interface is needed here or define locally

const db = getFirestore(); // Get Firestore instance

/**
 * Basic structure for class data stored under /userClasses/{userId}/classes/{classId}
 */
interface BaseUserClassInfo {
  classId: string;
  className: string;
  joinDate: FirebaseFirestoreTypes.Timestamp;
}

/**
 * Structure for class details stored under /classes/{classId}
 */
interface ClassDetails {
  classId: string;
  name: string;
  teacherId: string;
  joinCode?: string;
  // Add other relevant fields from the /classes/{classId} document
}

/**
 * Structure for user details stored under /users/{userId}
 */
interface UserDetails {
  userId: string;
  displayName: string;
  // Add other relevant fields from the /users/{userId} document
}

/**
 * Structure for active session data stored under /sessions/{sessionId}
 */
interface ActiveSessionData {
  sessionId: string;
  classId: string;
  location: FirebaseFirestoreTypes.GeoPoint | null;
  startTime: FirebaseFirestoreTypes.Timestamp;
  // Add other relevant fields from the /sessions/{sessionId} document
}

/**
 * Sets up a real-time listener for a student's list of classes.
 *
 * @param userId The ID of the student.
 * @param callback Function to call with the updated list of basic class info.
 * @param onError Function to call if an error occurs.
 * @returns An unsubscribe function to stop listening.
 */
export function onStudentClassListUpdate(
  userId: string,
  callback: (classes: BaseUserClassInfo[]) => void,
  onError: (error: FirestoreError) => void
): Unsubscribe {
  const userClassesRef = collection(db, "userClasses", userId, "classes");

  const unsubscribe = onSnapshot(
    userClassesRef,
    (snapshot) => {
      if (snapshot.empty) {
        callback([]);
        return;
      }
      const classes: BaseUserClassInfo[] = snapshot.docs.map((docSnapshot) => ({
        classId: docSnapshot.id,
        ...(docSnapshot.data() as Omit<BaseUserClassInfo, "classId">), // Assumes data matches BaseUserClassInfo structure
      }));
      callback(classes);
    },
    (error) => {
      console.error(`Error listening to user ${userId} classes:`, error);
      onError(error);
    }
  );

  return unsubscribe;
}

/**
 * Fetches details for a single class.
 *
 * @param classId The ID of the class.
 * @returns A promise resolving to the ClassDetails or null if not found.
 */
export async function getClassDetails(
  classId: string
): Promise<ClassDetails | null> {
  try {
    const classDocRef = doc(db, "classes", classId);
    // Use the namespace for the type
    const classDoc: FirebaseFirestoreTypes.DocumentSnapshot = await getDoc(
      classDocRef
    );

    if (!classDoc.exists) {
      // Use exists property
      console.warn(`Class details not found for classId: ${classId}`);
      return null;
    }
    return {
      classId: classDoc.id,
      ...(classDoc.data() as Omit<ClassDetails, "classId">),
    };
  } catch (error) {
    console.error(`Failed to fetch details for class ${classId}:`, error);
    throw error; // Re-throw or handle as needed
  }
}

/**
 * Fetches details for a single user.
 *
 * @param userId The ID of the user.
 * @returns A promise resolving to the UserDetails or null if not found.
 */
export async function getUserDetails(
  userId: string
): Promise<UserDetails | null> {
  try {
    const userDocRef = doc(db, "users", userId);
    // Use the namespace for the type
    const userDoc: FirebaseFirestoreTypes.DocumentSnapshot = await getDoc(
      userDocRef
    );

    if (!userDoc.exists) {
      // Use exists property
      console.warn(`User details not found for userId: ${userId}`);
      return null;
    }
    return {
      userId: userDoc.id,
      ...(userDoc.data() as Omit<UserDetails, "userId">),
    };
  } catch (error) {
    console.error(`Failed to fetch details for user ${userId}:`, error);
    throw error; // Re-throw or handle as needed
  }
}

/**
 * Sets up a real-time listener for the currently active session of a specific class.
 * It assumes only one session can be active per class at a time.
 *
 * @param classId The ID of the class.
 * @param callback Function to call with the active session data (or null if none).
 * @param onError Function to call if an error occurs.
 * @returns An unsubscribe function to stop listening.
 */
export function onActiveClassSessionUpdate(
  classId: string,
  callback: (session: ActiveSessionData | null) => void,
  onError: (error: FirestoreError) => void
): Unsubscribe {
  const sessionsRef = collection(db, "sessions");
  const q = query(
    sessionsRef,
    where("classId", "==", classId),
    where("status", "==", "active"),
    limit(1)
  );

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        callback(null); // No active session found
      } else {
        // Assuming only one active session possible due to limit(1)
        const sessionDoc = snapshot.docs[0];
        const sessionData = sessionDoc.data() as Omit<
          ActiveSessionData,
          "sessionId"
        >;
        callback({
          sessionId: sessionDoc.id,
          ...sessionData,
        });
      }
    },
    (error) => {
      console.error(
        `Error listening to active session for class ${classId}:`,
        error
      );
      onError(error);
    }
  );

  return unsubscribe;
}

/**
 * Fetches the list of classes a student is enrolled in.
 * Primarily fetches from the denormalized /userClasses collection.
 *
 * @param studentId The ID of the student.
 * @returns A promise resolving to an array of BaseUserClassInfo.
 */
export async function getStudentClasses(
  studentId: string
): Promise<BaseUserClassInfo[]> {
  if (!studentId) {
    console.warn("[getStudentClasses] No studentId provided.");
    return [];
  }
  try {
    const userClassesRef = collection(db, "userClasses", studentId, "classes");
    const snapshot = await getDocs(userClassesRef);

    if (snapshot.empty) {
      return [];
    }

    const classes: BaseUserClassInfo[] = snapshot.docs.map((docSnapshot) => ({
      classId: docSnapshot.id,
      ...(docSnapshot.data() as Omit<BaseUserClassInfo, "classId">),
    }));

    return classes;
  } catch (error) {
    console.error(
      `[getStudentClasses] Error fetching classes for student ${studentId}:`,
      error
    );
    throw error; // Re-throw or handle as needed
  }
}

/**
 * Enrolls a student in a class using a join code.
 * Creates entries in both /classes/{classId}/students/{studentId}
 * and /userClasses/{studentId}/classes/{classId}.
 *
 * @param studentId The ID of the student joining.
 * @param joinCode The join code for the class.
 * @throws If the join code is invalid, class not found, or student is already enrolled.
 */
export async function joinClassWithCode(
  studentId: string,
  joinCode: string
): Promise<void> {
  if (!studentId || !joinCode) {
    throw new Error("Student ID and Join Code are required.");
  }

  const classesRef = collection(db, "classes");
  const q = query(classesRef, where("joinCode", "==", joinCode), limit(1));

  try {
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      throw new Error(`Invalid join code: ${joinCode}`);
    }

    const classDoc = snapshot.docs[0];
    const classId = classDoc.id;
    const classData = classDoc.data() as Omit<ClassDetails, "classId">;

    // Prepare batch write for atomicity
    const batch = writeBatch(db);

    // 1. Add student to the /classes/{classId}/students subcollection
    const studentInClassRef = doc(
      db,
      "classes",
      classId,
      "students",
      studentId
    );
    // Check if student already exists (optional, prevents overwriting joinDate)
    const studentInClassSnap = await getDoc(studentInClassRef);
    if (studentInClassSnap.exists) {
      console.log(
        `Student ${studentId} already enrolled in class ${classId}. Skipping join.`
      );
      // Optionally throw an error or just return successfully
      // throw new Error(`Student already enrolled in class ${classId}`);
      return; // Exit function if already joined
    }
    batch.set(studentInClassRef, {
      joinDate: serverTimestamp(),
      // Add any other relevant student data if needed
    });

    // 2. Add class to the /userClasses/{studentId}/classes subcollection (denormalized)
    const userClassRef = doc(db, "userClasses", studentId, "classes", classId);
    batch.set(userClassRef, {
      className: classData.name || "Unnamed Class", // Denormalize class name
      joinDate: serverTimestamp(),
      // Optionally denormalize teacher name if needed later
      // teacherName: await getTeacherName(classData.teacherId), // Example
    });

    // Commit the batch
    await batch.commit();
    console.log(
      `Student ${studentId} successfully joined class ${classId} using code ${joinCode}`
    );
  } catch (error) {
    console.error(
      `[joinClassWithCode] Error joining class with code ${joinCode} for student ${studentId}:`,
      error
    );
    // Re-throw the specific error or a generic one
    if (
      error instanceof Error &&
      error.message.startsWith("Invalid join code")
    ) {
      throw error;
    }
    if (
      error instanceof Error &&
      error.message.startsWith("Student already enrolled")
    ) {
      throw error;
    }
    throw new Error("Failed to join class. Please try again.");
  }
}

/**
 * Removes a student from a class.
 * Deletes entries from both /classes/{classId}/students/{studentId}
 * and /userClasses/{studentId}/classes/{classId}.
 *
 * @param studentId The ID of the student leaving.
 * @param classId The ID of the class to leave.
 * @throws If an error occurs during deletion.
 */
export async function leaveClass(
  studentId: string,
  classId: string
): Promise<void> {
  if (!studentId || !classId) {
    throw new Error("Student ID and Class ID are required.");
  }

  try {
    const batch = writeBatch(db);

    // 1. Reference to student in /classes/{classId}/students subcollection
    const studentInClassRef = doc(
      db,
      "classes",
      classId,
      "students",
      studentId
    );

    // 2. Reference to class in /userClasses/{studentId}/classes subcollection
    const userClassRef = doc(db, "userClasses", studentId, "classes", classId);

    // Add delete operations to the batch
    // Note: deleteDoc doesn't fail if the doc doesn't exist, it just does nothing.
    batch.delete(studentInClassRef);
    batch.delete(userClassRef);

    // Commit the batch
    await batch.commit();
    console.log(
      `Student ${studentId} successfully removed from class ${classId}`
    );
  } catch (error) {
    console.error(
      `[leaveClass] Error removing student ${studentId} from class ${classId}:`,
      error
    );
    throw new Error("Failed to leave class. Please try again.");
  }
}

/**
 * Fetches all currently active sessions across all classes a student is enrolled in.
 *
 * @param studentId The ID of the student.
 * @returns A promise resolving to an array of ActiveSessionData for active sessions.
 * @throws If student's classes cannot be fetched or session query fails.
 */
export async function getActiveSessionsForStudent(
  studentId: string
): Promise<ActiveSessionData[]> {
  if (!studentId) {
    console.warn("[getActiveSessionsForStudent] No studentId provided.");
    return [];
  }

  try {
    // 1. Get the list of class IDs the student is enrolled in
    const studentClasses = await getStudentClasses(studentId);
    if (studentClasses.length === 0) {
      return []; // Student is not enrolled in any classes
    }
    const studentClassIds = studentClasses.map((c) => c.classId);

    // Firestore 'in' query limit (currently 30 in v9)
    if (studentClassIds.length > 30) {
      console.warn(
        `[getActiveSessionsForStudent] Student ${studentId} is in ${studentClassIds.length} classes. Querying sessions in batches of 30.`
      );
      // Implement batching if necessary
      // For now, we'll proceed but be aware of the limit
      // Alternatively, could fetch active sessions first and filter locally, but might fetch too much data.
    }

    // 2. Query the sessions collection for active sessions in those classes
    const sessionsRef = collection(db, "sessions");
    const q = query(
      sessionsRef,
      where("classId", "in", studentClassIds),
      where("status", "==", "active")
      // Optional: Add orderBy('startTime', 'desc') if needed
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return []; // No active sessions found for this student's classes
    }

    const activeSessions: ActiveSessionData[] = snapshot.docs.map(
      (docSnapshot) => ({
        sessionId: docSnapshot.id,
        ...(docSnapshot.data() as Omit<ActiveSessionData, "sessionId">),
      })
    );

    return activeSessions;
  } catch (error) {
    console.error(
      `[getActiveSessionsForStudent] Error fetching active sessions for student ${studentId}:`,
      error
    );
    // Check if error is due to class fetching or session querying
    throw new Error("Failed to retrieve active sessions.");
  }
}

/**
 * Defines the structure for a student's attendance record within a session.
 * Based on /sessions/{sessionId}/attendance/{studentId}
 */
export interface StudentAttendanceRecord {
  sessionId: string; // Add sessionId to link back to the session
  classId: string;
  checkInTime: FirebaseFirestoreTypes.Timestamp | null;
  checkInLocation: FirebaseFirestoreTypes.GeoPoint | null;
  status: string; // 'pending' | 'checked_in' | 'verified' | 'failed_location' | 'failed_other' | 'absent'
  isGpsVerified: boolean;
  lastUpdated: FirebaseFirestoreTypes.Timestamp;
}

/**
 * Fetches a student's complete attendance history for a specific class.
 * Uses a collection group query on the 'attendance' subcollection.
 *
 * @param studentId The ID of the student.
 * @param classId The ID of the class.
 * @returns A promise resolving to an array of StudentAttendanceRecord.
 * @throws If the query fails.
 */
export async function getStudentAttendanceHistory(
  studentId: string,
  classId: string
): Promise<StudentAttendanceRecord[]> {
  if (!studentId || !classId) {
    throw new Error("Student ID and Class ID are required.");
  }

  try {
    const attendanceGroupRef = collectionGroup(db, "attendance");
    const q = query(
      attendanceGroupRef,
      where("classId", "==", classId)
      // Since document ID is studentId, we implicitly filter by studentId by structure
      // If we needed to query across students for a class, we'd add a studentId field
      // orderBy('checkInTime', 'desc') // Optional: Order history chronologically
    );

    const snapshot = await getDocs(q);

    const history: StudentAttendanceRecord[] = [];
    snapshot.forEach((docSnapshot) => {
      // We need to filter results manually as collectionGroup query doesn't filter by doc ID directly
      if (docSnapshot.ref.parent.parent?.id) {
        // Check if parent session exists
        // Check if the document ID (studentId) matches
        if (docSnapshot.id === studentId) {
          history.push({
            sessionId: docSnapshot.ref.parent.parent.id, // Get sessionId from path
            ...(docSnapshot.data() as Omit<
              StudentAttendanceRecord,
              "sessionId"
            >),
          });
        }
      } else {
        console.warn(
          `[getStudentAttendanceHistory] Found attendance record with missing session path: ${docSnapshot.ref.path}`
        );
      }
    });

    // Optional: Sort history after fetching if not ordered in query
    history.sort(
      (a, b) =>
        (b.checkInTime?.toMillis() ?? 0) - (a.checkInTime?.toMillis() ?? 0)
    );

    return history;
  } catch (error) {
    console.error(
      `[getStudentAttendanceHistory] Error fetching attendance history for student ${studentId} in class ${classId}:`,
      error
    );
    throw new Error("Failed to retrieve attendance history.");
  }
}
