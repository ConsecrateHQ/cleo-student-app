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

// Web SDK imports
import {
  collection as webCollection,
  doc as webDoc,
  getDoc as webGetDoc,
  setDoc as webSetDoc,
  addDoc as webAddDoc,
  query as webQuery,
  where as webWhere,
  getDocs as webGetDocs,
  updateDoc as webUpdateDoc,
  deleteDoc as webDeleteDoc,
  Timestamp as webTimestamp,
  GeoPoint as webGeoPoint,
  limit as webLimit,
  serverTimestamp as webServerTimestamp,
} from "firebase/firestore";

// Import initializeFirestore for the temporary cloud instance
import { initializeFirestore as initializeWebFirestore } from "firebase/firestore";

// React Native Firebase imports
// import {
//   FirebaseFirestoreTypes,
//   getFirestore,
//   collection,
//   doc,
//   getDoc,
//   setDoc,
//   addDoc,
//   query,
//   where,
//   getDocs,
//   updateDoc,
//   deleteDoc,
//   Timestamp,
//   GeoPoint,
//   limit,
// } from "@react-native-firebase/firestore";
import {
  webApp,
  webDb, // Potentially emulator-connected
  // rnApp, // Remove RN App
  // rnDb, // Remove RN DB
  // Remove cloudWebDb, cloudRnDb imports as they are no longer exported
  // useWebSDK, // Remove useWebSDK
  useEmulator,
  firebaseConfig, // Import firebaseConfig to initialize temporary instance
} from "../utils/firebaseConfig"; // Import new cloud instances

// Web SDK imports for Firebase core functionality needed for temp instance
import { initializeApp, getApp, getApps, deleteApp } from "firebase/app";

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

