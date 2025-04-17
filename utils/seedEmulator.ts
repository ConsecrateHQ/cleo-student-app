import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  Timestamp,
  GeoPoint,
  writeBatch,
  getDocs,
  query,
  limit,
  CollectionReference,
  DocumentReference,
  Firestore,
  QuerySnapshot,
  DocumentData,
} from "@react-native-firebase/firestore";
import auth from "@react-native-firebase/auth";
import { Alert } from "react-native";

/**
 * Seeds the Firebase emulator with sample data for testing
 * Should only be called in development with emulators running
 */
export const seedEmulator = async () => {
  if (!__DEV__) {
    console.error("Seed function should only be called in development!");
    return;
  }

  console.log("🌱 [Seed] Starting Firebase emulator seeding process...");

  try {
    // Check if emulator connection is working
    console.log("  -> [Seed] Verifying emulator connection...");
    try {
      console.log("     - [Seed Conn Test] Getting Firestore instance...");
      const db = getFirestore(); // Get instance using modular function
      console.log("     - [Seed Conn Test] Getting collection ref...");
      const collectionRef = collection(db, "_test_connection"); // Use modular collection()
      console.log("     - [Seed Conn Test] Getting document ref...");
      const testDocRef = doc(collectionRef); // Use modular doc() for auto-ID
      console.log(
        `     - [Seed Conn Test] Test document ref created: ${testDocRef.path}`
      ); // Log path

      console.log(
        `     - [Seed Conn Test] Attempting to set document ${testDocRef.path}...`
      );
      await setDoc(testDocRef, { timestamp: Timestamp.now() }); // Use modular setDoc() and Timestamp
      console.log(
        `     - [Seed Conn Test] ✅ Successfully set document ${testDocRef.path}.`
      );

      console.log(
        `     - [Seed Conn Test] Attempting to delete document ${testDocRef.path}...`
      );
      await deleteDoc(testDocRef); // Use modular deleteDoc()
      console.log(
        `     - [Seed Conn Test] ✅ Successfully deleted document ${testDocRef.path}.`
      );

      console.log("    - ✅ Emulator connection verified successfully!");
    } catch (connectionError) {
      console.error(
        "  ❌ [Seed] Emulator connection test failed:",
        connectionError
      );
      const errorMessage =
        connectionError instanceof Error
          ? connectionError.message
          : JSON.stringify(connectionError);
      console.error(`   Connection Error details: ${errorMessage}`);
      if (connectionError instanceof Error && connectionError.stack) {
        console.error(`   Connection Stack trace: ${connectionError.stack}`);
      }
      Alert.alert(
        "Emulator Connection Error",
        `Connection test failed: ${errorMessage}. Check emulator status and config.`
      );
      throw new Error("Emulator connection failed"); // Re-throw
    }

    // Clear existing data first
    console.log("  -> [Seed] Clearing existing data before seeding...");
    await clearEmulatorData(); // Assumes clearEmulatorData has its own detailed logging
    console.log("    - ✅ Existing data cleared.");

    console.log("  -> [Seed] Creating test users...");
    const db = getFirestore(); // Get instance again (or pass db if preferred)
    // Create teacher user
    const teacherUid = "teacher123";
    const teacherRef = doc(db, "users", teacherUid); // Use modular doc(db, collectionPath, docId)
    await setDoc(teacherRef, {
      // Use modular setDoc()
      uid: teacherUid,
      email: "teacher@example.com",
      displayName: "Professor Smith",
      role: "teacher",
      created_at: Timestamp.now(), // Use modular Timestamp
    });
    console.log(`    - Created teacher user: ${teacherUid}`);

    // Create student users
    const studentIds = ["student1", "student2", "student3"];
    for (let i = 0; i < studentIds.length; i++) {
      const studentId = studentIds[i];
      const studentRef = doc(db, "users", studentId); // Use modular doc()
      await setDoc(studentRef, {
        // Use modular setDoc()
        uid: studentId,
        email: `student${i + 1}@example.com`,
        displayName: `Student ${i + 1}`,
        role: "student",
        created_at: Timestamp.now(), // Use modular Timestamp
      });
      console.log(`    - Created student user: ${studentId}`);
    }
    console.log("    - ✅ Test users created.");

    console.log("  -> [Seed] Creating test class...");
    // Create a class
    const classesColRef = collection(db, "classes"); // Use modular collection()
    const classRef = doc(classesColRef); // Use modular doc() for auto-ID
    const classId = classRef.id;

    await setDoc(classRef, {
      // Use modular setDoc()
      classId,
      name: "Computer Science 101",
      teacherId: teacherUid,
      joinCode: "CS101",
      created_at: Timestamp.now(), // Use modular Timestamp
    });
    console.log(`    - ✅ Test class created with ID: ${classId}`);

    console.log(`  -> [Seed] Enrolling students in class ${classId}...`);
    // Enroll students in the class
    for (const studentId of studentIds) {
      // Create student enrollment in class
      // Use modular doc(db, pathSegments...)
      const studentEnrollmentRef = doc(
        db,
        "classes",
        classId,
        "students",
        studentId
      );
      await setDoc(studentEnrollmentRef, {
        // Use modular setDoc()
        joinDate: Timestamp.now(), // Use modular Timestamp
      });
      console.log(
        `    - Enrolled student ${studentId} in class subcollection.`
      );

      // Add class to student's classes for quick lookup
      const userClassRef = doc(
        db,
        "userClasses",
        studentId,
        "classes",
        classId
      ); // Use modular doc()
      await setDoc(userClassRef, {
        // Use modular setDoc()
        className: "Computer Science 101",
        teacherName: "Professor Smith",
        joinDate: Timestamp.now(), // Use modular Timestamp
      });
      console.log(
        `    - Added class ${classId} to userClasses for student ${studentId}.`
      );
    }
    console.log("    - ✅ Students enrolled.");

    console.log(`  -> [Seed] Creating test session for class ${classId}...`);
    // Create a session for the class
    const sessionsColRef = collection(db, "sessions"); // Use modular collection()
    const sessionRef = doc(sessionsColRef); // Use modular doc() for auto-ID
    await setDoc(sessionRef, {
      // Use modular setDoc()
      sessionId: sessionRef.id,
      classId,
      teacherId: teacherUid,
      startTime: Timestamp.now(), // Use modular Timestamp
      endTime: null,
      status: "active",
      location: new GeoPoint(37.7749, -122.4194), // Use modular GeoPoint
      radius: 100, // meters
      created_at: Timestamp.now(), // Use modular Timestamp
    });
    console.log(`    - ✅ Test session created with ID: ${sessionRef.id}`);

    console.log("✅ [Seed] Emulator seeded successfully!");
    Alert.alert(
      "Success",
      "Firebase emulators seeded with sample data. Created 1 teacher, 3 students, 1 class, and 1 active session."
    );
  } catch (error) {
    console.error("❌ [Seed] Error during emulator seeding:", error);
    const errorMessage =
      error instanceof Error ? error.message : JSON.stringify(error);
    console.error(`   Error details: ${errorMessage}`);
    if (error instanceof Error && error.stack) {
      console.error(`   Stack trace: ${error.stack}`);
    }
    Alert.alert(
      "Seeding Error",
      `Failed to seed emulators: ${errorMessage}. See console for details.`
    );
    throw error; // Re-throw to be handled by the caller in DevMenu
  }
};

