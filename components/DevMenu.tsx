import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { seedEmulator, clearEmulatorData } from "../utils/seedEmulator";
import { Ionicons } from "@expo/vector-icons";
import theme from "../theme";
import useAuthStore from "../hooks/useAuthStore";
import firestore from "@react-native-firebase/firestore";

interface DevMenuProps {
  visible: boolean;
  onClose: () => void;
}

export default function DevMenu({ visible, onClose }: DevMenuProps) {
  const user = useAuthStore((state) => state.user);
  const [isLoading, setIsLoading] = useState<{ [key: string]: boolean }>({
    seed: false,
    clear: false,
    addUser: false,
    deactivate: false,
    activate: false,
  });

  // Hardcoded sample class and session IDs (should match your seeding logic)
  const SAMPLE_CLASS_NAME = "Computer Science 101";

  const handleSeedEmulator = async () => {
    try {
      setIsLoading({ ...isLoading, seed: true });
      console.log("Starting seed operation...");
      await seedEmulator();
      console.log("Seed operation completed successfully");
    } catch (error) {
      console.error("Error in handleSeedEmulator:", error);
      alert(`Error seeding emulator: ${error.message || error}`);
    } finally {
      setIsLoading({ ...isLoading, seed: false });
    }
  };

  const handleClearEmulator = async () => {
    try {
      setIsLoading({ ...isLoading, clear: true });
      console.log("Starting clear operation...");
      await clearEmulatorData();
      console.log("Clear operation completed successfully");
    } catch (error) {
      console.error("Error in handleClearEmulator:", error);
      alert(`Error clearing emulator data: ${error.message || error}`);
    } finally {
      setIsLoading({ ...isLoading, clear: false });
    }
  };

  const handleAddCurrentUserToClass = async () => {
    try {
      setIsLoading({ ...isLoading, addUser: true });

      if (!user) {
        alert("No user logged in");
        return;
      }

      // 1. Ensure user exists in 'users' collection
      const userRef = firestore().collection("users").doc(user.uid);
      const userSnap = await userRef.get();
      if (!userSnap.exists) {
        // You can customize these fields as needed
        await userRef.set({
          uid: user.uid,
          email: user.email || "",
          displayName: user.displayName || "Unnamed User",
          role: "student",
          created_at: firestore.Timestamp.now(),
        });
        console.log(`Created user document for ${user.uid}`);
      }

      console.log("Finding sample class...");
      // Find the sample class
      const classSnap = await firestore()
        .collection("classes")
        .where("name", "==", SAMPLE_CLASS_NAME)
        .limit(1)
        .get();
      if (classSnap.empty) {
        alert("Sample class not found");
        return;
      }
      const classDoc = classSnap.docs[0];
      const classId = classDoc.id;
      const classData = classDoc.data();

      console.log(`Adding user ${user.uid} to class ${classId}...`);
      // Add user to class students subcollection
      await firestore()
        .collection("classes")
        .doc(classId)
        .collection("students")
        .doc(user.uid)
        .set({
          joinDate: firestore.Timestamp.now(),
        });

      // Add class to user's userClasses
      await firestore()
        .collection("userClasses")
        .doc(user.uid)
        .collection("classes")
        .doc(classId)
        .set({
          className: classData.name,
          teacherName: "Professor Smith",
          joinDate: firestore.Timestamp.now(),
        });

      alert("User added to class!");
    } catch (error) {
      console.error("Error in handleAddCurrentUserToClass:", error);
      alert(`Error adding user to class: ${error.message || error}`);
    } finally {
      setIsLoading({ ...isLoading, addUser: false });
    }
  };

  // Helper to get the current session for the sample class
  const getSampleSessionDoc = async () => {
    console.log("Looking for sample session...");
    const classSnap = await firestore()
      .collection("classes")
      .where("name", "==", SAMPLE_CLASS_NAME)
      .limit(1)
      .get();
    if (classSnap.empty) {
      console.log("No sample class found");
      return null;
    }
    const classId = classSnap.docs[0].id;
    console.log(`Found class with ID: ${classId}, looking for session...`);
    const sessionSnap = await firestore()
      .collection("sessions")
      .where("classId", "==", classId)
      .limit(1)
      .get();
    if (sessionSnap.empty) {
      console.log("No session found for this class");
      return null;
    }
    console.log(`Found session with ID: ${sessionSnap.docs[0].id}`);
    return sessionSnap.docs[0].ref;
  };

  const handleDeactivateSession = async () => {
    try {
      setIsLoading({ ...isLoading, deactivate: true });
      const sessionRef = await getSampleSessionDoc();
      if (!sessionRef) {
        alert("Session not found");
        return;
      }
      console.log(`Deactivating session: ${sessionRef.id}...`);
      await sessionRef.update({ status: "ended" });
      alert("Session deactivated (ended)");
    } catch (error) {
      console.error("Error in handleDeactivateSession:", error);
      alert(`Error deactivating session: ${error.message || error}`);
    } finally {
      setIsLoading({ ...isLoading, deactivate: false });
    }
  };

  const handleActivateSession = async () => {
    try {
      setIsLoading({ ...isLoading, activate: true });
      const sessionRef = await getSampleSessionDoc();
      if (!sessionRef) {
        alert("Session not found");
        return;
      }
      console.log(`Activating session: ${sessionRef.id}...`);
      await sessionRef.update({ status: "active" });
      alert("Session activated");
    } catch (error) {
      console.error("Error in handleActivateSession:", error);
      alert(`Error activating session: ${error.message || error}`);
    } finally {
      setIsLoading({ ...isLoading, activate: false });
    }
  };

  // Create a button component with loading state
  const ActionButton = ({
    icon,
    text,
    onPress,
    isLoading,
    loadingText = "Processing...",
  }) => (
    <TouchableOpacity
      style={[styles.button, isLoading && styles.buttonDisabled]}
      onPress={onPress}
      disabled={isLoading}
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
              Status: Using emulator at http://127.0.0.1:4000/firestore
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

            <ActionButton
              icon="person-add-outline"
              text="Add Current User to Class"
              onPress={handleAddCurrentUserToClass}
              isLoading={isLoading.addUser}
              loadingText="Adding user..."
            />

            <ActionButton
              icon="pause-circle-outline"
              text="Deactivate Session"
              onPress={handleDeactivateSession}
              isLoading={isLoading.deactivate}
              loadingText="Deactivating..."
            />

            <ActionButton
              icon="play-circle-outline"
              text="Activate Session"
              onPress={handleActivateSession}
              isLoading={isLoading.activate}
              loadingText="Activating..."
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
    marginBottom: 16,
    color: theme.colors.text.primary,
  },
  emulatorInfo: {
    marginBottom: 16,
    padding: 10,
    backgroundColor: "#f0f8ff",
    borderRadius: 8,
    color: theme.colors.text.secondary,
    fontFamily: "Courier",
  },
  button: {
    backgroundColor: theme.colors.button.primary,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
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
    marginTop: 16,
    marginBottom: 8,
    color: theme.colors.text.secondary,
    lineHeight: 20,
  },
  codeBlock: {
    backgroundColor: "#f1f1f1",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  code: {
    fontFamily: "Courier",
    color: "#c41a16",
  },
});
