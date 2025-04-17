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
import firestore, {
  FirebaseFirestoreTypes,
} from "@react-native-firebase/firestore";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  query,
  where,
  getDocs,
  updateDoc,
  Timestamp,
  GeoPoint,
  limit,
} from "@react-native-firebase/firestore";

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

export default function DevMenu({ visible, onClose }: DevMenuProps) {
  const user = useAuthStore((state) => state.user);
  const [isLoading, setIsLoading] = useState<{
    [key: string]: boolean;
  }>({
    seed: false,
    clear: false,
    addUser: false,
    deactivate: false,
    start: false,
  });
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentClassId, setCurrentClassId] = useState<string | null>(null);

  // Hardcoded sample class and session IDs (should match your seeding logic)
  const SAMPLE_CLASS_NAME = "Computer Science 101";

  const handleSeedEmulator = async () => {
    try {
      setIsLoading((prev) => ({ ...prev, seed: true }));
      console.log("Starting seed operation...");
      await seedEmulator();
      console.log("Seed operation completed successfully");
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

  const handleAddCurrentUserToClass = async () => {
    try {
      setIsLoading((prev) => ({ ...prev, addUser: true }));

      if (!user) {
        Alert.alert("No User", "No user logged in");
        return;
      }

      // 1. Ensure user exists in 'users' collection
      const userRef = doc(firestore(), "users", user.uid);
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

      console.log("Finding sample class...");
      const classesRef = collection(firestore(), "classes");
      const q = query(
        classesRef,
        where("name", "==", SAMPLE_CLASS_NAME),
        limit(1)
      );
      const classSnap = await getDocs(q);

      if (classSnap.empty) {
        Alert.alert("Class Not Found", "Sample class not found");
        return;
      }
      const classDoc = classSnap.docs[0];
      const classId = classDoc.id;
      const classData = classDoc.data();

      console.log(`Adding user ${user.uid} to class ${classId}...`);
      const studentRef = doc(
        firestore(),
        "classes",
        classId,
        "students",
        user.uid
      );
      await setDoc(studentRef, { joinDate: Timestamp.now() });

      const userClassRef = doc(
        firestore(),
        "userClasses",
        user.uid,
        "classes",
        classId
      );
      await setDoc(userClassRef, {
        className: classData.name,
        teacherName: classData.teacherName || "Unknown Teacher", // Assuming teacherName exists
        joinDate: Timestamp.now(),
      });

      Alert.alert("Success", "User added to class!");
    } catch (error: any) {
      console.error("Error in handleAddCurrentUserToClass:", error);
      Alert.alert(
        "Adding Error",
        `Error adding user to class: ${error?.message || String(error)}`
      );
    } finally {
      setIsLoading((prev) => ({ ...prev, addUser: false }));
    }
  };

  // Helper to get the *active* session for the sample class
  const getSampleActiveSessionDocRef =
    async (): Promise<FirebaseFirestoreTypes.DocumentReference | null> => {
      console.log("Looking for sample class...");
      const classesRef = collection(firestore(), "classes");
      const classQuery = query(
        classesRef,
        where("name", "==", SAMPLE_CLASS_NAME),
        limit(1)
      );
      const classSnap = await getDocs(classQuery);

      if (classSnap.empty) {
        console.log("No sample class found");
        setCurrentClassId(null);
        setCurrentSessionId(null);
        return null;
      }
      const classId = classSnap.docs[0].id;
      setCurrentClassId(classId);
      console.log(
        `Found class with ID: ${classId}, looking for ACTIVE session...`
      );
      const sessionsRef = collection(firestore(), "sessions");
      const sessionQuery = query(
        sessionsRef,
        where("classId", "==", classId),
        where("status", "==", "active"),
        limit(1)
      );
      const sessionSnap = await getDocs(sessionQuery);

      if (sessionSnap.empty) {
        console.log("No active session found for this class");
        setCurrentSessionId(null);
        return null;
      }
      const sessionId = sessionSnap.docs[0].id;
      console.log(`Found active session with ID: ${sessionId}`);
      setCurrentSessionId(sessionId);
      return sessionSnap.docs[0].ref;
    };

  // Run check on component mount and when menu opens
  useEffect(() => {
    if (visible) {
      getSampleActiveSessionDocRef();
    }
  }, [visible]);

  const handleDeactivateSession = async () => {
    try {
      setIsLoading((prev) => ({ ...prev, deactivate: true }));
      const sessionRef = await getSampleActiveSessionDocRef(); // Re-check which session is active
      if (!sessionRef) {
        Alert.alert(
          "No Active Session",
          "No active session found to deactivate."
        );
        return;
      }
      console.log(`Deactivating session: ${sessionRef.id}...`);
      await updateDoc(sessionRef, {
        status: "ended",
        endTime: Timestamp.now(),
      });
      setCurrentSessionId(null); // Clear current session ID
      Alert.alert("Success", "Session deactivated (ended)");
    } catch (error: any) {
      console.error("Error in handleDeactivateSession:", error);
      Alert.alert(
        "Deactivation Error",
        `Error deactivating session: ${error?.message || String(error)}`
      );
    } finally {
      setIsLoading((prev) => ({ ...prev, deactivate: false }));
    }
  };

  const handleStartNewSession = async () => {
    if (!user) {
      Alert.alert("No User", "Cannot start session without logged in user.");
      return;
    }
    if (!currentClassId) {
      Alert.alert("No Class", "Cannot start session, sample class not found.");
      // Attempt to find it again
      await getSampleActiveSessionDocRef();
      if (!currentClassId) return;
    }

    // Check if there's already an active session before creating a new one
    const existingActiveSession = await getSampleActiveSessionDocRef();
    if (existingActiveSession) {
      Alert.alert(
        "Session Active",
        "An active session already exists for this class. Deactivate it first."
      );
      return;
    }

    try {
      setIsLoading((prev) => ({ ...prev, start: true }));
      console.log(`Starting new session for class ${currentClassId}...`);

      // Define new session data (customize location/radius as needed)
      const newSessionData = {
        classId: currentClassId,
        teacherId: user.uid, // Assuming the current user is the teacher for dev purposes
        startTime: Timestamp.now(),
        endTime: null,
        status: "active",
        location: new GeoPoint(34.0522, -118.2437), // Example: Los Angeles
        radius: 100, // Example: 100 meters
        created_at: Timestamp.now(),
      };

      const sessionsCollectionRef = collection(firestore(), "sessions");
      const newSessionRef = await addDoc(sessionsCollectionRef, newSessionData);

      console.log(`New session started with ID: ${newSessionRef.id}`);
      setCurrentSessionId(newSessionRef.id);
      Alert.alert("Success", "New session started!");
    } catch (error: any) {
      console.error("Error in handleStartNewSession:", error);
      Alert.alert(
        "Starting Error",
        `Error starting new session: ${error?.message || String(error)}`
      );
    } finally {
      setIsLoading((prev) => ({ ...prev, start: false }));
    }
  };

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
              Status: Using emulator ({firestore().app.name}) at http://
              {firestore().app.options.settings?.host}:
              {firestore().app.options.settings?.port}/firestore
            </Text>

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

            <ActionButton
              icon="person-add-outline"
              text="Add Current User to Class"
              onPress={handleAddCurrentUserToClass}
              isLoading={isLoading.addUser}
              loadingText="Adding user..."
              disabled={!user}
            />

            <Text style={styles.sectionTitle}>
              Sample Class Session Control
            </Text>
            <Text style={styles.infoText}>
              Controls the session for "{SAMPLE_CLASS_NAME}".
              {currentClassId
                ? ` (Class ID: ${currentClassId})`
                : " (Class not found)"}
              {currentSessionId
                ? `\nCurrent Active Session ID: ${currentSessionId}`
                : "\nNo active session detected."}
            </Text>

            <ActionButton
              icon="play-circle-outline"
              text="Start New Session"
              onPress={handleStartNewSession}
              isLoading={isLoading.start}
              loadingText="Starting..."
              disabled={!user || !currentClassId || !!currentSessionId} // Disable if no user, no class, or session already active
            />

            <ActionButton
              icon="pause-circle-outline"
              text="Deactivate Current Session"
              onPress={handleDeactivateSession}
              isLoading={isLoading.deactivate}
              loadingText="Deactivating..."
              disabled={!currentSessionId} // Disable if no active session detected
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
