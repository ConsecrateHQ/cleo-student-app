import {
  getFirestore as getWebFirestore,
  collection as webCollection,
  doc as webDoc,
  setDoc as webSetDoc,
  deleteDoc as webDeleteDoc,
  Timestamp as webTimestamp,
  GeoPoint as webGeoPoint,
  writeBatch as webWriteBatch,
  getDocs as webGetDocs,
  query as webQuery,
  limit as webLimit,
  serverTimestamp as webServerTimestamp,
  type Firestore as WebFirestore,
} from "firebase/firestore";

import { Alert } from "react-native";
import { webDb, useEmulator } from "./firebaseConfig";

// --- Seeding Helper Functions --- (Now exclusively Web SDK)
const createUsers = async (db: WebFirestore, nowTimestamp: any) => {
  console.log("    -> Creating users...");
  const teacherUid = "teacher123";
  const germanTeacherUid = "teacher456";
  const studentIds = ["student1", "student2", "student3"];
  const teacherRef = webDoc(db, "users", teacherUid);
  await webSetDoc(teacherRef, {
    uid: teacherUid,
    email: "teacher@example.com",
    displayName: "Professor Smith",
    role: "teacher",
    created_at: nowTimestamp,
  });
  const germanTeacherRef = webDoc(db, "users", germanTeacherUid);
  await webSetDoc(germanTeacherRef, {
    uid: germanTeacherUid,
    email: "frau.tuyen@example.com",
    displayName: "Frau Tuyen",
    role: "teacher",
    created_at: nowTimestamp,
  });
  for (let i = 0; i < studentIds.length; i++) {
    const studentId = studentIds[i];
    const studentRef = webDoc(db, "users", studentId);
    await webSetDoc(studentRef, {
      uid: studentId,
      email: `student${i + 1}@example.com`,
      displayName: `Student ${i + 1}`,
      role: "student",
      created_at: nowTimestamp,
    });
  }
  console.log("    - ✅ Users created.");
  return { teacherUid, germanTeacherUid, studentIds };
};

const createClasses = async (
  db: WebFirestore,
  teacherUid: string,
  germanTeacherUid: string,
  nowTimestamp: any
) => {
  console.log("    -> Creating classes...");
  const classesColRef = webCollection(db, "classes");
  const classRef = webDoc(classesColRef);
  const classId = classRef.id;
  await webSetDoc(classRef, {
    classId,
    name: "Computer Science 101",
    teacherId: teacherUid,
    joinCode: "CS101",
    created_at: nowTimestamp,
  });
  const germanClassRef = webDoc(classesColRef);
  const germanClassId = germanClassRef.id;
  await webSetDoc(germanClassRef, {
    classId: germanClassId,
    name: "German A2",
    teacherId: germanTeacherUid,
    joinCode: "GER102",
    created_at: nowTimestamp,
  });
  console.log("    - ✅ Classes created.");
  return { classId, germanClassId };
};

const enrollStudents = async (
  db: WebFirestore,
  classId: string,
  studentIds: string[],
  nowTimestamp: any
) => {
  console.log("    -> Enrolling students...");
  for (const studentId of studentIds) {
    const studentEnrollmentRef = webDoc(
      db,
      "classes",
      classId,
      "students",
      studentId
    );
    await webSetDoc(studentEnrollmentRef, { joinDate: nowTimestamp });
    const userClassRef = webDoc(
      db,
      "userClasses",
      studentId,
      "classes",
      classId
    );
    await webSetDoc(userClassRef, {
      className: "Computer Science 101",
      teacherName: "Professor Smith",
      joinDate: nowTimestamp,
    });
  }
  console.log("    - ✅ Students enrolled.");
};

const createSessions = async (
  db: WebFirestore,
  classId: string,
  germanClassId: string,
  teacherUid: string,
  germanTeacherUid: string,
  nowTimestamp: any
) => {
  console.log("    -> Creating sessions...");
  const sessionsColRef = webCollection(db, "sessions");
  const sessionRef = webDoc(sessionsColRef);
  await webSetDoc(sessionRef, {
    sessionId: sessionRef.id,
    classId,
    teacherId: teacherUid,
    startTime: nowTimestamp,
    endTime: null,
    status: "active",
    location: new webGeoPoint(37.7749, -122.4194),
    radius: 100,
    created_at: nowTimestamp,
  });
  const germanSessionRef = webDoc(sessionsColRef);
  await webSetDoc(germanSessionRef, {
    sessionId: germanSessionRef.id,
    classId: germanClassId,
    teacherId: germanTeacherUid,
    startTime: nowTimestamp,
    endTime: null,
    status: "active",
    location: new webGeoPoint(52.52, 13.405),
    radius: 100,
    created_at: nowTimestamp,
  });
  console.log("    - ✅ Sessions created.");
};

/**
 * Seeds the Firestore database (emulator or cloud) with sample data using the Web SDK.
 */
