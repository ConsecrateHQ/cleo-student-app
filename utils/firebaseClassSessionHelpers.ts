import {
  collection,
  doc,
  onSnapshot,
  getDoc,
  getDocs,
  query,
  where,
  limit,
  writeBatch,
  serverTimestamp,
  deleteDoc,
  collectionGroup,
  orderBy,
  Unsubscribe,
  FirestoreError,
  DocumentSnapshot,
  updateDoc,
  setDoc,
  GeoPoint,
  Timestamp,
  FieldValue,
} from "firebase/firestore";
import { webDb } from "./firebaseConfig";
import { UserClass } from "../hooks/useUserClasses";
import {
  validateLocationForSession,
  isWithinRadius,
  calculateDistance,
} from "../utils/locationHelpers";

/**
 * Basic structure for class data stored under /userClasses/{userId}/classes/{classId}
 */
interface BaseUserClassInfo {
  classId: string;
  className: string;
  joinDate: Timestamp;
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
  location: GeoPoint | null;
  startTime: Timestamp;
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
  const userClassesRef = collection(webDb, "userClasses", userId, "classes");

  const unsubscribe = onSnapshot(
    userClassesRef,
    (snapshot) => {
      if (snapshot.empty) {
        callback([]);
        return;
      }
      const classes: BaseUserClassInfo[] = snapshot.docs.map((docSnapshot) => ({
        classId: docSnapshot.id,
        ...(docSnapshot.data() as Omit<BaseUserClassInfo, "classId">),
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
    const classDocRef = doc(webDb, "classes", classId);
    const classDoc: DocumentSnapshot = await getDoc(classDocRef);

    if (!classDoc.exists()) {
      console.warn(`Class details not found for classId: ${classId}`);
      return null;
    }
    return {
      classId: classDoc.id,
      ...(classDoc.data() as Omit<ClassDetails, "classId">),
    };
  } catch (error) {
    console.error(`Failed to fetch details for class ${classId}:`, error);
    throw error;
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
    const userDocRef = doc(webDb, "users", userId);
    const userDoc: DocumentSnapshot = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      console.warn(`User details not found for userId: ${userId}`);
      return null;
    }
    return {
      userId: userDoc.id,
      ...(userDoc.data() as Omit<UserDetails, "userId">),
    };
  } catch (error) {
    console.error(`Failed to fetch details for user ${userId}:`, error);
    throw error;
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
  const sessionsRef = collection(webDb, "sessions");
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
        callback(null);
      } else {
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
    const userClassesRef = collection(
      webDb,
      "userClasses",
      studentId,
      "classes"
    );
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
    throw error;
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
    console.error("Student ID and Join Code are required.");
    throw new Error("Student ID and Join Code are required.");
  }

  console.log(
    `Student ${studentId} attempting to join class with code ${joinCode}`
  );

  try {
    const classesRef = collection(webDb, "classes");
    const q = query(classesRef, where("joinCode", "==", joinCode), limit(1));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.error(`No class found with join code: ${joinCode}`);
      throw new Error("Invalid join code.");
    }

    const classDoc = querySnapshot.docs[0];
    const classData = classDoc.data() as Omit<ClassDetails, "classId">;
    const classId = classDoc.id;
    const className = classData.name;

    console.log(`Found class: ${className} (ID: ${classId})`);

    const userClassDocRef = doc(
      webDb,
      `userClasses/${studentId}/classes/${classId}`
    );
    const userClassDoc = await getDoc(userClassDocRef);
    if (userClassDoc.exists()) {
      console.warn(
        `Student ${studentId} is already enrolled in class ${classId}`
      );
      return;
    }

    const batch = writeBatch(webDb);

    const userClassData = {
      className: className,
      joinDate: serverTimestamp(),
    };

    batch.set(userClassDocRef, userClassData);

    await batch.commit();
    console.log(
      `Successfully added student ${studentId} to class ${className} (ID: ${classId})`
    );
  } catch (error) {
    console.error("Error joining class with code:", error);
    throw error;
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
    console.error("Student ID and Class ID are required.");
    throw new Error("Student ID and Class ID are required.");
  }

  console.log(`Student ${studentId} attempting to leave class ${classId}`);

  try {
    const userClassDocRef = doc(
      webDb,
      `userClasses/${studentId}/classes/${classId}`
    );

    const docSnap = await getDoc(userClassDocRef);
    if (!docSnap.exists()) {
      console.warn(
        `Student ${studentId} is not enrolled in class ${classId}, cannot leave.`
      );
      return;
    }

    const batch = writeBatch(webDb);

    batch.delete(userClassDocRef);

    await batch.commit();
    console.log(
      `Successfully removed student ${studentId} from class ${classId}`
    );
  } catch (error) {
    console.error("Error leaving class:", error);
    throw error;
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
    const studentClasses = await getStudentClasses(studentId);
    if (studentClasses.length === 0) {
      return [];
    }
    const studentClassIds = studentClasses.map((c) => c.classId);

    if (studentClassIds.length > 30) {
      console.warn(
        `[getActiveSessionsForStudent] Student ${studentId} is in ${studentClassIds.length} classes. Querying sessions in batches of 30.`
      );
    }

    const sessionsRef = collection(webDb, "sessions");
    const q = query(
      sessionsRef,
      where("classId", "in", studentClassIds),
      where("status", "==", "active")
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return [];
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
    throw new Error("Failed to retrieve active sessions.");
  }
}

/**
 * Defines the structure for a student's attendance record within a session.
 * Based on /sessions/{sessionId}/attendance/{studentId}
 */
export interface StudentAttendanceRecord {
  sessionId: string;
  classId: string;
  checkInTime: Timestamp | FieldValue | null;
  checkInLocation: GeoPoint | null;
  status: string;
  isGpsVerified: boolean;
  lastUpdated: Timestamp | FieldValue;
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
    console.warn(
      "[getStudentAttendanceHistory] Student ID and Class ID are required."
    );
    return [];
  }

  try {
    const sessionsRef = collection(webDb, "sessions");
    const sessionsQuery = query(sessionsRef, where("classId", "==", classId));
    const sessionsSnapshot = await getDocs(sessionsQuery);

    if (sessionsSnapshot.empty) {
      console.log(
        `[getStudentAttendanceHistory] No sessions found for class ${classId}.`
      );
      return [];
    }

    const sessionIds = sessionsSnapshot.docs.map((doc) => doc.id);

    const attendancePromises = sessionIds.map(async (sessionId) => {
      const attendanceDocRef = doc(
        webDb,
        "sessions",
        sessionId,
        "attendance",
        studentId
      );
      const attendanceSnap = await getDoc(attendanceDocRef);
      if (attendanceSnap.exists()) {
        return {
          ...(attendanceSnap.data() as Omit<
            StudentAttendanceRecord,
            "sessionId"
          >),
          sessionId: sessionId,
        } as StudentAttendanceRecord;
      } else {
        return null;
      }
    });

    const attendanceRecords = (await Promise.all(attendancePromises)).filter(
      (record): record is StudentAttendanceRecord => record !== null
    );

    console.log(
      `[getStudentAttendanceHistory] Found ${attendanceRecords.length} attendance records for student ${studentId} in class ${classId}.`
    );
    // Cast to Timestamp for sorting, as FieldValue is only relevant on write
    return attendanceRecords.sort(
      (a, b) =>
        (b.lastUpdated as Timestamp).toMillis() -
        (a.lastUpdated as Timestamp).toMillis()
    );
  } catch (error) {
    console.error(
      `Error fetching attendance history for student ${studentId} in class ${classId}:`,
      error
    );
    throw error;
  }
}

/**
 * Records a student's check-in to an active session.
 * Creates an entry in the /sessions/{sessionId}/attendance/{studentId} subcollection.
 *
 * @param sessionId The ID of the session to check into.
 * @param studentId The ID of the student checking in.
 * @param locationData The student's current location data.
 * @returns A promise that resolves when the check-in is recorded.
 * @throws If the session does not exist or student cannot check in.
 */
export async function checkInToSession(
  sessionId: string,
  studentId: string,
  locationData: { latitude: number; longitude: number }
): Promise<void> {
  if (!sessionId || !studentId || !locationData) {
    console.error("Session ID, Student ID, and Location Data are required.");
    throw new Error("Session ID, Student ID, and Location Data are required.");
  }

  console.log(
    `Student ${studentId} attempting check-in for session ${sessionId} at location:`,
    locationData
  );

  const sessionRef = doc(webDb, "sessions", sessionId);
  const attendanceRef = doc(
    webDb,
    `sessions/${sessionId}/attendance/${studentId}`
  );

  try {
    const sessionSnap = await getDoc(sessionRef);
    if (!sessionSnap.exists()) {
      console.error(`Session ${sessionId} not found.`);
      throw new Error("Session not found.");
    }
    const sessionData = sessionSnap.data();
    const sessionLocation = sessionData.location as GeoPoint | null;
    const sessionRadius = sessionData.radius as number | undefined;

    console.log("Session details:", { sessionLocation, sessionRadius });

    let isGpsVerified = false;
    let status = "checked_in";

    if (sessionLocation && typeof sessionRadius === "number") {
      console.log("Validating student location against session location...");
      isGpsVerified = validateLocationForSession(
        sessionLocation,
        locationData,
        sessionRadius
      );
      if (!isGpsVerified) {
        status = "failed_location";
        console.warn(
          `Location validation failed for student ${studentId}, session ${sessionId}.`
        );
      } else {
        console.log(
          `Location validation successful for student ${studentId}, session ${sessionId}.`
        );
      }
    } else {
      console.log(
        `Session ${sessionId} does not require location check or has invalid radius.`
      );
      isGpsVerified = true;
    }

    const attendanceData: Partial<StudentAttendanceRecord> = {
      classId: sessionData.classId,
      checkInTime: serverTimestamp(),
      checkInLocation: new GeoPoint(
        locationData.latitude,
        locationData.longitude
      ),
      status: status,
      isGpsVerified: isGpsVerified,
      lastUpdated: serverTimestamp(),
    };

    console.log("Preparing to write attendance data:", attendanceData);

    await setDoc(attendanceRef, attendanceData, { merge: true });

    console.log(
      `Successfully recorded check-in (status: ${status}) for student ${studentId} in session ${sessionId}.`
    );
  } catch (error) {
    console.error(
      `Error checking in student ${studentId} for session ${sessionId}:`,
      error
    );

    try {
      await setDoc(
        attendanceRef,
        {
          status: "failed_other",
          lastUpdated: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (failureLogError) {
      console.error(
        "Failed to even record the check-in failure:",
        failureLogError
      );
    }

    throw error;
  }
}

/**
 * Records a student's early check-out from an active session.
 * Updates the entry in the /sessions/{sessionId}/attendance/{studentId} subcollection.
 *
 * @param sessionId The ID of the session to check out from.
 * @param studentId The ID of the student checking out.
 * @returns A promise that resolves when the check-out is recorded.
 * @throws If the session does not exist or student is not checked in.
 */
export async function checkOutFromSession(
  sessionId: string,
  studentId: string
): Promise<void> {
  if (!sessionId || !studentId) {
    console.error("Session ID and Student ID are required.");
    throw new Error("Session ID and Student ID are required.");
  }

  console.log(
    `Student ${studentId} attempting check-out for session ${sessionId}`
  );

  const attendanceRef = doc(
    webDb,
    `sessions/${sessionId}/attendance/${studentId}`
  );

  try {
    const attendanceSnap = await getDoc(attendanceRef);

    if (!attendanceSnap.exists()) {
      console.warn(
        `No attendance record found for student ${studentId} in session ${sessionId}. Cannot check out.`
      );
      throw new Error("Check-in record not found.");
    }

    console.log(
      `Check-out process initiated/completed for student ${studentId} in session ${sessionId}.`
    );
  } catch (error) {
    console.error(
      `Error checking out student ${studentId} from session ${sessionId}:`,
      error
    );
    throw error;
  }
}

/**
 * Gets the current status of a session from Firestore.
 *
 * @param sessionId The ID of the session
 * @returns A promise resolving to the session status or null if not found
 */
export async function getSessionStatus(
  sessionId: string
): Promise<string | null> {
  if (!sessionId) {
    console.warn("[getSessionStatus] No sessionId provided");
    return null;
  }

  try {
    const sessionRef = doc(webDb, "sessions", sessionId);
    const sessionSnap = await getDoc(sessionRef);

    if (!sessionSnap.exists()) {
      console.warn(`Session ${sessionId} does not exist`);
      return null;
    }

    const sessionData = sessionSnap.data();
    return sessionData?.status || null;
  } catch (error) {
    console.error(`Error getting status for session ${sessionId}:`, error);
    throw error;
  }
}

/**
 * Updates the biometric verification status for a student's attendance record.
 *
 * @param sessionId The ID of the session.
 * @param studentId The ID of the student.
 * @param status The new status to set (e.g., 'verified', 'failed_biometric').
 */
export async function updateBiometricVerificationStatus(
  sessionId: string,
  studentId: string,
  status: "verified" | "failed_biometric" | "failed_other" // Define allowed statuses
): Promise<void> {
  if (!sessionId || !studentId || !status) {
    console.error("[updateBiometricVerificationStatus] Missing parameters.");
    throw new Error("Missing parameters for updating verification status.");
  }

  console.log(
    `[updateBiometricVerificationStatus] Updating status for student ${studentId} in session ${sessionId} to: ${status}`
  );

  const attendanceRef = doc(
    webDb,
    "sessions",
    sessionId,
    "attendance",
    studentId
  );

  try {
    await updateDoc(attendanceRef, {
      status: status,
      lastUpdated: serverTimestamp(), // Update timestamp
      // Optionally add a specific field like isBiometricVerified: status === 'verified'
    });
    console.log(
      `[updateBiometricVerificationStatus] Successfully updated status for student ${studentId} to ${status}.`
    );
  } catch (error) {
    console.error(
      `[updateBiometricVerificationStatus] Failed to update status for student ${studentId} in session ${sessionId}:`,
      error
    );
    // Check if the error is because the document doesn't exist (e.g., student never checked in)
    if ((error as FirestoreError).code === "not-found") {
      console.warn(
        `[updateBiometricVerificationStatus] Attendance record for student ${studentId} in session ${sessionId} not found. Cannot update status.`
      );
      // Decide if this should throw or just return
      return; // Or throw new Error("Attendance record not found");
    }
    throw error; // Re-throw other errors
  }
}

/**
 * Archives a class for a student.
 * Moves it from /userClasses/{studentId}/classes/{classId} to
 * /userClasses/{studentId}/archivedClasses/{classId}.
 *
 * @param studentId The ID of the student.
 * @param classId The ID of the class to archive.
 * @throws If an error occurs during archiving.
 */
export async function archiveClass(
  studentId: string,
  classId: string
): Promise<void> {
  if (!studentId || !classId) {
    console.error("Student ID and Class ID are required.");
    throw new Error("Student ID and Class ID are required.");
  }

  console.log(`Student ${studentId} attempting to archive class ${classId}`);

  try {
    const userClassDocRef = doc(
      webDb,
      `userClasses/${studentId}/classes/${classId}`
    );
    const archivedClassDocRef = doc(
      webDb,
      `userClasses/${studentId}/archivedClasses/${classId}`
    );

    const docSnap = await getDoc(userClassDocRef);
    if (!docSnap.exists()) {
      console.warn(
        `Student ${studentId} is not enrolled in class ${classId}, cannot archive.`
      );
      return;
    }

    const classData = docSnap.data();
    const batch = writeBatch(webDb);

    // Add to archived collection
    batch.set(archivedClassDocRef, {
      ...classData,
      archivedDate: serverTimestamp(),
    });

    // Remove from active classes
    batch.delete(userClassDocRef);

    await batch.commit();
    console.log(
      `Successfully archived class ${classId} for student ${studentId}`
    );
  } catch (error) {
    console.error("Error archiving class:", error);
    throw error;
  }
}

/**
 * Unarchives a class for a student.
 * Moves it from /userClasses/{studentId}/archivedClasses/{classId} back to
 * /userClasses/{studentId}/classes/{classId}.
 *
 * @param studentId The ID of the student.
 * @param classId The ID of the class to unarchive.
 * @throws If an error occurs during unarchiving.
 */
export async function unarchiveClass(
  studentId: string,
  classId: string
): Promise<void> {
  if (!studentId || !classId) {
    console.error("Student ID and Class ID are required.");
    throw new Error("Student ID and Class ID are required.");
  }

  console.log(`Student ${studentId} attempting to unarchive class ${classId}`);

  try {
    const archivedClassDocRef = doc(
      webDb,
      `userClasses/${studentId}/archivedClasses/${classId}`
    );
    const userClassDocRef = doc(
      webDb,
      `userClasses/${studentId}/classes/${classId}`
    );

    const docSnap = await getDoc(archivedClassDocRef);
    if (!docSnap.exists()) {
      console.warn(
        `Student ${studentId} does not have class ${classId} archived, cannot unarchive.`
      );
      return;
    }

    const classData = docSnap.data();
    const batch = writeBatch(webDb);

    // Remove archivedDate field
    const { archivedDate, ...restData } = classData;

    // Move back to active classes
    batch.set(userClassDocRef, restData);

    // Remove from archived collection
    batch.delete(archivedClassDocRef);

    await batch.commit();
    console.log(
      `Successfully unarchived class ${classId} for student ${studentId}`
    );
  } catch (error) {
    console.error("Error unarchiving class:", error);
    throw error;
  }
}

/**
 * Fetches the list of archived classes for a student.
 *
 * @param studentId The ID of the student.
 * @returns A promise resolving to an array of archived class info.
 */
export async function getArchivedClassesForStudent(
  studentId: string
): Promise<BaseUserClassInfo[]> {
  if (!studentId) {
    console.warn("[getArchivedClassesForStudent] No studentId provided.");
    return [];
  }
  try {
    const archivedClassesRef = collection(
      webDb,
      "userClasses",
      studentId,
      "archivedClasses"
    );
    const snapshot = await getDocs(archivedClassesRef);

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
      `[getArchivedClassesForStudent] Error fetching archived classes for student ${studentId}:`,
      error
    );
    throw error;
  }
}

/**
 * Gets the count of archived classes for a student.
 *
 * @param studentId The ID of the student.
 * @returns A promise resolving to the count of archived classes.
 */
export async function getArchivedClassesCountForStudent(
  studentId: string
): Promise<number> {
  if (!studentId) {
    console.warn("[getArchivedClassesCountForStudent] No studentId provided.");
    return 0;
  }
  try {
    const archivedClassesRef = collection(
      webDb,
      "userClasses",
      studentId,
      "archivedClasses"
    );
    const snapshot = await getDocs(archivedClassesRef);
    return snapshot.size;
  } catch (error) {
    console.error(
      `[getArchivedClassesCountForStudent] Error fetching archived classes count for student ${studentId}:`,
      error
    );
    return 0;
  }
}
