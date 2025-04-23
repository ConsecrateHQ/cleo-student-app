import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import theme from "../theme";
import useAuthStore from "../hooks/useAuthStore";
import {
  getClassDetails as fetchClassDetails,
  getStudentAttendanceHistory,
  getClassDetails as getFirestoreClassDetails,
} from "../utils/firebaseClassSessionHelpers";
import { Timestamp } from "firebase/firestore";

// Define the types for the class details
interface ClassDetailsType {
  id: string;
  name: string;
  day: string;
  NumberAttended: number;
}

interface Session {
  id: string;
  title: string;
  date: Date;
  status: "verified" | "checked_in";
}

export default function ClassDetailsScreen() {
  const { classId } = useLocalSearchParams();
  const [classDetails, setClassDetails] = useState<ClassDetailsType | null>(
    null
  );

  const [sessions, setSessions] = useState<Session[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    const fetchClassData = async () => {
      if (!classId || !user?.uid) return;

      try {
        setLoading(true);
        // Fetch class details from Firestore
        const details = await getFirestoreClassDetails(classId as string);
        if (!details) {
          setError("Class not found");
          return;
        }

        // Get attendance history
        const attendanceHistory = await getStudentAttendanceHistory(
          user.uid,
          classId as string
        );

        // Count attended sessions
        const numberOfAttended = attendanceHistory.filter(
          (record) =>
            record.status === "verified" || record.status === "checked_in"
        ).length;

        setClassDetails({
          id: classId as string,
          name: details.name,
          day: "", // Day of week is not stored in Firestore
          NumberAttended: numberOfAttended,
        });

        // Convert attendance records to Session objects for display
        const attendedSessions: Session[] = attendanceHistory
          .filter(
            (record) =>
              record.status === "verified" || record.status === "checked_in"
          )
          .map((record, index) => ({
            id: record.sessionId,
            title: `Session ${index + 1}`,
            date:
              record.checkInTime instanceof Timestamp
                ? record.checkInTime.toDate()
                : new Date(),
            status: record.status === "verified" ? "verified" : "checked_in",
          }));

        setSessions(attendedSessions);
      } catch (err) {
        console.error("Error fetching class data:", err);
        setError("Failed to load class details");
      } finally {
        setLoading(false);
      }
    };

    fetchClassData();
  }, [classId, user?.uid]);

  const renderSessionItem = (session: Session) => {
    const isToday = new Date().toDateString() === session.date.toDateString();
    const statusColor = session.status === "verified" ? "#2ecc71" : "#3498db"; // Green for verified, Blue for checked_in

    return (
      <View key={session.id} style={styles.sessionItem}>
        <View style={styles.statusIndicatorContainer}>
          <View
            style={[
              styles.statusIndicatorOutline,
              { borderColor: statusColor },
            ]}
          />
          <View
            style={[styles.statusIndicator, { backgroundColor: statusColor }]}
          />
        </View>
        <Text style={styles.sessionTitle}>
          {isToday ? "Today's" : session.date < new Date() ? "This" : "Next"}{" "}
          {session.title}
        </Text>
      </View>
    );
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
          <Text style={styles.headerTitle}>Loading...</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.button.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !classDetails) {
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
          <Text style={styles.headerTitle}>Error</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={48}
            color={theme.colors.status.error}
          />
          <Text style={styles.errorText}>{error || "Class not found"}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
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
        <Text style={styles.headerTitle}>{classDetails.name}</Text>
      </View>

      <ScrollView style={styles.scrollContainer}>
        {/* Attended Sessions Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={theme.colors.text.secondary}
            />
            <Text style={styles.sectionTitle}>Attended</Text>
          </View>

          {sessions.length > 0 ? (
            sessions.map(renderSessionItem)
          ) : (
            <Text style={styles.emptyStateText}>No attended sessions yet</Text>
          )}
        </View>
      </ScrollView>
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
  scrollContainer: {
    flex: 1,
    padding: 16,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.colors.text.primary,
    marginLeft: 8,
  },
  sessionItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#222226",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  statusIndicatorContainer: {
    position: "relative",
    width: 18,
    height: 18,
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    position: "absolute",
    zIndex: 1,
  },
  statusIndicatorOutline: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    position: "absolute",
  },
  sessionTitle: {
    fontSize: 16,
    color: theme.colors.text.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorText: {
    color: theme.colors.text.primary,
    fontSize: 18,
    textAlign: "center",
    marginVertical: 16,
  },
  retryButton: {
    backgroundColor: theme.colors.button.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: theme.colors.button.text,
    fontSize: 16,
    fontWeight: "bold",
  },
  emptyStateText: {
    color: theme.colors.text.secondary,
    fontSize: 16,
    textAlign: "center",
    padding: 16,
  },
});
