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
import Svg, { Path } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");
const CIRCLE_SIZE = width * 2; // Large enough to cover the top

export default function LoginScreen() {
  const login = useAuthStore((state) => state.login);
  const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle);

  const handleLogin = () => {
    login();
    router.replace("/");
  };

  return (
    <View style={styles.container}>
      {/* Decorative Circles (absolutely positioned, do not affect layout) */}
      <View style={styles.circlesContainer} pointerEvents="none">
        <LinearGradient
          colors={["#4F8CFF", "#A259FF", "#F4845F", "#FFD600"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientCircle}
        />
        <View style={styles.whiteCircle} />
        <View style={styles.textOverlay}>
          <MaterialCommunityIcons
            name="star-four-points"
            size={36}
            color="#000"
            style={{ position: "absolute", top: 10, left: 20 }}
          />
          <Text style={styles.bigTitle}>
            Automagical{"\n"}Attendance{"\n"}Checking
          </Text>
          <MaterialCommunityIcons
            name="wand"
            size={36}
            color="#000"
            style={{ position: "absolute", bottom: 10, right: 20 }}
          />
        </View>
      </View>

      {/* Main Content (not overlapped by circles) */}
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
    backgroundColor: "#f4f4f4",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  circlesContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: 260,
    zIndex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    overflow: "visible",
  },
  gradientCircle: {
    position: "absolute",
    top: 80,
    left: -(CIRCLE_SIZE - width) / 2,
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    zIndex: 1,
  },
  whiteCircle: {
    position: "absolute",
    top: 0,
    left: -(CIRCLE_SIZE - width) / 2,
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: "#fff",
    zIndex: 2,
  },
  textOverlay: {
    position: "absolute",
    top: 60,
    left: 0,
    width: "100%",
    alignItems: "center",
    zIndex: 3,
  },
  bigTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#111",
    textAlign: "center",
    marginVertical: 20,
  },
  content: {
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    marginTop: 260, // Push content below the circles
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
