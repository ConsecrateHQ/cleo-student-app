import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import ClassCard from "./ClassCard";
import { Ionicons } from "@expo/vector-icons";
import theme from "../theme";

interface Class {
  id: string;
  name: string;
  day: string;
  NumberAttended: number;
}

interface ClassGridProps {
  classes: Class[];
  archivedClassesCount: number;
  onClassLeave: (classId: string) => void;
  onClassArchive: (classId: string) => void;
}

const ClassGrid = ({
  classes,
  archivedClassesCount,
  onClassLeave,
  onClassArchive,
}: ClassGridProps) => {
  const handleClassPress = (classId: string) => {
    router.push({
      pathname: "/class-details",
      params: { classId },
    });
  };

  const handleArchivedPress = () => {
    router.push("/archived-classes");
  };

  if (!classes.length) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons
          name="school-outline"
          size={48}
          color={theme.colors.text.secondary}
        />
        <Text style={styles.emptyText}>You are not in any classes</Text>
        <Text style={styles.emptySubtext}>Join a class with a code</Text>
      </View>
    );
  }

  return (
    <View style={styles.gridContainer}>
      {classes.map((classItem) => (
        <TouchableOpacity
          key={classItem.id}
          onPress={() => handleClassPress(classItem.id)}
          activeOpacity={0.7}
          style={styles.cardContainer}
        >
          <ClassCard
            name={classItem.name}
            day={classItem.day}
            NumberAttended={classItem.NumberAttended}
            onLeave={() => onClassLeave(classItem.id)}
            onArchive={() => onClassArchive(classItem.id)}
          />
        </TouchableOpacity>
      ))}

      {/* Archived Classes Card */}
      <TouchableOpacity
        onPress={handleArchivedPress}
        activeOpacity={0.7}
        style={styles.cardContainer}
      >
        <View style={styles.archivedCard}>
          <View style={styles.badge}>
            <Ionicons name="layers" size={48} color="#8A8A8E" />
          </View>
          <Text style={styles.name}>Archived Classes</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    width: "100%",
    gap: 12,
  },
  cardContainer: {
    width: "47%",
    marginBottom: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyText: {
    color: theme.colors.text.primary,
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 16,
  },
  emptySubtext: {
    color: theme.colors.text.secondary,
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
  },
  archivedCard: {
    backgroundColor: "#222226",
    aspectRatio: 0.9,
    borderRadius: 26,
    padding: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#2E2E33",
  },
  badge: {
    marginBottom: 12,
  },
  name: {
    color: "#8A8A8E",
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
  },
});

export default ClassGrid;