// Get the configured Firestore instance - ALWAYS use webDb
// const db = useWebSDK ? webDb : rnDb;
const db = webDb;

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

  // Add a function to test the currently configured connection (emulator or cloud)
  const handleTestConnection = async () => {
    setIsLoading((prev) => ({ ...prev, testConnection: true }));
    const target = useEmulator ? "Emulator" : "Cloud";
    const testCollectionName = `dev_menu_connection_test_${target.toLowerCase()}`;
    const testDocId = `test_${Platform.OS}_${Date.now()}`;

    const testData = {
      timestamp: webServerTimestamp(),
      message: `Connection test from DevMenu (${target})`,
      userId: user?.uid || "unknown",
      platform: Platform.OS,
      timestampClient: new Date().toISOString(),
    };

    try {
      console.log(
        `[DevMenu] Attempting to write test document to ${target} Firestore collection '${testCollectionName}' using configured 'webDb'...`
      );

      // Use the configured webDb instance
      const testCollectionRef = webCollection(webDb, testCollectionName);
      const testDocRef = webDoc(testCollectionRef, testDocId);

      // Write
      await webSetDoc(testDocRef, testData);
      console.log(`[DevMenu] ✅ Wrote test doc to ${target}`);

      // Read
      const snap = await webGetDoc(testDocRef);
      if (!snap.exists()) {
        throw new Error(`Test doc ${testDocId} not found after write`);
      }
      console.log(`[DevMenu] ✅ Read test doc from ${target}`);

      // Delete
      await webDeleteDoc(testDocRef);
      console.log(`[DevMenu] ✅ Deleted test doc from ${target}`);

      Alert.alert(
        `${target} Connection Success`,
        `Successfully performed write/read/delete test on the configured ${target} Firestore instance!
Collection: ${testCollectionName}`
      );
    } catch (err) {
      console.error(
        `[DevMenu] Error testing connection to ${target} Firestore:`,
        err
      );
      Alert.alert(
        "Connection Error",
        `Failed to connect/interact with ${target} Firestore: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    } finally {
      setIsLoading((prev) => ({ ...prev, testConnection: false }));
    }
  };

  const handleSeedEmulator = async () => {
    const target = useEmulator ? "emulator" : "CLOUD database";
    try {
      setIsLoading((prev) => ({ ...prev, seed: true }));
      console.log(`Starting seed operation for ${target}...`);
      await seedEmulator(); // seedEmulator should use the configured db internally
      console.log(`Seed operation for ${target} completed successfully`);

      // Refresh class data after seeding
      await fetchClassData();

      Alert.alert("Success", "Database seeded successfully!");
    } catch (error: any) {
      console.error("Error in handleSeedEmulator:", error);
      Alert.alert(
        "Seeding Error",
        `Error seeding ${target}: ${error?.message || String(error)}`
      );
    } finally {
      setIsLoading((prev) => ({ ...prev, seed: false }));
    }
  };

  const handleClearEmulator = async () => {
    const target = useEmulator ? "emulator" : "CLOUD database";
    if (!useEmulator) {
      Alert.alert(
        "Safety Check",
        "Clearing cloud data is disabled from the Dev Menu for safety. Please use the Firebase console."
      );
      return;
    }

    // Confirm before clearing emulator
    Alert.alert(
      "Clear Emulator Data",
      "Are you sure you want to delete ALL data in the Firestore emulator? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear Emulator",
          style: "destructive",
          onPress: async () => {
            try {
              setIsLoading((prev) => ({ ...prev, clear: true }));
              console.log(`Starting clear operation for ${target}...`);
              await clearEmulatorData(); // clearEmulatorData should use the configured db
              console.log(
                `Clear operation for ${target} completed successfully`
              );

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
              Alert.alert("Success", `Emulator data cleared!`);
            } catch (error: any) {
              console.error(`Error in handleClearEmulator (${target}):`, error);
              Alert.alert(
                "Clearing Error",
                `Error clearing ${target} data: ${
                  error?.message || String(error)
                }`
              );
            } finally {
              setIsLoading((prev) => ({ ...prev, clear: false }));
            }
          },
        },
      ]
    );
  };

  // Helper function to fetch class info and enrollment status
  const fetchClassData = async () => {
    if (!user) return;

    try {
      // Find classes and check if user is enrolled
      for (const key of ["CS101", "GermanA2"]) {
        const className =
          key === "CS101" ? "Computer Science 101" : "German A2";

        // ALWAYS use Web SDK implementation
        // Find class
        const classesRef = webCollection(webDb, "classes");
        const classQuery = webQuery(
          classesRef,
          webWhere("name", "==", className),
          webLimit(1)
        );
        const classSnap = await webGetDocs(classQuery);

        let classId = null;
        let sessionId = null;
        let userIsEnrolled = false;

        if (!classSnap.empty) {
          classId = classSnap.docs[0].id;

          // Check if user is enrolled in this class
          const studentRef = webDoc(
            webDb,
            "classes",
            classId,
            "students",
            user.uid
          );
          const studentSnap = await webGetDoc(studentRef);
          userIsEnrolled = studentSnap.exists();

          // Check for active sessions
          const sessionsRef = webCollection(webDb, "sessions");
          const sessionQuery = webQuery(
            sessionsRef,
            webWhere("classId", "==", classId),
            webWhere("status", "==", "active"),
            webLimit(1)
          );
          const sessionSnap = await webGetDocs(sessionQuery);

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
      console.error(`Error fetching class data (Web SDK):`, error);
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

      // ALWAYS Use Web SDK implementation
      if (classInfo.userIsEnrolled) {
        // Remove from class's students subcollection
        const studentRef = webDoc(
          webDb,
          "classes",
          classInfo.id,
          "students",
          user.uid
        );
        await webDeleteDoc(studentRef);

        // Remove from user's classes
        const userClassRef = webDoc(
          webDb,
          "userClasses",
          user.uid,
          "classes",
          classInfo.id
        );
        await webDeleteDoc(userClassRef);

        Alert.alert("Success", `User removed from ${classInfo.name}!`);
      } else {
        // 1. Ensure user exists in 'users' collection
        const userRef = webDoc(webDb, "users", user.uid);
        const userSnap = await webGetDoc(userRef);
        if (!userSnap.exists()) {
          await webSetDoc(userRef, {
            uid: user.uid,
            email: user.email || "",
            displayName: user.displayName || "Unnamed User",
            role: "student",
            created_at: webServerTimestamp(),
          });
          console.log(`Created user document for ${user.uid} (Web SDK)`);
        }

        // Find teacher name
        const classDocRef = webDoc(webDb, "classes", classInfo.id);
        const classDoc = await webGetDoc(classDocRef);
        const classData = classDoc.data() || {};
        const teacherName =
          classKey === "CS101" ? "Professor Smith" : "Frau Tuyen";

        // Add user to class's students subcollection
        const studentRef = webDoc(
          webDb,
          "classes",
          classInfo.id,
          "students",
          user.uid
        );
        await webSetDoc(studentRef, { joinDate: webServerTimestamp() });

        // Add class to user's classes
        const userClassRef = webDoc(
          webDb,
          "userClasses",
          user.uid,
          "classes",
          classInfo.id
        );
        await webSetDoc(userClassRef, {
          className: classInfo.name,
          teacherName: teacherName,
          joinDate: webServerTimestamp(),
        });

        Alert.alert("Success", `User added to ${classInfo.name}!`);
      }

      // Update the enrollment status
      await fetchClassData();
    } catch (error: any) {
      console.error(`Error toggling user in ${classKey} (Web SDK):`, error);
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

      // ALWAYS Use Web SDK implementation
      const sessionRefWeb = webDoc(webDb, "sessions", classInfo.sessionId);
      await webUpdateDoc(sessionRefWeb, {
        status: "ended",
        endTime: webServerTimestamp(),
      });

      // Update class info
      await fetchClassData();
      Alert.alert(
        "Success",
        `Session for ${classInfo.name} deactivated (ended)`
      );
    } catch (error: any) {
      console.error(
        `Error deactivating session for ${classKey} (Web SDK):`,
        error
      );
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

      // ALWAYS Use Web SDK implementation
      // Use different locations for each class
      const location =
        classKey === "CS101"
          ? new webGeoPoint(34.0522, -118.2437) // Los Angeles
          : new webGeoPoint(52.52, 13.405); // Berlin

      // Define new session data
      const newSessionData = {
        classId: classInfo.id,
        teacherId: user.uid,
        startTime: webServerTimestamp(),
        endTime: null,
        status: "active",
        location,
        radius: 100, // meters
        created_at: webServerTimestamp(),
      };

      const sessionsCollectionRef = webCollection(webDb, "sessions");
      const newSessionRef = await webAddDoc(
        sessionsCollectionRef,
        newSessionData
      );

      console.log(`New session started with ID: ${newSessionRef.id} (Web SDK)`);

      // Update class info
      await fetchClassData();
      Alert.alert("Success", `New session started for ${classInfo.name}!`);
    } catch (error: any) {
      console.error(`Error starting session for ${classKey} (Web SDK):`, error);
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
            <Text style={styles.sectionTitle}>Firebase Connection</Text>

            <Text style={styles.emulatorInfo}>
              Status: Using Web SDK
              {webApp ? ` (${webApp.name || "unnamed"})` : ""}
              {"\n"}Target:
              {useEmulator ? " 🔥 Local Emulator" : " ☁️ Firebase Cloud"}
            </Text>

            <ActionButton
              icon="flash-outline"
              text={`Test Connection to ${useEmulator ? "Emulator" : "Cloud"}`}
              onPress={handleTestConnection}
              isLoading={isLoading.testConnection}
              loadingText={`Testing ${useEmulator ? "emulator" : "cloud"}...`}
            />

            <ActionButton
              icon="leaf-outline"
              text={`Seed ${
                useEmulator ? "Emulator" : "Cloud (Disabled)"
              } Data`}
              onPress={handleSeedEmulator}
              isLoading={isLoading.seed}
              loadingText={`Seeding ${useEmulator ? "emulator" : "cloud"}...`}
              disabled={!useEmulator} // Disable seeding cloud from DevMenu for safety
            />

            <ActionButton
              icon="skull-outline"
              text={`Clear ${
                useEmulator ? "Emulator" : "Cloud (Disabled)"
              } Data`}
              onPress={handleClearEmulator} // Confirmation is now inside handleClearEmulator
              isLoading={isLoading.clear}
              loadingText={`Clearing ${useEmulator ? "emulator" : "cloud"}...`}
              disabled={!useEmulator} // Disable clearing cloud from DevMenu
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
