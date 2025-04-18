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
import { LinearGradient } from "expo-linear-gradient";
import { SvgXml } from "react-native-svg";

const { width } = Dimensions.get("window");

// SVG content as strings
const starSvg = `<svg width="81" height="81" viewBox="0 0 81 81" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M55.0921 66.1118C53.9986 66.7373 52.6831 66.4436 51.7959 65.3648C39.6809 49.8502 36.2902 49.056 18.5458 56.27C17.2633 56.8011 15.8896 56.4057 15.2349 55.2613C14.5803 54.1169 14.9213 52.7069 16.0438 51.896C31.5005 40.6241 32.4836 36.8553 25.0586 18.6242C24.5529 17.3271 24.992 16.0296 26.0855 15.4041C27.2044 14.764 28.52 15.0578 29.4071 16.1366C41.4096 31.7493 45.0875 32.7506 62.6572 25.2314C63.9252 24.6748 65.3135 25.0957 65.9681 26.2401C66.6227 27.3844 66.2563 28.8091 65.1593 29.6054C49.7025 40.8773 48.6795 44.6352 56.1445 62.8772C56.6356 64.1489 56.2111 65.4718 55.0921 66.1118Z" fill="black"/>
</svg>`;

const wandSvg = `<svg width="81" height="81" viewBox="0 0 81 81" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M24.1707 35.3178C24.8101 35.2043 25.1483 34.7625 25.1418 34.1388C25.0095 25.7616 26.0751 23.9411 34.1332 21.2272C34.7547 21.0128 35.0473 20.5097 34.9458 19.9375C34.8443 19.3654 34.3965 18.9936 33.7391 19.0061C25.1839 19.3087 23.7748 17.823 20.8612 10.0087C20.6468 9.38719 20.1437 9.09461 19.5379 9.20207C18.9994 9.29759 18.6276 9.7454 18.6064 10.4087C18.7821 18.6393 17.7127 20.6341 9.6427 23.2807C9.02118 23.495 8.7286 23.9982 8.83009 24.5703C8.93158 25.1425 9.38536 25.548 10.0367 25.5018C18.5919 25.1991 19.9674 26.6908 22.8929 34.5725C23.129 35.1207 23.6322 35.4133 24.1707 35.3178ZM14.3573 78.8187C16.2712 80.2149 19.1042 79.7471 20.4824 77.7322L56.6417 25.8085C58.0199 23.7937 57.5483 21.135 55.5948 19.7111C53.6749 18.2813 50.8479 18.7828 49.4697 20.7977L13.2708 72.6937C11.8985 74.7422 12.3978 77.3613 14.3573 78.8187ZM16.1725 76.1362C15.5385 75.6933 15.3953 74.8856 15.8382 74.2516L41.5291 37.4802L43.754 39.0641L18.0908 75.7959C17.6479 76.4299 16.8065 76.5792 16.1725 76.1362ZM68.218 56.0383C68.7565 55.9428 69.0273 55.5129 69.0388 54.9902C68.8527 48.4624 68.8207 48.0862 75.4615 45.7973C75.982 45.6009 76.2529 45.171 76.1634 44.6662C76.0619 44.094 75.6656 43.8172 75.1152 43.8454C68.0924 43.9804 67.9871 43.5825 65.9164 37.389C65.7259 36.9021 65.3237 36.5916 64.7852 36.6871C64.2467 36.7827 63.9422 37.2185 63.9644 37.7353C64.1109 44.2354 64.1825 44.6393 57.514 46.9678C56.9875 47.1306 56.7166 47.5605 56.8122 48.099C56.9017 48.6038 57.3376 48.9083 57.8603 48.9197C64.8712 48.7174 64.9765 49.1153 67.0868 55.3365C67.2437 55.8293 67.6459 56.1398 68.218 56.0383ZM58.5623 67.7487C58.9661 67.677 59.1816 67.3264 59.2386 66.865C59.356 63.0257 59.0628 62.9388 63.1263 61.3849C63.5123 61.2123 63.7278 60.8616 63.6561 60.4578C63.5845 60.0539 63.2615 59.7988 62.7784 59.8151C58.5136 59.8427 58.753 59.6266 57.3103 55.9947C57.0921 55.5474 56.7691 55.2923 56.3653 55.3639C55.9614 55.4355 55.7122 55.7922 55.6829 56.2139C55.6904 60.1699 55.8706 60.2074 51.8071 61.7613C51.4152 61.9003 51.2057 62.2846 51.2714 62.6548C51.343 63.0586 51.666 63.3138 52.0877 63.3431C56.4715 63.3985 56.3271 63.563 57.6292 67.1852C57.8018 67.5711 58.1584 67.8203 58.5623 67.7487Z" fill="black"/>
</svg>`;

export default function LoginScreen() {
  const login = useAuthStore((state) => state.login);
  const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle);

  const handleLogin = () => {
    login();
    router.replace("/");
  };

  return (
    <View style={styles.container}>
      {/* Title and SVGs on top of the circles */}
      <View style={styles.headerContainer}>
        <SvgXml xml={starSvg} width={60} height={60} style={styles.starIcon} />
        <Text style={styles.headerTitle}>
          Automagical{"\n"}Attendance{"\n"}Checking
        </Text>
        <SvgXml xml={wandSvg} width={60} height={60} style={styles.wandIcon} />
      </View>

      {/* Background circles */}
      <View style={styles.circle1} />
      <LinearGradient
        colors={["#23A2D9", "#B842E1", "#B9222C", "#D05629", "#EDC01E"]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 0 }}
        style={styles.circle2}
      />

      {/* Main content (buttons) */}
      <View style={styles.content}>
        {/* Bypass Login - now white with border */}
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
          onPress={handleLogin}
          activeOpacity={0.8}
        >
          <Text style={[styles.buttonText, { color: "#4285F4" }]}>
            Bypass Login
          </Text>
        </TouchableOpacity>

        <View style={{ height: 20 }} />

        {/* Sign in with Google - now blue primary */}
        <TouchableOpacity
          style={styles.loginButton}
          onPress={loginWithGoogle}
          activeOpacity={0.8}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name="logo-google"
              size={20}
              color="#fff"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.buttonText}>Sign in with Google</Text>
          </View>
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
    justifyContent: "flex-end",
    padding: 20,
  },
  circle1: {
    position: "absolute",
    width: 582,
    height: 582,
    borderRadius: 999999,
    backgroundColor: "#fff",
    alignSelf: "center",
    top: -100,
    zIndex: 1,
  },
  circle2: {
    position: "absolute",
    width: 518,
    height: 518,
    borderRadius: 999999,
    alignSelf: "center",
    top: 18,
    zIndex: 0,
  },
  content: {
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    marginBottom: 150,
  },
  title: {
    fontSize: 50,
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
    width: width * 0.9,
    maxWidth: 380,
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
  headerContainer: {
    position: "absolute",
    top: 180,
    width: "100%",
    alignItems: "center",
    zIndex: 2,
  },
  headerTitle: {
    fontSize: 50,
    fontWeight: "bold",
    color: "#000",
    textAlign: "center",
    lineHeight: 48,
  },
  starIcon: {
    position: "absolute",
    top: -55,
    left: width * 0.001,
    zIndex: 3,
  },
  wandIcon: {
    position: "absolute",
    top: 100,
    right: width * 0.01,
    zIndex: 3,
  },
});
