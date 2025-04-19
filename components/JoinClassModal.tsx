import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomModal from "./CustomModal";

interface JoinClassModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (code: string) => Promise<void>;
}

const JoinClassModal = ({
  visible,
  onClose,
  onSubmit,
}: JoinClassModalProps) => {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Clear error when modal opens or closes
  useEffect(() => {
    if (visible) {
      setCode("");
      setError("");
    }
  }, [visible]);

  const handleSubmit = async () => {
    if (code.length !== 5) {
      setError("Please enter a valid 5-digit code");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      if (!onSubmit) {
        throw new Error("No join handler provided");
      }

      await onSubmit(code);
      setCode("");
      onClose();
    } catch (err) {
      let errorMessage = "Invalid code or error joining class";
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackdropPress = () => {
    if (!isLoading) {
      Keyboard.dismiss();
      onClose();
    }
  };

  return (
    <CustomModal
      isVisible={visible}
      onBackdropPress={handleBackdropPress}
      backdropOpacity={0.85}
      animationIn="fade"
    >
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Join a Class</Text>
          <TouchableOpacity onPress={onClose} disabled={isLoading}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Enter 5-digit class code:</Text>
        <TextInput
          style={styles.input}
          value={code}
          onChangeText={(text) => {
            setCode(text);
            if (error) setError("");
          }}
          placeholder="12345"
          placeholderTextColor="#666"
          keyboardType="number-pad"
          maxLength={5}
          autoFocus
          editable={!isLoading}
        />

        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          <View style={styles.errorPlaceholder} />
        )}

        <TouchableOpacity
          style={[
            styles.submitButton,
            isLoading && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.submitButtonText}>Join Class</Text>
          )}
        </TouchableOpacity>
      </View>
    </CustomModal>
  );
};

const styles = StyleSheet.create({
  modalContent: {
    backgroundColor: "#1e1e1e",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  label: {
    color: "#ccc",
    marginBottom: 8,
    fontSize: 16,
    alignSelf: "flex-start",
  },
  input: {
    backgroundColor: "#333",
    borderRadius: 10,
    padding: 12,
    color: "#fff",
    fontSize: 20,
    textAlign: "center",
    letterSpacing: 8,
    marginBottom: 16,
    width: "100%",
  },
  errorText: {
    color: "#ff6b6b",
    marginBottom: 16,
    textAlign: "center",
    minHeight: 20,
  },
  errorPlaceholder: {
    minHeight: 20,
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: "#3d5afe",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    marginTop: 8,
    width: "100%",
  },
  submitButtonDisabled: {
    backgroundColor: "#3d5afe80",
  },
  submitButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default JoinClassModal;
