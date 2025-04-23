import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import theme from "../theme";
import ClassCard from "../components/ClassCard";
import useAuthStore from "../hooks/useAuthStore";
import {
  getArchivedClassesForStudent,
  unarchiveClass,
  getClassDetails,
  getStudentAttendanceHistory,
} from "../utils/firebaseClassSessionHelpers";

interface ArchivedClass {
  id: string;
  name: string;
  day: string;
  NumberAttended: number;
}

export default function ArchivedClassesScreen() {
  const [archivedClasses, setArchivedClasses] = useState<ArchivedClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    const fetchArchivedClasses = async () => {
      if (!user?.uid) return;

      try {
        setLoading(true);

        // Get basic archived class info
        const archivedClassesInfo = await getArchivedClassesForStudent(
          user.uid
        );

        // For each class, get additional details and attendance
        const classesWithDetails = await Promise.all(
          archivedClassesInfo.map(async (classInfo) => {
            // Get class details
            const details = await getClassDetails(classInfo.classId);

            // Get attendance history to calculate total attended
            const attendanceHistory = await getStudentAttendanceHistory(
              user.uid,
              classInfo.classId
            );

            // Count verified/checked_in attendances
            const numberAttended = attendanceHistory.filter(
              (record) =>
                record.status === "verified" || record.status === "checked_in"
            ).length;

            // Day of week is not stored in Firestore, so we'll just use blank for now
            // This could be enhanced to show the most common day from attendance records
            const day = "";

            return {
              id: classInfo.classId,
              name: details?.name || classInfo.className,
              day,
              NumberAttended: numberAttended,
            };
          })
        );

        setArchivedClasses(classesWithDetails);
      } catch (err) {
        console.error("Error fetching archived classes:", err);
        setError("Failed to load archived classes");
      } finally {
        setLoading(false);
      }
    };

    fetchArchivedClasses();
  }, [user?.uid]);

  const handleClassPress = (classId: string) => {
    router.push({
      pathname: "/class-details",
      params: { classId },
    });
  };

  const handleRestoreClass = async (classId: string) => {
    if (!user?.uid) return;

    try {
      await unarchiveClass(user.uid, classId);
      setArchivedClasses(archivedClasses.filter((c) => c.id !== classId));
    } catch (error) {
      console.error("Error restoring class:", error);
    }
  };

  const handleDeleteClass = async (classId: string) => {
    // This would completely remove the class from the student's records
    // Requires confirmation dialog in a real implementation
    if (!user?.uid) return;

    // For now, just remove from the UI
    setArchivedClasses(archivedClasses.filter((c) => c.id !== classId));
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={theme.colors.text.primary}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Archived Classes</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.button.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={theme.colors.text.primary}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Archived Classes</Text>
      </View>

      {archivedClasses.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="archive-outline"
            size={48}
            color={theme.colors.text.secondary}
          />
          <Text style={styles.emptyText}>No archived classes</Text>
          <Text style={styles.emptySubtext}>
            Classes you archive will appear here
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.gridContainer}>
            {archivedClasses.map((classItem) => (
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
                  onLeave={() => handleDeleteClass(classItem.id)}
                  onArchive={() => handleRestoreClass(classItem.id)}
                />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.app,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: theme.colors.text.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 16,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    paddingHorizontal: 8,
    gap: 12,
  },
  cardContainer: {
    width: "47%",
    marginBottom: 12,
  },
});
