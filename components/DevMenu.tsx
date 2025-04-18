import React, { useState, useEffect, ComponentProps } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { seedEmulator, clearEmulatorData } from "../utils/seedEmulator";
import { Ionicons } from "@expo/vector-icons";
import theme from "../theme";
import useAuthStore from "../hooks/useAuthStore";
import LocationPermissionButton from "./LocationPermissionButton";
import {
  FirebaseFirestoreTypes,
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  query,
  where,
  getDocs,
  updateDoc,
  deleteDoc,
  Timestamp,
  GeoPoint,
  limit,
} from "@react-native-firebase/firestore";
import { app } from "../utils/firebaseConfig";

interface DevMenuProps {
  visible: boolean;
  onClose: () => void;
}

interface ActionButtonProps {
  icon: ComponentProps<typeof Ionicons>["name"];
  text: string;
  onPress: () => void;
  isLoading: boolean;
  loadingText?: string;
  disabled?: boolean;
}

interface ClassInfo {
  id: string | null;
  name: string;
  sessionId: string | null;
  userIsEnrolled: boolean;
}

// Get the configured Firestore instance
const db = getFirestore(app);

export default function DevMenu({ visible, onClose }: DevMenuProps) {
  const user = useAuthStore((state) => state.user);
  const [isLoading, setIsLoading] = useState<{
    [key: string]: boolean;
  }>({
    seed: false,
    clear: false,
    addUserCS101: false,
    addUserGermanA2: false,
    deactivateCS101: false,
    deactivateGermanA2: false,
    startCS101: false,
    startGermanA2: false,
    testConnection: false,
    createMultipleSessions: false,
  });

  // Track info for both classes
  const [classes, setClasses] = useState<{ [key: string]: ClassInfo }>({
    CS101: {
      id: null,
      name: "Computer Science 101",
      sessionId: null,
      userIsEnrolled: false,
    },
    GermanA2: {
      id: null,
      name: "German A2",
      sessionId: null,
      userIsEnrolled: false,
    },
  });

  const handleTestConnection = async () => {
    try {
      setIsLoading((prev) => ({ ...prev, testConnection: true }));
      console.log("Testing connection to Firestore...");

      const testRef = collection(db, "test_connection");
      const timestamp = new Date().toISOString();

      console.log("Attempting addDoc..."); // Add log before
      const docRef = await addDoc(testRef, {
        timestamp,
        message: "Connection test successful",
      });
      console.log(`addDoc successful, docRef ID: ${docRef.id}`); // Add log after

      // await getDoc(docRef); // Temporarily comment out getDoc

      Alert.alert(
        "Firestore Connection",
        `Successfully performed WRITE on Firestore (doc ID: ${docRef.id}).`
      );
      console.log("Firestore connection test successful (write only)");
    } catch (error: any) {
      console.error("Error testing Firestore connection:", error);
      Alert.alert(
        "Connection Error",
        `Failed to connect/write to Firestore: ${
          error?.message || String(error)
        }`
      );
    } finally {
      setIsLoading((prev) => ({ ...prev, testConnection: false }));
    }
  };

  const handleSeedEmulator = async () => {
    try {
      setIsLoading((prev) => ({ ...prev, seed: true }));
      console.log("Starting seed operation...");
      await seedEmulator();
      console.log("Seed operation completed successfully");

      // Refresh class data after seeding
      await fetchClassData();

      Alert.alert("Success", "Database seeded successfully!");
    } catch (error: any) {
      console.error("Error in handleSeedEmulator:", error);
      Alert.alert(
        "Seeding Error",
        `Error seeding emulator: ${error?.message || String(error)}`
      );
    } finally {
      setIsLoading((prev) => ({ ...prev, seed: false }));
    }
  };

  const handleClearEmulator = async () => {
    try {
      setIsLoading((prev) => ({ ...prev, clear: true }));
      console.log("Starting clear operation...");
      await clearEmulatorData();
      console.log("Clear operation completed successfully");

      // Reset class data
      setClasses({
        CS101: {
          id: null,
          name: "Computer Science 101",
          sessionId: null,
          userIsEnrolled: false,
        },
        GermanA2: {
          id: null,
          name: "German A2",
          sessionId: null,
          userIsEnrolled: false,
        },
      });
    } catch (error: any) {
      console.error("Error in handleClearEmulator:", error);
      Alert.alert(
        "Clearing Error",
        `Error clearing emulator data: ${error?.message || String(error)}`
      );
    } finally {
      setIsLoading((prev) => ({ ...prev, clear: false }));
    }
  };

  // Helper function to fetch class info and enrollment status
  const fetchClassData = async () => {
    if (!user) return;

    try {
      // Find classes and check if user is enrolled
      for (const key of ["CS101", "GermanA2"]) {
        const className =
          key === "CS101" ? "Computer Science 101" : "German A2";

        // Find class
        const classesRef = collection(db, "classes");
        const classQuery = query(
          classesRef,
          where("name", "==", className),
          limit(1)
        );
        const classSnap = await getDocs(classQuery);

        let classId = null;
        let sessionId = null;
        let userIsEnrolled = false;

        if (!classSnap.empty) {
          classId = classSnap.docs[0].id;

          // Check if user is enrolled in this class
          const studentRef = doc(db, "classes", classId, "students", user.uid);
          const studentSnap = await getDoc(studentRef);
          userIsEnrolled = studentSnap.exists;

          // Check for active sessions
          const sessionsRef = collection(db, "sessions");
          const sessionQuery = query(
            sessionsRef,
            where("classId", "==", classId),
            where("status", "==", "active"),
            limit(1)
          );
          const sessionSnap = await getDocs(sessionQuery);

          if (!sessionSnap.empty) {
            sessionId = sessionSnap.docs[0].id;
          }
        }

        setClasses((prev) => ({
          ...prev,
          [key]: {
            ...prev[key],
            id: classId,
            sessionId,
            userIsEnrolled,
          },
        }));
      }
    } catch (error) {
      console.error("Error fetching class data:", error);
    }
  };

  const handleToggleUserInClass = async (classKey: string) => {
    try {
      const loadingKey =
        classKey === "CS101" ? "addUserCS101" : "addUserGermanA2";
      setIsLoading((prev) => ({ ...prev, [loadingKey]: true }));

      if (!user) {
        Alert.alert("No User", "No user logged in");
        return;
      }

      const classInfo = classes[classKey];
      if (!classInfo.id) {
        Alert.alert("Class Not Found", `${classInfo.name} not found`);
        return;
      }

      // If user is already enrolled, remove them
      if (classInfo.userIsEnrolled) {
        // Remove from class's students subcollection
        const studentRef = doc(
          db,
          "classes",
          classInfo.id,
          "students",
          user.uid
        );
        await deleteDoc(studentRef);

        // Remove from user's classes
        const userClassRef = doc(
          db,
          "userClasses",
          user.uid,
          "classes",
          classInfo.id
        );
        await deleteDoc(userClassRef);

        Alert.alert("Success", `User removed from ${classInfo.name}!`);
      } else {
        // 1. Ensure user exists in 'users' collection
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists) {
          await setDoc(userRef, {
            uid: user.uid,
            email: user.email || "",
            displayName: user.displayName || "Unnamed User",
            role: "student",
            created_at: Timestamp.now(),
          });
          console.log(`Created user document for ${user.uid}`);
        }

        // Find teacher name
        const classDocRef = doc(db, "classes", classInfo.id);
        const classDoc = await getDoc(classDocRef);
        const classData = classDoc.data() || {};
        const teacherName =
          classKey === "CS101" ? "Professor Smith" : "Frau Tuyen";

        // Add user to class's students subcollection
        const studentRef = doc(
          db,
          "classes",
          classInfo.id,
          "students",
          user.uid
        );
        await setDoc(studentRef, { joinDate: Timestamp.now() });

        // Add class to user's classes
        const userClassRef = doc(
          db,
          "userClasses",
          user.uid,
          "classes",
          classInfo.id
        );
        await setDoc(userClassRef, {
          className: classInfo.name,
          teacherName: teacherName,
          joinDate: Timestamp.now(),
        });

        Alert.alert("Success", `User added to ${classInfo.name}!`);
      }

      // Update the enrollment status
      await fetchClassData();
    } catch (error: any) {
      console.error(`Error toggling user in ${classKey}:`, error);
      Alert.alert(
        "Error",
        `Failed to modify enrollment: ${error?.message || String(error)}`
      );
    } finally {
      const loadingKey =
        classKey === "CS101" ? "addUserCS101" : "addUserGermanA2";
      setIsLoading((prev) => ({ ...prev, [loadingKey]: false }));
    }
  };

  const handleDeactivateSession = async (classKey: string) => {
    try {
      const loadingKey =
        classKey === "CS101" ? "deactivateCS101" : "deactivateGermanA2";
      setIsLoading((prev) => ({ ...prev, [loadingKey]: true }));

      const classInfo = classes[classKey];
      if (!classInfo.sessionId) {
        Alert.alert(
          "No Active Session",
          `No active session found for ${classInfo.name}.`
        );
        return;
      }

      console.log(
        `Deactivating session: ${classInfo.sessionId} for ${classInfo.name}...`
      );
      const sessionRef = doc(db, "sessions", classInfo.sessionId);
      await updateDoc(sessionRef, {
        status: "ended",
        endTime: Timestamp.now(),
      });

      // Update class info
      await fetchClassData();
      Alert.alert(
        "Success",
        `Session for ${classInfo.name} deactivated (ended)`
      );
    } catch (error: any) {
      console.error(`Error deactivating session for ${classKey}:`, error);
      Alert.alert(
        "Deactivation Error",
        `Error deactivating session: ${error?.message || String(error)}`
      );
    } finally {
      const loadingKey =
        classKey === "CS101" ? "deactivateCS101" : "deactivateGermanA2";
      setIsLoading((prev) => ({ ...prev, [loadingKey]: false }));
    }
  };

  const handleStartNewSession = async (classKey: string) => {
    if (!user) {
      Alert.alert("No User", "Cannot start session without logged in user.");
      return;
    }

    const classInfo = classes[classKey];
    if (!classInfo.id) {
      Alert.alert(
        "No Class",
        `Cannot start session, ${classInfo.name} not found.`
      );
      return;
    }

    // Check if there's already an active session
    if (classInfo.sessionId) {
      Alert.alert(
        "Session Active",
        `An active session already exists for ${classInfo.name}. Deactivate it first.`
      );
      return;
    }

    try {
      const loadingKey = classKey === "CS101" ? "startCS101" : "startGermanA2";
      setIsLoading((prev) => ({ ...prev, [loadingKey]: true }));
      console.log(
        `Starting new session for ${classInfo.name} (ID: ${classInfo.id})...`
      );

      // Use different locations for each class
      const location =
        classKey === "CS101"
          ? new GeoPoint(34.0522, -118.2437) // Los Angeles
          : new GeoPoint(52.52, 13.405); // Berlin

      // Define new session data
      const newSessionData = {
        classId: classInfo.id,
        teacherId: user.uid,
        startTime: Timestamp.now(),
        endTime: null,
        status: "active",
        location,
        radius: 100, // meters
        created_at: Timestamp.now(),
      };

      const sessionsCollectionRef = collection(db, "sessions");
      const newSessionRef = await addDoc(sessionsCollectionRef, newSessionData);

      console.log(`New session started with ID: ${newSessionRef.id}`);

      // Update class info
      await fetchClassData();
      Alert.alert("Success", `New session started for ${classInfo.name}!`);
    } catch (error: any) {
      console.error(`Error starting session for ${classKey}:`, error);
      Alert.alert(
        "Starting Error",
        `Error starting new session: ${error?.message || String(error)}`
      );
    } finally {
      const loadingKey = classKey === "CS101" ? "startCS101" : "startGermanA2";
      setIsLoading((prev) => ({ ...prev, [loadingKey]: false }));
    }
  };

  // Run check on component mount and when menu opens
  useEffect(() => {
    if (visible && user) {
      fetchClassData();
    }
  }, [visible, user]);

  // Create a button component with loading state
  const ActionButton = ({
    icon,
    text,
    onPress,
    isLoading,
    loadingText = "Processing...",
    disabled = false,
  }: ActionButtonProps) => (
    <TouchableOpacity
      style={[styles.button, (isLoading || disabled) && styles.buttonDisabled]}
      onPress={onPress}
      disabled={isLoading || disabled}
    >
      {isLoading ? (
        <>
          <ActivityIndicator size="small" color="white" />
          <Text style={styles.buttonText}>{loadingText}</Text>
        </>
      ) : (
        <>
          <Ionicons name={icon} size={20} color="white" />
          <Text style={styles.buttonText}>{text}</Text>
        </>
      )}
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <View style={styles.header}>
            <Text style={styles.title}>Developer Menu</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons
                name="close"
                size={24}
                color={theme.colors.button.primary}
              />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent}>
            <Text style={styles.sectionTitle}>Firebase Emulators</Text>

            <Text style={styles.emulatorInfo}>
              Status: Using emulator ({app.name}). Check logs for host/port.
            </Text>

            <ActionButton
              icon="flash-outline"
              text="Test Connection to Firestore"
              onPress={handleTestConnection}
              isLoading={isLoading.testConnection}
              loadingText="Testing connection..."
            />

            <ActionButton
              icon="leaf-outline"
              text="Seed Test Data"
              onPress={handleSeedEmulator}
              isLoading={isLoading.seed}
              loadingText="Seeding data..."
            />

            <ActionButton
              icon="skull-outline"
              text="Nuke Database"
              onPress={() => {
                Alert.alert(
                  "Nuke Database",
                  "Are you sure? This will permanently delete ALL data in the emulator database. This cannot be undone.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Nuke it!",
                      style: "destructive",
                      onPress: handleClearEmulator,
                    },
                  ]
                );
              }}
              isLoading={isLoading.clear}
              loadingText="Nuking database..."
            />

            <LocationPermissionButton />

            <Text style={styles.sectionTitle}>User Class Enrollment</Text>

            <ActionButton
              icon={
                classes.CS101.userIsEnrolled
                  ? "person-remove-outline"
                  : "person-add-outline"
              }
              text={
                classes.CS101.userIsEnrolled
                  ? "Remove User from Computer Science 101"
                  : "Add User to Computer Science 101"
              }
              onPress={() => handleToggleUserInClass("CS101")}
              isLoading={isLoading.addUserCS101}
              loadingText={
                classes.CS101.userIsEnrolled
                  ? "Removing user..."
                  : "Adding user..."
              }
              disabled={!user}
            />

            <ActionButton
              icon={
                classes.GermanA2.userIsEnrolled
                  ? "person-remove-outline"
                  : "person-add-outline"
              }
              text={
                classes.GermanA2.userIsEnrolled
                  ? "Remove User from German A2"
                  : "Add User to German A2"
              }
              onPress={() => handleToggleUserInClass("GermanA2")}
              isLoading={isLoading.addUserGermanA2}
              loadingText={
                classes.GermanA2.userIsEnrolled
                  ? "Removing user..."
                  : "Adding user..."
              }
              disabled={!user}
            />

            <Text style={styles.sectionTitle}>
              Computer Science 101 Session Control
            </Text>
            <Text style={styles.infoText}>
              {classes.CS101.id
                ? `Class ID: ${classes.CS101.id}`
                : "Class not found"}
              {classes.CS101.sessionId
                ? `\nCurrent Active Session ID: ${classes.CS101.sessionId}`
                : "\nNo active session detected."}
            </Text>

            <ActionButton
              icon="play-circle-outline"
              text="Start New CS101 Session"
              onPress={() => handleStartNewSession("CS101")}
              isLoading={isLoading.startCS101}
              loadingText="Starting..."
              disabled={!user || !classes.CS101.id || !!classes.CS101.sessionId}
            />

            <ActionButton
              icon="pause-circle-outline"
              text="Deactivate CS101 Session"
              onPress={() => handleDeactivateSession("CS101")}
              isLoading={isLoading.deactivateCS101}
              loadingText="Deactivating..."
              disabled={!classes.CS101.sessionId}
            />

            <Text style={styles.sectionTitle}>German A2 Session Control</Text>
            <Text style={styles.infoText}>
              {classes.GermanA2.id
                ? `Class ID: ${classes.GermanA2.id}`
                : "Class not found"}
              {classes.GermanA2.sessionId
                ? `\nCurrent Active Session ID: ${classes.GermanA2.sessionId}`
                : "\nNo active session detected."}
            </Text>

            <ActionButton
              icon="play-circle-outline"
              text="Start New German A2 Session"
              onPress={() => handleStartNewSession("GermanA2")}
              isLoading={isLoading.startGermanA2}
              loadingText="Starting..."
              disabled={
                !user || !classes.GermanA2.id || !!classes.GermanA2.sessionId
              }
            />

            <ActionButton
              icon="pause-circle-outline"
              text="Deactivate German A2 Session"
              onPress={() => handleDeactivateSession("GermanA2")}
              isLoading={isLoading.deactivateGermanA2}
              loadingText="Deactivating..."
              disabled={!classes.GermanA2.sessionId}
            />

            <Text style={styles.infoText}>
              The Firebase emulators should be running locally on your
              development machine. Run them with:
            </Text>
            <View style={styles.codeBlock}>
              <Text style={styles.code}>firebase emulators:start</Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalView: {
    width: "90%",
    maxHeight: "80%",
    backgroundColor: "white",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: theme.colors.text.primary,
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 16, // Added margin top
    color: theme.colors.text.primary,
  },
  emulatorInfo: {
    marginBottom: 16,
    padding: 10,
    backgroundColor: "#f0f8ff",
    borderRadius: 8,
    color: theme.colors.text.secondary,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
    fontSize: 12,
  },
  button: {
    backgroundColor: theme.colors.button.primary,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center", // Center content in button
  },
  buttonDisabled: {
    backgroundColor: theme.colors.button.primary + "99", // Adding transparency
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
    marginLeft: 8,
  },
  infoText: {
    marginTop: 4, // Reduced margin top
    marginBottom: 12, // Increased margin bottom
    color: theme.colors.text.secondary,
    lineHeight: 20,
    fontSize: 13,
  },
  codeBlock: {
    backgroundColor: "#f1f1f1",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  code: {
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
    color: "#c41a16",
    fontSize: 13,
  },
});
