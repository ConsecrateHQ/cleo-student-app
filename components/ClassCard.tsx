import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Entypo } from "@expo/vector-icons";
import CustomMenu from "./CustomMenu";
import theme from "../theme";

export interface ClassCardProps {
  name: string;
  day: string;
  NumberAttended: number;
  onLeave: () => void;
  onArchive: () => void;
}

export const ClassCard = ({
  name,
  day,
  NumberAttended,
  onLeave,
  onArchive,
}: ClassCardProps) => {
  const menuItems = [
    { text: "Leave Class", onSelect: onLeave },
    { text: "Archive Class", onSelect: onArchive },
  ];

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        {/* Badge */}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{NumberAttended}</Text>
        </View>
        {/* Menu in top right */}
        <View style={styles.menuContainer}>
          <CustomMenu
            trigger={
              <Entypo
                name="dots-three-vertical"
                size={20}
                color={theme.colors.text.primary}
              />
            }
            items={menuItems}
          />
        </View>
      </View>

      <View style={styles.bottomRow}>
        {/* Class Name */}
        <Text style={styles.name} numberOfLines={2} ellipsizeMode="tail">
          {name}
        </Text>

        {/* Day of week */}
        {day && <Text style={styles.subtitle}>{day}</Text>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#222226",
    aspectRatio: 0.9,
    borderRadius: 26,
    padding: 16,
    justifyContent: "space-between",
    borderWidth: 2,
    borderColor: "#2E2E33",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    width: "100%",
  },
  menuContainer: {
    marginTop: 10,
    zIndex: 10,
  },
  badge: {
    backgroundColor: "#222226",
    borderRadius: 35,
    width: 60,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#444",
  },
  badgeText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 20,
  },
  bottomRow: {
    alignItems: "flex-start",
  },
  name: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 3,
    width: "100%",
  },
  subtitle: {
    color: "#999",
    fontSize: 15,
  },
});

export default ClassCard;