export const seedEmulator = async () => {
  const target = useEmulator ? "emulator" : "CLOUD database";
  console.log(
    `🌱 [Seed] Starting Firebase seeding process using Web SDK for ${target}...`
  );

  // Use the imported webDb directly
  const db = webDb;
  const now = webServerTimestamp(); // Use server timestamp for consistency

  // Connection Test (Simplified Web SDK Check)
  try {
    console.log(
      `   -> [Seed] Verifying connection using Web SDK to ${target}...`
    );
    const testDocRef = webDoc(db, "_seed_connection_test", `web_${Date.now()}`);
    await webSetDoc(testDocRef, { timestamp: now, sdk: "Web SDK", target });
    await webDeleteDoc(testDocRef); // Clean up test doc
    console.log(
      `   ✅ [Seed] Connection test successful via Web SDK to ${target}.`
    );
  } catch (error: any) {
    console.error(
      `   ❌ [Seed] Connection test failed via Web SDK to ${target}:`,
      error
    );
    Alert.alert(
      "Seeding Error",
      `Connection test failed for ${target}. Cannot seed database. Error: ${error.message}`
    );
    throw new Error(`Connection failed via Web SDK to ${target}`); // Halt seeding
  }

  // Proceed with seeding using Web SDK helpers
  try {
    console.log(
      `   -> [Seed] Clearing existing data before seeding ${target}...`
    );
    await clearData(db, ["users", "classes", "sessions", "userClasses"]); // Use the renamed clearData function
    console.log(`   - ✅ [Seed] Existing data cleared from ${target}.`);

    console.log(`   -> [Seed] Seeding data into ${target}...`);
    const { teacherUid, germanTeacherUid, studentIds } = await createUsers(
      db,
      now
    );
    const { classId, germanClassId } = await createClasses(
      db,
      teacherUid,
      germanTeacherUid,
      now
    );
    await enrollStudents(db, classId, studentIds, now);
    // Maybe enroll some students in German too?
    await createSessions(
      db,
      classId,
      germanClassId,
      teacherUid,
      germanTeacherUid,
      now
    );

    console.log(`✅ [Seed] Seeding completed successfully for ${target}!`);
    Alert.alert("Success", `Database seeded successfully (${target})!`);
  } catch (error: any) {
    console.error(
      `❌ [Seed] Error during seeding via Web SDK for ${target}:`,
      error
    );
    Alert.alert(
      "Seeding Error",
      `An error occurred during seeding (${target}): ${error.message}`
    );
    throw error; // Re-throw the error
  }
};

// --- Clearing Helper Functions --- (Now exclusively Web SDK)
const clearData = async (db: WebFirestore, collectionsToClear: string[]) => {
  console.log(
    `      🧹 Clearing collections: ${collectionsToClear.join(", ")}...`
  );
  for (const collectionName of collectionsToClear) {
    console.log(`      -> Clearing collection: ${collectionName}...`);
    try {
      const collectionRef = webCollection(db, collectionName);
      // Fetch documents in batches to avoid memory issues (though less likely in emulator)
      let querySnapshot;
      let deletedCount = 0;
      do {
        const q = webQuery(collectionRef, webLimit(100)); // Process 100 docs at a time
        querySnapshot = await webGetDocs(q);
        if (!querySnapshot.empty) {
          const batch = webWriteBatch(db);
          querySnapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
          });
          await batch.commit();
          deletedCount += querySnapshot.size;
          console.log(
            `         ...deleted ${querySnapshot.size} documents from ${collectionName}.`
          );
        } else {
          console.log(
            `         Collection ${collectionName} is empty or finished.`
          );
        }
        // Check if the loop should continue. If the snapshot size is less than the limit,
        // it means we've processed the last batch.
      } while (querySnapshot.size === 100);
      console.log(
        `      - ✅ Cleared collection: ${collectionName} (Total ${deletedCount} docs deleted).`
      );
    } catch (error: any) {
      console.error(
        `      - ❌ Error clearing collection ${collectionName}:`,
        error
      );
      // Decide if we should continue or stop on error
      throw new Error(
        `Failed to clear collection ${collectionName}: ${error.message}`
      );
    }
  }
  console.log(`      ✨ Collections cleared.`);
};

/**
 * Clears specified collections from the Firestore database (emulator or cloud) using the Web SDK.
 */
export const clearEmulatorData = async () => {
  const target = useEmulator ? "emulator" : "CLOUD database";
  console.log(
    `🗑️ [Clear] Starting data clearing process using Web SDK for ${target}...`
  );

  // Use the imported webDb directly
  const db = webDb;
  const collections = ["users", "classes", "sessions", "userClasses"]; // Add other top-level collections if needed

  // Connection Test (Optional but recommended before destructive action)
  try {
    console.log(
      `   -> [Clear] Verifying connection using Web SDK to ${target}...`
    );
    const testDocRef = webDoc(
      db,
      "_clear_connection_test",
      `web_${Date.now()}`
    );
    await webSetDoc(testDocRef, {
      timestamp: webServerTimestamp(),
      sdk: "Web SDK",
      target,
    });
    await webDeleteDoc(testDocRef); // Clean up test doc
    console.log(
      `   ✅ [Clear] Connection test successful via Web SDK to ${target}.`
    );
  } catch (error: any) {
    console.error(
      `   ❌ [Clear] Connection test failed via Web SDK to ${target}:`,
      error
    );
    Alert.alert(
      "Clearing Error",
      `Connection test failed for ${target}. Cannot clear data. Error: ${error.message}`
    );
    throw new Error(`Connection failed via Web SDK to ${target}`);
  }

  // Proceed with clearing
  try {
    await clearData(db, collections);
    console.log(
      `✅ [Clear] Data clearing completed successfully for ${target}!`
    );
    Alert.alert("Success", `Data cleared successfully (${target})!`);
  } catch (error: any) {
    console.error(
      `❌ [Clear] Error during clearing via Web SDK for ${target}:`,
      error
    );
    Alert.alert(
      "Clearing Error",
      `An error occurred during clearing (${target}): ${error.message}`
    );
    throw error; // Re-throw
  }
};
