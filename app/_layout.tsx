import { Stack, Redirect, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { StyleSheet, ActivityIndicator, View } from "react-native";
import useAuthStore from "../hooks/useAuthStore";
import { getAuth, onAuthStateChanged, User as WebUser } from "firebase/auth";
import { initializeFirebase, webApp, webAuth } from "../utils/firebaseConfig";

// Initialize Firebase based on the simple toggle in firebaseConfig.ts
// initializeFirebase();

export default function RootLayout() {
  // Select state and actions separately for stable references
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const user = useAuthStore((state) => state.user); // Get the user object
  const setUser = useAuthStore((state) => state.setUser);
  const checkAndRestoreSession = useAuthStore(
    (state) => state.checkAndRestoreSession
  );
  const router = useRouter();
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [isFirebaseInitialized, setIsFirebaseInitialized] = useState(false);

  // Initialize Firebase on component mount
  useEffect(() => {
    const setupFirebase = async () => {
      try {
        await initializeFirebase();
        setIsFirebaseInitialized(true);
        console.log("[RootLayout] Firebase initialized successfully.");
      } catch (error) {
        console.error("[RootLayout] Firebase initialization error:", error);
        setIsFirebaseInitialized(true);
      }
    };

    setupFirebase();
  }, []);

  // Listener to update Zustand store
  useEffect(() => {
    if (!isFirebaseInitialized) return;
    console.log("[RootLayout] Setting up Auth listener...");

    const unsubscribe = onAuthStateChanged(
      webAuth,
      (firebaseUser: WebUser | null) => {
        console.log(
          "[RootLayout] Auth state changed (Web SDK). User UID:",
          firebaseUser?.uid ?? "null"
        );
        setUser(firebaseUser);

        // If user is logged in, check for an existing session
        if (firebaseUser) {
          checkAndRestoreSession(firebaseUser.uid);
        }

        if (!isAuthChecked) {
          setIsAuthChecked(true);
          console.log("[RootLayout] Initial auth check complete.");
        }
      }
    );

    return () => {
      console.log("[RootLayout] Cleaning up Auth listener.");
      unsubscribe();
    };
  }, [setUser, isAuthChecked, isFirebaseInitialized, checkAndRestoreSession]);

  // Effect to handle navigation based on auth state and initial check
  useEffect(() => {
    if (!isAuthChecked || !isFirebaseInitialized) {
      return;
    }
    console.log(
      `[RootLayout] Navigation Effect: isLoggedIn=${isLoggedIn}, isAuthChecked=${isAuthChecked}, isFirebaseInitialized=${isFirebaseInitialized}`
    );

    if (isLoggedIn) {
      console.log("[RootLayout] User logged in, redirecting to / (index)");
      router.replace("/");
    } else {
      console.log("[RootLayout] User logged out, redirecting to /login");
      router.replace("/login");
    }
  }, [isLoggedIn, isAuthChecked, isFirebaseInitialized, router]);

  // Show loading indicator while checking authentication
  if (!isAuthChecked || !isFirebaseInitialized) {
    console.log(
      `[RootLayout] Loading Screen: isAuthChecked=${isAuthChecked}, isFirebaseInitialized=${isFirebaseInitialized}`
    );
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  console.log("[RootLayout] Rendering main Stack navigator.");
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
