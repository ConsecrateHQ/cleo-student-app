import { Stack, Redirect, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { StyleSheet } from "react-native";
import useAuthStore from "../hooks/useAuthStore";
import { getAuth, FirebaseAuthTypes } from "@react-native-firebase/auth";
import { initializeFirebase, app } from "../utils/firebaseConfig";

// Initialize Firebase with emulators if in dev mode
initializeFirebase();

export default function RootLayout() {
  // Select state and actions separately for stable references
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const setUser = useAuthStore((state) => state.setUser);
  const router = useRouter();
  const [isAuthChecked, setIsAuthChecked] = useState(false);

  // Listener to update Zustand store
  useEffect(() => {
    const auth = getAuth(app);
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      // console.log("Auth state changed, user:", firebaseUser?.uid);
      // It might be helpful to compare the new user with the existing one
      // to prevent unnecessary updates if the user object reference changes
      // but the actual user ID hasn't. However, let's keep it simple first.
      setUser(firebaseUser);
      if (!isAuthChecked) {
        setIsAuthChecked(true);
      }
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, [setUser, isAuthChecked]);

  // Effect to handle navigation based on auth state and initial check
  useEffect(() => {
    if (!isAuthChecked) {
      return;
    }

    if (isLoggedIn) {
      router.replace("/");
    } else {
      router.replace("/login");
    }
  }, [isLoggedIn, isAuthChecked, router]);

  if (!isAuthChecked) {
    return null;
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
});
