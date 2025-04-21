import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import theme from "../theme";
import useAuthStore from "../hooks/useAuthStore";
import LocationPermissionButton from "../components/LocationPermissionButton";
import { seedEmulator, clearEmulatorData } from "../utils/seedEmulator";

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
  initializeFirestore as initializeWebFirestore,
} from "firebase/firestore";

// Import core Web SDK functions and config
import { initializeApp, getApp, getApps } from "firebase/app";

// React Native Firebase imports
// import {
//   FirebaseFirestoreTypes,
//   getFirestore,
//   collection as rnCollection,
//   doc as rnDoc,
//   getDoc as rnGetDoc,
//   setDoc as rnSetDoc,
//   addDoc as rnAddDoc,
//   query as rnQuery,
//   where as rnWhere,
//   getDocs as rnGetDocs,
//   updateDoc as rnUpdateDoc,
//   deleteDoc as rnDeleteDoc,
//   Timestamp as rnTimestamp,
//   GeoPoint as rnGeoPoint,
//   limit as rnLimit,
// } from "@react-native-firebase/firestore";

import {
  webApp,
  webDb,
  // rnApp, // Remove RN App import
  // rnDb, // Remove RN DB import
  // useWebSDK, // Remove useWebSDK import
  useEmulator,
  firebaseConfig, // Import config
  initializeFirebase, // Import initializeFirebase
} from "../utils/firebaseConfig"; // Import SDK-specific variables

interface ActionButtonProps {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  text: string;
  onPress: () => void;
  isLoading: boolean;
  loadingText?: string;
  disabled?: boolean;
}

interface ClassInfo {
  id: string;
  name: string;
  userIsEnrolled: boolean;
  sessionId: string;
}

interface ClassesState {
  CS101: ClassInfo;
  GermanA2: ClassInfo;
}

type ClassKey = "CS101" | "GermanA2";

