import { Stack, Redirect } from "expo-router";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { StyleSheet } from "react-native";
import useAuthStore from "../hooks/useAuthStore";

export default function RootLayout() {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);

  return (
    <GestureHandlerRootView style={styles.container}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
      </Stack>
      {!isLoggedIn && <Redirect href="/login" />}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
