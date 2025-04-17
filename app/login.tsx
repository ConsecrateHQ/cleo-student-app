import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import theme from "../theme";
import useAuthStore from "../hooks/useAuthStore";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

export default function LoginScreen() {
  const login = useAuthStore((state) => state.login);
  const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle);

  const handleLogin = () => {
    login();
    router.replace("/");
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>HalloCleo</Text>
        <Text style={styles.subtitle}>Student Attendance</Text>

        <View style={styles.spacer} />

        <TouchableOpacity
          style={styles.loginButton}
          onPress={handleLogin}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Bypass Login</Text>
        </TouchableOpacity>

        <View style={{ height: 20 }} />

        <TouchableOpacity
          style={[
            styles.loginButton,
            {
              flexDirection: "row",
              backgroundColor: "#fff",
              borderWidth: 1,
              borderColor: "#ccc",
            },
          ]}
          onPress={loginWithGoogle}
          activeOpacity={0.8}
        >
          <Ionicons
            name="logo-google"
            size={20}
            color="#4285F4"
            style={{ marginRight: 8 }}
          />
          <Text style={[styles.buttonText, { color: "#4285F4" }]}>
            Sign in with Google
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.app,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  content: {
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
  },
  title: {
    fontSize: 42,
    fontWeight: "bold",
    color: theme.colors.text.primary,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    color: theme.colors.text.secondary,
    marginBottom: 40,
  },
  spacer: {
    height: 60,
  },
  loginButton: {
    width: width * 0.8,
    maxWidth: 300,
    backgroundColor: theme.colors.button.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: theme.colors.button.text,
    fontSize: 18,
    fontWeight: "bold",
  },
});
