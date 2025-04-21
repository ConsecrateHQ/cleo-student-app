import { Stack, Redirect, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { StyleSheet, ActivityIndicator, View } from "react-native";
import useAuthStore from "../hooks/useAuthStore";
import { getAuth, FirebaseAuthTypes } from "@react-native-firebase/auth";
import { initializeFirebase, app } from "../utils/firebaseConfig";

// Initialize Firebase based on the simple toggle in firebaseConfig.ts
// initializeFirebase();

export default function RootLayout() {
  // Select state and actions separately for stable references
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const setUser = useAuthStore((state) => state.setUser);
  const router = useRouter();
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [isFirebaseInitialized, setIsFirebaseInitialized] = useState(false);

  // Initialize Firebase on component mount
  useEffect(() => {
    const setupFirebase = async () => {
      try {
        await initializeFirebase();
        setIsFirebaseInitialized(true);
      } catch (error) {
        console.error("[RootLayout] Firebase initialization error:", error);
        // Still set to true to allow app to attempt to continue
        setIsFirebaseInitialized(true);
      }
    };

    setupFirebase();
  }, []);

  // Listener to update Zustand store
  useEffect(() => {
    // Only setup auth listeners after Firebase is initialized
    if (!isFirebaseInitialized) return;

    const auth = getAuth(app);
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      // console.log("Auth state changed, user:", firebaseUser?.uid);
      setUser(firebaseUser);
      if (!isAuthChecked) {
        setIsAuthChecked(true);
      }
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, [setUser, isAuthChecked, isFirebaseInitialized]);

  // Effect to handle navigation based on auth state and initial check
  useEffect(() => {
    if (!isAuthChecked || !isFirebaseInitialized) {
      return;
    }

    if (isLoggedIn) {
      router.replace("/");
    } else {
      router.replace("/login");
    }
  }, [isLoggedIn, isAuthChecked, isFirebaseInitialized, router]);

  // Show loading indicator while checking authentication
  if (!isAuthChecked || !isFirebaseInitialized) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen
          name="playground"
          options={{
            headerShown: false,
            presentation: "modal",
          }}
        />
        <Stack.Screen
          name="dev"
          options={{
            headerShown: false,
            presentation: "card",
          }}
        />
        <Stack.Screen
          name="join-class"
          options={{
            headerShown: false,
            presentation: "card",
          }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
});
