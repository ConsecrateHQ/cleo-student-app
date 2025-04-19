import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
  Platform,
  Alert,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import theme from "../theme";

// Define the callback type for TypeScript
declare global {
  interface Window {
    __CALLBACKS__: {
      [key: string]: (code: string) => Promise<void>;
    };
  }
}

export default function JoinClassScreen() {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Get the callback function ID if it was passed in the route params
  const params = useLocalSearchParams();
  const callbackId = params.callbackId as string | undefined;

  const handleSubmit = async () => {
    if (code.length !== 5) {
      setError("Please enter a valid 5-digit code");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // Return to the previous screen with the code
      if (
        callbackId &&
        window.__CALLBACKS__ &&
        window.__CALLBACKS__[callbackId]
      ) {
        const callback = window.__CALLBACKS__[callbackId];
        try {
          await callback(code);
          router.back();
        } catch (err) {
          let errorMessage = "Invalid code or error joining class";
          if (err instanceof Error) {
            errorMessage = err.message;
          }
          setError(errorMessage);
          console.error(err);
        }
      } else {
        // If no callback is found, just go back with an alert
        Alert.alert("No handler", "Could not process the join request");
        router.back();
      }
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Join a Class</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            disabled={isLoading}
            style={styles.closeButton}
          >
            <Ionicons
              name="close"
              size={24}
              color={theme.colors.text.secondary}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Polyfill for callback storage if it doesn't exist
if (typeof window !== "undefined" && !window.__CALLBACKS__) {
  window.__CALLBACKS__ = {};
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background.app,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: theme.colors.text.primary,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "stretch",
    padding: 24,
    paddingTop: 40,
  },
  label: {
    color: theme.colors.text.secondary,
    marginBottom: 12,
    fontSize: 16,
    fontWeight: "500",
  },
  input: {
    backgroundColor: theme.colors.background.card,
    borderRadius: 10,
    padding: 16,
    color: theme.colors.text.primary,
    fontSize: 20,
    textAlign: "center",
    letterSpacing: 8,
    marginBottom: 16,
    width: "100%",
  },
  errorText: {
    color: theme.colors.status.error,
    marginBottom: 16,
    textAlign: "center",
    minHeight: 20,
  },
  errorPlaceholder: {
    minHeight: 20,
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: theme.colors.button.primary,
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
    width: "100%",
  },
  submitButtonDisabled: {
    backgroundColor: `${theme.colors.button.primary}80`,
  },
  submitButtonText: {
    color: theme.colors.button.text,
    fontWeight: "bold",
    fontSize: 16,
  },
});
