import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import theme from "../theme";
import useAuthStore from "../hooks/useAuthStore";
import { router } from "expo-router";

const LogoutButton = () => {
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);

  const handleLogout = async () => {
    // In dev mode, even with no user (e.g. after a database nuke), we still want to reset the auth state
    if (!user && __DEV__) {
      console.log("DEV mode: No user found, but resetting auth state anyway");
    }
    try {
      await logout();
      router.replace("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={handleLogout}
      activeOpacity={0.7}
      hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
    >
      <Text style={styles.text}>Logout</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: theme.colors.divider,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignSelf: "center",
    marginVertical: 20,
  },
  text: {
    color: theme.colors.text.secondary,
    fontWeight: "500",
    fontSize: 16,
  },
});

export default LogoutButton;
