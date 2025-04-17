import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Linking,
} from "react-native";
import { seedEmulator } from "../utils/seedEmulator";
import { Ionicons } from "@expo/vector-icons";
import theme from "../theme";

interface DevMenuProps {
  visible: boolean;
  onClose: () => void;
}

export default function DevMenu({ visible, onClose }: DevMenuProps) {
  const EMULATOR_UI_URL = "http://localhost:4000/";

  const handleOpenEmulatorUI = () => {
    Linking.openURL(EMULATOR_UI_URL).catch((err) =>
      console.error("Error opening emulator UI:", err)
    );
  };

  const handleSeedEmulator = async () => {
    await seedEmulator();
  };

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

            <TouchableOpacity
              style={styles.button}
              onPress={handleOpenEmulatorUI}
            >
              <Ionicons name="open-outline" size={20} color="white" />
              <Text style={styles.buttonText}>Open Emulator UI</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.button}
              onPress={handleSeedEmulator}
            >
              <Ionicons name="leaf-outline" size={20} color="white" />
              <Text style={styles.buttonText}>Seed Test Data</Text>
            </TouchableOpacity>

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
  button: {
    backgroundColor: theme.colors.button.primary,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
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
