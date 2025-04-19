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

  const db = getFirestore(app);

  // Test connection to Firestore
  const handleTestConnection = async () => {
    setIsLoading((prev) => ({ ...prev, testConnection: true }));
    try {
      const q = query(collection(db, "classes"), limit(1));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        Alert.alert("Success", "Connected to Firebase! No classes found.");
      } else {
        Alert.alert(
          "Success",
          `Connected to Firebase! Found ${snapshot.size} class.`
        );
      }
    } catch (err) {
      Alert.alert(
        "Error",
        `Failed to connect: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      setIsLoading((prev) => ({ ...prev, testConnection: false }));
    }
  };

  // Seed the emulator with test data
  const handleSeedEmulator = async () => {
    setIsLoading((prev) => ({ ...prev, seed: true }));
    try {
      await seedEmulator();
      Alert.alert("Success", "Emulator seeded with test data!");
      // Fetch updated class data after seeding
      fetchClassData();
    } catch (err) {
      Alert.alert(
        "Error",
        `Failed to seed: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      setIsLoading((prev) => ({ ...prev, seed: false }));
    }
  };

  // Clear emulator data
  const handleClearEmulator = async () => {
    setIsLoading((prev) => ({ ...prev, clear: true }));
    try {
      await clearEmulatorData();
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
      const cs101Query = query(
        collection(db, "classes"),
        where("joinCode", "==", "CS101")
      );
      const cs101Snapshot = await getDocs(cs101Query);
      const cs101Doc = cs101Snapshot.docs[0];

      // Get German A2 class
      const germanQuery = query(
        collection(db, "classes"),
        where("joinCode", "==", "GERMA2")
      );
      const germanSnapshot = await getDocs(germanQuery);
      const germanDoc = germanSnapshot.docs[0];

      // Update class IDs
      const updatedClasses = { ...classes };

      if (cs101Doc) {
        updatedClasses.CS101.id = cs101Doc.id;
        // Check if user is enrolled
        const userClassRef = doc(
          db,
          "userClasses",
          user.uid,
          "classes",
          cs101Doc.id
        );
        const userClassDoc = await getDoc(userClassRef);
        updatedClasses.CS101.userIsEnrolled = userClassDoc.exists;

        // Check for active session
        const activeSessionQuery = query(
          collection(db, "classes", cs101Doc.id, "sessions"),
          where("isActive", "==", true)
        );
        const activeSessionSnapshot = await getDocs(activeSessionQuery);

        if (!activeSessionSnapshot.empty) {
          updatedClasses.CS101.sessionId = activeSessionSnapshot.docs[0].id;
        } else {
          updatedClasses.CS101.sessionId = "";
        }
      }

      if (germanDoc) {
        updatedClasses.GermanA2.id = germanDoc.id;
        // Check if user is enrolled
        const userClassRef = doc(
          db,
          "userClasses",
          user.uid,
          "classes",
          germanDoc.id
        );
        const userClassDoc = await getDoc(userClassRef);
        updatedClasses.GermanA2.userIsEnrolled = userClassDoc.exists;

        // Check for active session
        const activeSessionQuery = query(
          collection(db, "classes", germanDoc.id, "sessions"),
          where("isActive", "==", true)
        );
        const activeSessionSnapshot = await getDocs(activeSessionQuery);

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
        // Add user to class's students subcollection
        const studentRef = doc(
          db,
          "classes",
          classInfo.id,
          "students",
          user.uid
        );
        await setDoc(studentRef, {
          userId: user.uid,
          displayName: user.displayName || "Unknown User",
          email: user.email || "unknown@example.com",
          enrolledAt: Timestamp.now(),
        });

        // Add class to user's classes
        const userClassRef = doc(
          db,
          "userClasses",
          user.uid,
          "classes",
          classInfo.id
        );
        await setDoc(userClassRef, {
          classId: classInfo.id,
          className: classInfo.name,
          joinedAt: Timestamp.now(),
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
            // Add new session document
            const sessionsCollectionRef = collection(
              db,
              "classes",
              classInfo.id,
              "sessions"
            );

            const newSessionRef = await addDoc(sessionsCollectionRef, {
              createdBy: user?.uid,
              createdAt: Timestamp.now(),
              isActive: true,
              location: new GeoPoint(
                position.coords.latitude,
                position.coords.longitude
              ),
              radiusMeters: 100, // Default radius
            });

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
      const sessionRef = doc(
        db,
        "classes",
        classInfo.id,
        "sessions",
        classInfo.sessionId
      );

      await updateDoc(sessionRef, {
        isActive: false,
        endedAt: Timestamp.now(),
        endedBy: user?.uid,
      });

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
          icon="trash-outline"
          text="Clear All Data"
          onPress={handleClearEmulator}
          isLoading={isLoading.clear}
          loadingText="Clearing data..."
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
