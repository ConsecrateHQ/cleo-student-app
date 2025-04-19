import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Entypo } from "@expo/vector-icons";
import CustomMenu from "./CustomMenu";

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
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{NumberAttended}</Text>
        </View>
        <CustomMenu
          trigger={<Entypo name="dots-three-vertical" size={16} color="#666" />}
          items={menuItems}
        />
      </View>
      <Text style={styles.name}>{name}</Text>
      <Text style={styles.subtitle}>{day}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#1e1e1e",
    padding: 16,
    borderRadius: 20,
    width: "47%",
    aspectRatio: 1,
    justifyContent: "space-between",
    margin: "1.5%",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badge: {
    backgroundColor: "#333",
    borderRadius: 25,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#444",
  },
  badgeText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
  },
  name: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 4,
  },
  subtitle: {
    color: "#999",
    fontSize: 14,
  },
});

export default ClassCard;