/**
 * Clears all data from the emulator for a fresh start
 */
export const clearEmulatorData = async () => {
  console.log("🧹 [Clear] Starting to clear existing emulator data...");
  const db = getFirestore(); // Use modular getFirestore()

  try {
    const collectionsToClear = [
      // Renamed variable for clarity
      "users",
      "classes",
      "sessions",
      "userClasses",
      "_test_connection",
    ];
    let totalDocsDeleted = 0;

    // Delete all documents in each collection
    for (const collectionName of collectionsToClear) {
      console.log(`  -> [Clear] Clearing collection: ${collectionName}...`);
      const collectionRef = collection(db, collectionName); // Use modular collection()

      console.log(`    - [Clear] Fetching documents from ${collectionName}...`);
      // Use pagination with modular query() and limit()
      let querySnapshot: QuerySnapshot<DocumentData>;
      let docsInCollection = 0;
      let lastVisibleDoc = null; // Needed for pagination if implemented, but not strictly necessary for limit(100).get() loop

      // Loop using getDocs with limit
      while (true) {
        // Construct the query
        const q = query(collectionRef, limit(100)); // Fetch in batches of 100

        querySnapshot = await getDocs(q); // Use modular getDocs()
        docsInCollection += querySnapshot.size;

        if (querySnapshot.empty) {
          console.log(
            `    - [Clear] No more documents found in ${collectionName}.`
          );
          break; // Exit loop if no documents are found
        }
        console.log(
          `    - [Clear] Fetched ${querySnapshot.size} documents batch from ${collectionName}. Preparing batch delete...`
        );

        const batch = writeBatch(db); // Use modular writeBatch()
        querySnapshot.docs.forEach((doc) => {
          batch.delete(doc.ref); // batch.delete syntax remains the same
        });

        console.log(
          `    - [Clear] Committing batch delete for ${querySnapshot.size} documents in ${collectionName}...`
        );
        await batch.commit(); // batch.commit syntax remains the same
        totalDocsDeleted += querySnapshot.size;
        console.log(
          `    - ✅ [Clear] Successfully deleted ${querySnapshot.size} documents batch from ${collectionName}`
        );

        // Check if we fetched less than the limit, meaning it's the last batch
        if (querySnapshot.size < 100) {
          console.log(
            `    - [Clear] Fetched last batch (${querySnapshot.size} docs) for ${collectionName}.`
          );
          break;
        }
      }

      console.log(
        `    - Finished clearing ${collectionName}. Total docs deleted in this collection: ${docsInCollection}`
      );
    }

    console.log(
      `🧹 [Clear] Emulator data cleared successfully: ${totalDocsDeleted} documents deleted in total.`
    );
    Alert.alert(
      "Success",
      `Cleared ${totalDocsDeleted} documents from the emulator`
    );
  } catch (error) {
    console.error("❌ [Clear] Error clearing emulator data:", error);
    const errorMessage =
      error instanceof Error ? error.message : JSON.stringify(error);
    console.error(`   Error details: ${errorMessage}`);
    if (error instanceof Error && error.stack) {
      console.error(`   Stack trace: ${error.stack}`);
    }
    Alert.alert(
      "Error Clearing Data",
      `Failed to clear emulator data: ${errorMessage}. See console for details.`
    );
    throw error; // Re-throw to be handled by the caller in seedEmulator
  }
};
