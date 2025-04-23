import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
} from "react-native";
import Animated from "react-native-reanimated";
import ClassGrid from "./ClassGrid";
import LogoutButton from "./LogoutButton";
import theme from "../theme";
import { router } from "expo-router";
import useAuthStore from "../hooks/useAuthStore";
import { useUserClasses } from "../hooks/useUserClasses";
import {
  leaveClass,
  archiveClass,
  getStudentAttendanceHistory,
  getArchivedClassesCountForStudent,
} from "../utils/firebaseClassSessionHelpers";

interface UserClassWithAttendance {
  id: string;
  name: string;
  day: string;
  NumberAttended: number;
}

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
  const [userClassesWithAttendance, setUserClassesWithAttendance] = useState<
    UserClassWithAttendance[]
  >([]);
  const [archivedClassesCount, setArchivedClassesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore((state) => state.user);
  const { classes: userClasses, loading: classesLoading } = useUserClasses(
    user?.uid
  );

  useEffect(() => {
    const fetchArchivedCount = async () => {
      if (!user?.uid) return;

      try {
        // Get archived classes count
        const archivedCount = await getArchivedClassesCountForStudent(user.uid);
        setArchivedClassesCount(archivedCount);
      } catch (error) {
        console.error("Error loading archived classes count:", error);
      }
    };

    fetchArchivedCount();
  }, [user?.uid]);

  useEffect(() => {
    const fetchAttendanceData = async () => {
      if (!userClasses.length || !user?.uid) {
        setLoading(false);
        return;
      }

      try {
        // For each class, get attendance history for attendance count
        const classesWithAttendance = await Promise.all(
          userClasses.map(async (classInfo) => {
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

            // Extract day of week from class info if available, otherwise use empty string
            const day = "";

            return {
              id: classInfo.classId,
              name: classInfo.className,
              day,
              NumberAttended: numberAttended,
            };
          })
        );

        setUserClassesWithAttendance(classesWithAttendance);
      } catch (error) {
        console.error("Error loading attendance data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (!classesLoading) {
      fetchAttendanceData();
    }
  }, [userClasses, classesLoading, user?.uid]);

  const handleClassLeave = async (classId: string) => {
    if (!user?.uid) return;

    try {
      await leaveClass(user.uid, classId);
      // Remove the class from the list
      setUserClassesWithAttendance(
        userClassesWithAttendance.filter((c) => c.id !== classId)
      );
    } catch (error) {
      console.error("Error leaving class:", error);
    }
  };

  const handleClassArchive = async (classId: string) => {
    if (!user?.uid) return;

    try {
      await archiveClass(user.uid, classId);
      // Remove the class from the list and increment archive count
      setUserClassesWithAttendance(
        userClassesWithAttendance.filter((c) => c.id !== classId)
      );
      setArchivedClassesCount((prev) => prev + 1);
    } catch (error) {
      console.error("Error archiving class:", error);
    }
  };

  const handleJoinClass = () => {
    router.push("/join-class");
  };

  return (
    <View style={styles.contentContainer}>
      <View style={styles.mainContent}>
        <Animated.Text style={[styles.title, animatedTitleStyle]}>
          Your Classes
        </Animated.Text>
        <Animated.View
          style={[styles.countContainer, animatedSessionCountContainerStyle]}
        >
          <Text style={styles.sessionCount}>
            {userClassesWithAttendance.length} active classes
          </Text>
        </Animated.View>

        <Animated.View style={[styles.gridContainer, animatedGridStyle]}>
          <ClassGrid
            classes={userClassesWithAttendance}
            archivedClassesCount={archivedClassesCount}
            onClassLeave={handleClassLeave}
            onClassArchive={handleClassArchive}
          />
        </Animated.View>
      </View>

      <View style={styles.logoutContainer}>
        <LogoutButton />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    paddingHorizontal: 20,
    flex: 1,
    paddingBottom: 90,
  },
  mainContent: {
    flex: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: theme.colors.text.primary,
    marginBottom: 4,
    marginTop: 10,
    paddingHorizontal: 8,
  },
  countContainer: {
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  sessionCount: {
    fontSize: 18,
    fontWeight: "400",
    color: theme.colors.text.secondary,
  },
  gridContainer: {
    width: "100%",
    marginBottom: 20,
  },
  joinButton: {
    backgroundColor: theme.colors.button.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 20,
    width: "80%",
  },
  joinButtonText: {
    color: theme.colors.button.text,
    fontWeight: "bold",
    fontSize: 16,
    textAlign: "center",
  },
  logoutContainer: {
    position: "absolute",
    bottom: 30,
    width: "100%",
    alignItems: "center",
    alignSelf: "center",
  },
});

export default ThisWeekSheetContent;