export default function DevScreen() {
  const user = useAuthStore((state) => state.user);

  // State
  const [isLoading, setIsLoading] = useState({
    testConnection: false,
    seed: false,
    clear: false,
    addUserCS101: false,
    addUserGermanA2: false,
    startCS101: false,
    startGermanA2: false,
    deactivateCS101: false,
    deactivateGermanA2: false,
  });

  const [classes, setClasses] = useState<ClassesState>({
    CS101: {
      id: "",
      name: "Computer Science 101",
      userIsEnrolled: false,
      sessionId: "",
    },
    GermanA2: {
      id: "",
      name: "German A2",
      userIsEnrolled: false,
      sessionId: "",
    },
  });

  // Test connection to Firestore - Modified to create a single test document
  const handleTestConnection = async () => {
    setIsLoading((prev) => ({ ...prev, testConnection: true }));
    const target = useEmulator ? "Emulator" : "Cloud";
    // Use a consistent collection name for easier verification
    const testCollectionName = `_connection_tests`;
    const testDocId = `dev_screen_${Platform.OS}_${Date.now()}`;

    const testData = {
      timestamp: webServerTimestamp(),
      message: `Connection test from dev.tsx (${target})`,
      userId: user?.uid || "unknown",
      platform: Platform.OS,
      timestampClient: new Date().toISOString(),
      targetInstance: target,
    };

    try {
      console.log(
        `Attempting to create test document in ${target} Firestore collection '${testCollectionName}' using configured 'webDb'...`
      );

      // Use the configured webDb instance
      const testCollectionRef = webCollection(webDb, testCollectionName);
      const testDocRef = webDoc(testCollectionRef, testDocId);

      // Only Write
      await webSetDoc(testDocRef, testData);
      console.log(`[DevScreen] ✅ Created test doc in ${target}`);

      Alert.alert(
        `${target} Connection Write Success`,
        `Successfully created a test document in the configured ${target} Firestore instance.\n\nCollection: ${testCollectionName}\nDocument ID: ${testDocId}\n\nPlease verify manually.`
      );
    } catch (err) {
      console.error(
        `[DevScreen] Error testing connection to ${target} Firestore:`,
        err
      );
      Alert.alert(
        "Connection Error",
        `Failed to write to ${target} Firestore: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    } finally {
      setIsLoading((prev) => ({ ...prev, testConnection: false }));
    }
  };

  // Seed the database (emulator or cloud based on config)
  const handleSeedDatabase = async () => {
    const target = useEmulator ? "emulator" : "CLOUD database";
    setIsLoading((prev) => ({ ...prev, seed: true }));
    try {
      console.log(`[DevScreen] Seeding ${target}...`);
      // seedEmulator uses the configured instance (via getFirestore(app) and initializeFirebase)
      await seedEmulator();
      // The alert inside seedEmulator might be generic, consider adding a specific one here
      Alert.alert("Success", `Database seeded successfully (${target})!`);
      // Fetch updated class data after seeding
      fetchClassData();
    } catch (err) {
      console.error(`[DevScreen] Error seeding ${target}:`, err);
      Alert.alert(
        "Error",
        `Failed to seed ${target}: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    } finally {
      setIsLoading((prev) => ({ ...prev, seed: false }));
    }
  };

  // Clear emulator data
  const handleClearEmulator = async () => {
    setIsLoading((prev) => ({ ...prev, clear: true }));
    try {
      // clearEmulatorData needs to be compatible with both SDKs or adapted
      await clearEmulatorData(); // Assuming clearEmulatorData handles SDK choice internally
      Alert.alert("Success", "Emulator data cleared!");
      // Reset class state after clearing
      setClasses({
        CS101: {
          id: "",
          name: "Computer Science 101",
          userIsEnrolled: false,
          sessionId: "",
        },
        GermanA2: {
          id: "",
          name: "German A2",
          userIsEnrolled: false,
          sessionId: "",
        },
      });
    } catch (err) {
      Alert.alert(
        "Error",
        `Failed to clear data: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    } finally {
      setIsLoading((prev) => ({ ...prev, clear: false }));
    }
  };

  // Fetch data about available classes
  const fetchClassData = async () => {
    if (!user) return;

    try {
      // Get CS101 class
      const cs101Query = webQuery(
        webCollection(webDb, "classes"),
        webWhere("joinCode", "==", "CS101")
      );
      const cs101Snapshot = await webGetDocs(cs101Query);
      const cs101Doc = cs101Snapshot.docs[0];

      // Get German A2 class
      const germanQuery = webQuery(
        webCollection(webDb, "classes"),
        webWhere("joinCode", "==", "GER102")
      );
      const germanSnapshot = await webGetDocs(germanQuery);
      const germanDoc = germanSnapshot.docs[0];

      // Update class IDs
      const updatedClasses = { ...classes };

      if (cs101Doc) {
        updatedClasses.CS101.id = cs101Doc.id;
        // Check if user is enrolled - ALWAYS use Web SDK
        const userClassRefWeb = webDoc(
          webDb,
          "userClasses",
          user.uid,
          "classes",
          cs101Doc.id
        );
        const userClassDocWeb = await webGetDoc(userClassRefWeb);
        updatedClasses.CS101.userIsEnrolled = userClassDocWeb.exists();

        // Check for active session
        // Note: Session structure might differ between SDK usages
        const activeSessionQuery = webQuery(
          webCollection(webDb, "classes", cs101Doc.id, "sessions"),
          webWhere("isActive", "==", true), // Assuming 'isActive' field exists
          webLimit(1)
        );
        const activeSessionSnapshot = await webGetDocs(activeSessionQuery);

        if (!activeSessionSnapshot.empty) {
          updatedClasses.CS101.sessionId = activeSessionSnapshot.docs[0].id;
        } else {
          updatedClasses.CS101.sessionId = "";
        }
      }

      if (germanDoc) {
        updatedClasses.GermanA2.id = germanDoc.id;
        // Check if user is enrolled - ALWAYS use Web SDK
        const userClassRefWebGerman = webDoc(
          webDb,
          "userClasses",
          user.uid,
          "classes",
          germanDoc.id
        );
        const userClassDocWebGerman = await webGetDoc(userClassRefWebGerman);
        updatedClasses.GermanA2.userIsEnrolled = userClassDocWebGerman.exists();

        // Check for active session
        const activeSessionQuery = webQuery(
          webCollection(webDb, "classes", germanDoc.id, "sessions"),
          webWhere("isActive", "==", true),
          webLimit(1)
        );
        const activeSessionSnapshot = await webGetDocs(activeSessionQuery);

        if (!activeSessionSnapshot.empty) {
          updatedClasses.GermanA2.sessionId = activeSessionSnapshot.docs[0].id;
        } else {
          updatedClasses.GermanA2.sessionId = "";
        }
      }

      setClasses(updatedClasses);
    } catch (err) {
      console.error("Error fetching class data:", err);
    }
  };

  // Add/Remove user from class
  const handleToggleUserInClass = async (classKey: ClassKey) => {
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
        // Add user to class's students subcollection
        const studentRef = webDoc(
          webDb,
          "classes",
          classInfo.id,
          "students",
          user.uid
        );
        await webSetDoc(studentRef, {
          userId: user.uid,
          displayName: user.displayName || "Unknown User",
          email: user.email || "unknown@example.com",
          enrolledAt: webServerTimestamp(), // ALWAYS use Web SDK timestamp
        });

        // Add class to user's classes
        const userClassRef = webDoc(
          webDb,
          "userClasses",
          user.uid,
          "classes",
          classInfo.id
        );
        await webSetDoc(userClassRef, {
          classId: classInfo.id,
          className: classInfo.name,
          joinedAt: webServerTimestamp(), // ALWAYS use Web SDK timestamp
        });

        Alert.alert("Success", `User added to ${classInfo.name}!`);
      }

      // Refresh class data
      fetchClassData();
    } catch (err) {
      Alert.alert(
        "Error",
        `Failed to update enrollment: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    } finally {
      const loadingKey =
        classKey === "CS101" ? "addUserCS101" : "addUserGermanA2";
      setIsLoading((prev) => ({ ...prev, [loadingKey]: false }));
    }
  };

  // Start a new session for a class
  const handleStartNewSession = async (classKey: ClassKey) => {
    try {
      const loadingKey = classKey === "CS101" ? "startCS101" : "startGermanA2";
      setIsLoading((prev) => ({ ...prev, [loadingKey]: true }));

      const classInfo = classes[classKey];
      if (!classInfo.id) {
        Alert.alert("Error", `${classInfo.name} not found.`);
        return;
      }

      // Get current geolocation
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            // Add new session document - ALWAYS use Web SDK
            const sessionsCollectionRef = webCollection(
              webDb,
              "classes",
              classInfo.id,
              "sessions"
            );

            const sessionData = {
              createdBy: user?.uid,
              createdAt: webServerTimestamp(), // ALWAYS use Web SDK timestamp
              isActive: true,
              location: new webGeoPoint(
                position.coords.latitude,
                position.coords.longitude
              ),
              radiusMeters: 100, // Default radius
            };

            const newSessionRef = await webAddDoc(
              sessionsCollectionRef,
              sessionData
            );

            Alert.alert(
              "Success",
              `New session started for ${classInfo.name}!\nSession ID: ${newSessionRef.id}`
            );

            // Refresh class data
            fetchClassData();
          } catch (err) {
            Alert.alert(
              "Error",
              `Failed to create session: ${
                err instanceof Error ? err.message : String(err)
              }`
            );
          } finally {
            const loadingKey =
              classKey === "CS101" ? "startCS101" : "startGermanA2";
            setIsLoading((prev) => ({ ...prev, [loadingKey]: false }));
          }
        },
        (error) => {
          Alert.alert(
            "Location Error",
            `Failed to get location: ${error.message}`
          );
          const loadingKey =
            classKey === "CS101" ? "startCS101" : "startGermanA2";
          setIsLoading((prev) => ({ ...prev, [loadingKey]: false }));
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
        }
      );
    } catch (err) {
      Alert.alert(
        "Error",
        `Unknown error: ${err instanceof Error ? err.message : String(err)}`
      );
      const loadingKey = classKey === "CS101" ? "startCS101" : "startGermanA2";
      setIsLoading((prev) => ({ ...prev, [loadingKey]: false }));
    }
  };

  // Deactivate an active session
  const handleDeactivateSession = async (classKey: ClassKey) => {
    try {
      const loadingKey =
        classKey === "CS101" ? "deactivateCS101" : "deactivateGermanA2";
      setIsLoading((prev) => ({ ...prev, [loadingKey]: true }));

      const classInfo = classes[classKey];
      if (!classInfo.id || !classInfo.sessionId) {
        Alert.alert("Error", "No active session found.");
        return;
      }

      // Update the session document
      const sessionRef = webDoc(
        webDb,
        "classes",
        classInfo.id,
        "sessions",
        classInfo.sessionId
      );

      const updateData = {
        isActive: false,
        endedAt: webServerTimestamp(), // ALWAYS use Web SDK timestamp
        endedBy: user?.uid,
      };

      await webUpdateDoc(sessionRef, updateData);

      Alert.alert("Success", `Session for ${classInfo.name} deactivated!`);

      // Refresh class data
      fetchClassData();
    } catch (err) {
      Alert.alert(
        "Error",
        `Failed to deactivate session: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    } finally {
      const loadingKey =
        classKey === "CS101" ? "deactivateCS101" : "deactivateGermanA2";
      setIsLoading((prev) => ({ ...prev, [loadingKey]: false }));
    }
  };

  // Run check on component mount
  useEffect(() => {
    if (user) {
      fetchClassData();
    }
  }, [user]);

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
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>Developer Menu</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.closeButton}
        >
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
          Status:{" "}
          {useEmulator
            ? `🔥 Using Firebase Emulator (${
                webApp?.name || "default"
              }). Operations target the emulator.`
            : `☁️ Using REAL Firebase instance (${
                webApp?.name || "default"
              }). Operations target the cloud.`}
        </Text>

        <ActionButton
          icon="information-circle-outline"
          text="Firebase Mode Info"
          onPress={() =>
            Alert.alert(
              "Firebase Configuration",
              "To toggle between Firebase emulator and real Firebase:\n\n1. Open utils/firebaseConfig.ts\n2. Change the 'useEmulator' boolean value\n3. Restart the app",
              [{ text: "OK", style: "default" }]
            )
          }
          isLoading={false}
          loadingText=""
        />

        <ActionButton
          icon="flash-outline"
          text={`Test Connection to ${useEmulator ? "Emulator" : "Cloud"}`}
          onPress={handleTestConnection}
          isLoading={isLoading.testConnection}
          loadingText={`Testing ${useEmulator ? "Emulator" : "Cloud"}...`}
        />

        <ActionButton
          icon="leaf-outline"
          text={useEmulator ? "Seed Emulator" : "Seed Cloud Database"}
          onPress={handleSeedDatabase}
          isLoading={isLoading.seed}
          loadingText={useEmulator ? "Seeding emulator..." : "Seeding cloud..."}
        />

        <ActionButton
          icon="trash-outline"
          text={`Clear ${
            useEmulator ? "Emulator" : "Cloud (Not Recommended)"
          } Data`}
          onPress={() => {
            const target = useEmulator ? "emulator" : "CLOUD";
            Alert.alert(
              `Clear ${target} Data`,
              `Are you sure you want to clear all data in the ${target}? This is ${
                useEmulator ? "" : "NOT recommended and potentially "
              }irreversible.`,
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: `Clear ${target}`,
                  style: "destructive",
                  onPress: handleClearEmulator, // Note: clearEmulatorData might need adjustment if intended for cloud
                },
              ]
            );
          }}
          isLoading={isLoading.clear}
          loadingText={`Clearing ${useEmulator ? "emulator" : "cloud"}...`}
        />

        <LocationPermissionButton />

        <Text style={styles.sectionTitle}>User Enrollment</Text>
        <Text style={styles.infoText}>
          {!user ? "You need to be logged in to use these features." : ""}
        </Text>

        <ActionButton
          icon={
            classes.CS101.userIsEnrolled
              ? "person-remove-outline"
              : "person-add-outline"
          }
          text={
            classes.CS101.userIsEnrolled
              ? "Remove User from CS101"
              : "Add User to CS101"
          }
          onPress={() => handleToggleUserInClass("CS101")}
          isLoading={isLoading.addUserCS101}
          loadingText={
            classes.CS101.userIsEnrolled ? "Removing user..." : "Adding user..."
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
          The Firebase emulators should be running locally on your development
          machine. Run them with:
        </Text>
        <View style={styles.codeBlock}>
          <Text style={styles.code}>firebase emulators:start</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#121212",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
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
    marginTop: 16,
    color: theme.colors.text.primary,
  },
  emulatorInfo: {
    marginBottom: 16,
    padding: 10,
    backgroundColor: "#1a1a1a",
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
    justifyContent: "center",
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
    marginTop: 4,
    marginBottom: 12,
    color: theme.colors.text.secondary,
    lineHeight: 20,
    fontSize: 13,
  },
  codeBlock: {
    backgroundColor: "#1a1a1a",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  code: {
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
    color: "#17c964",
    fontSize: 14,
  },
});
