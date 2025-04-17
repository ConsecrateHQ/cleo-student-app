import firestore from "@react-native-firebase/firestore";
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

  try {
    console.log("🌱 Seeding Firebase emulators with sample data...");

    // Clear existing data first
    await clearEmulatorData();

    // Create teacher user
    const teacherUid = "teacher123";
    await firestore().collection("users").doc(teacherUid).set({
      uid: teacherUid,
      email: "teacher@example.com",
      displayName: "Professor Smith",
      role: "teacher",
      created_at: firestore.Timestamp.now(),
    });

    // Create student users
    const studentIds = ["student1", "student2", "student3"];

    for (let i = 0; i < studentIds.length; i++) {
      const studentId = studentIds[i];
      await firestore()
        .collection("users")
        .doc(studentId)
        .set({
          uid: studentId,
          email: `student${i + 1}@example.com`,
          displayName: `Student ${i + 1}`,
          role: "student",
          created_at: firestore.Timestamp.now(),
        });
    }

    // Create a class
    const classRef = firestore().collection("classes").doc();
    const classId = classRef.id;

    await classRef.set({
      classId,
      name: "Computer Science 101",
      teacherId: teacherUid,
      joinCode: "CS101",
      created_at: firestore.Timestamp.now(),
    });

    // Enroll students in the class
    for (const studentId of studentIds) {
      // Create student enrollment in class
      await firestore()
        .collection("classes")
        .doc(classId)
        .collection("students")
        .doc(studentId)
        .set({
          joinDate: firestore.Timestamp.now(),
        });

      // Add class to student's classes for quick lookup
      await firestore()
        .collection("userClasses")
        .doc(studentId)
        .collection("classes")
        .doc(classId)
        .set({
          className: "Computer Science 101",
          teacherName: "Professor Smith",
          joinDate: firestore.Timestamp.now(),
        });
    }

    // Create a session for the class
    const sessionRef = firestore().collection("sessions").doc();
    await sessionRef.set({
      sessionId: sessionRef.id,
      classId,
      teacherId: teacherUid,
      startTime: firestore.Timestamp.now(),
      endTime: null,
      status: "active",
      location: new firestore.GeoPoint(37.7749, -122.4194), // San Francisco
      radius: 100, // meters
      created_at: firestore.Timestamp.now(),
    });

    console.log("✅ Emulator seeded successfully!");
    Alert.alert("Success", "Firebase emulators seeded with sample data");
  } catch (error) {
    console.error("Error seeding emulator:", error);
    Alert.alert("Error", "Failed to seed emulators. See console for details.");
  }
};

/**
 * Clears all data from the emulator for a fresh start
 */
const clearEmulatorData = async () => {
  console.log("🧹 Clearing existing emulator data...");

  const collections = ["users", "classes", "sessions", "userClasses"];

  // Delete all documents in each collection
  for (const collectionName of collections) {
    const snapshot = await firestore().collection(collectionName).get();

    const batch = firestore().batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    if (snapshot.docs.length > 0) {
      await batch.commit();
    }
  }

  console.log("🧹 Emulator data cleared");
};
