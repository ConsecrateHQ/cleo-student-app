import React from "react";
import {
  View,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
} from "react-native";
import Animated from "react-native-reanimated";
import ClassCard from "./ClassCard";
import LogoutButton from "./LogoutButton";
import theme from "../theme";

interface ThisWeekSheetContentProps {
  animatedTitleStyle: StyleProp<Animated.AnimateStyle<StyleProp<TextStyle>>>;
  animatedSessionCountContainerStyle: StyleProp<
    Animated.AnimateStyle<StyleProp<ViewStyle>>
  >;
  animatedGridStyle: StyleProp<Animated.AnimateStyle<StyleProp<ViewStyle>>>;
}

const ThisWeekSheetContent: React.FC<ThisWeekSheetContentProps> = ({
  animatedTitleStyle,
  animatedSessionCountContainerStyle,
  animatedGridStyle,
}) => {
  return (
    <View style={styles.contentContainer}>
      <Animated.Text style={[styles.title, animatedTitleStyle]}>
        This Week
      </Animated.Text>
      <Animated.View style={animatedSessionCountContainerStyle}>
        <Text style={styles.sessionCount}>10 sessions</Text>
      </Animated.View>
      <Animated.View style={[styles.gridContainer, animatedGridStyle]}>
        <View style={styles.gridRow}>
          <ClassCard />
          <ClassCard />
        </View>
        <View style={styles.gridRow}>
          <ClassCard />
          <ClassCard />
        </View>
      </Animated.View>

      <LogoutButton />
    </View>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    paddingHorizontal: 36,
    minHeight: 130, // Ensure minimum height for content visibility
    alignItems: "flex-start",
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: theme.colors.text.primary,
    marginBottom: 4,
    alignSelf: "flex-start",
    width: "100%",
  },
  sessionCount: {
    fontSize: 20,
    fontWeight: "400",
    color: theme.colors.text.secondary,
  },
  gridContainer: {
    flexDirection: "column",
    width: "100%",
    alignItems: "center",
    marginTop: 20,
  },
  gridRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 10,
  },
});

export default ThisWeekSheetContent;
