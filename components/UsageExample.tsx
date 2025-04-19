import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import Animated, { useSharedValue, withTiming } from "react-native-reanimated";
import CheckInButton from "./CheckInButton";
import ClassCard from "./ClassCard";

const UsageExample = () => {
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isActiveSession, setIsActiveSession] = useState(false);
  const [classes, setClasses] = useState([
    { id: "1", name: "Mathematics", day: "Monday", attendance: 15 },
    { id: "2", name: "Physics", day: "Wednesday", attendance: 8 },
    { id: "3", name: "Chemistry", day: "Friday", attendance: 12 },
    { id: "4", name: "Biology", day: "Tuesday", attendance: 9 },
  ]);

  // Animation values for CheckInButton
  const textOpacity = useSharedValue(1);
  const newTextOpacity = useSharedValue(0);
  const circleScale = useSharedValue(1);

  const handleCheckIn = () => {
    setIsCheckingIn(true);

    // Simulate check-in process
    setTimeout(() => {
      setIsCheckingIn(false);
      setIsActiveSession(true);
      Alert.alert("Success", "You have checked in successfully!");
    }, 2000);
  };

  const handleJoinClass = async (code: string): Promise<void> => {
    console.log("Join class called with code:", code);

    // Simulate API call to join a class
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (code === "12345") {
          // Add a new class
          const newClass = {
            id: Date.now().toString(),
            name: "New Class",
            day: "Thursday",
            attendance: 0,
          };
          setClasses((prev) => [...prev, newClass]);
          console.log("Successfully joined class with code:", code);
          resolve();
        } else {
          console.log("Invalid class code:", code);
          reject(new Error(`Invalid class code: ${code}`));
        }
      }, 1500);
    });
  };

  const handleLeaveClass = (id: string) => {
    Alert.alert("Leave Class", "Are you sure you want to leave this class?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: () => {
          setClasses((prev) => prev.filter((c) => c.id !== id));
          Alert.alert("Success", "You have left the class");
        },
      },
    ]);
  };

  const handleArchiveClass = (id: string) => {
    Alert.alert(
      "Archive Class",
      "Are you sure you want to archive this class?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          onPress: () => {
            // In a real app, you would update the class status instead of removing it
            setClasses((prev) => prev.filter((c) => c.id !== id));
            Alert.alert("Success", "Class has been archived");
          },
        },
      ]
    );
  };

  // Animation styles
  const animatedTextStyle = {
    opacity: textOpacity,
  };

  const animatedNewTextStyle = {
    opacity: newTextOpacity,
  };

  const animatedCircleStyle = {
    transform: [{ scale: circleScale }],
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerText}>My Classes</Text>

      <ScrollView contentContainerStyle={styles.classContainer}>
        {classes.map((cls) => (
          <ClassCard
            key={cls.id}
            name={cls.name}
            day={cls.day}
            NumberAttended={cls.attendance}
            onLeave={() => handleLeaveClass(cls.id)}
            onArchive={() => handleArchiveClass(cls.id)}
          />
        ))}
      </ScrollView>

      <CheckInButton
        isCheckingIn={isCheckingIn}
        isActiveSession={isActiveSession}
        onPress={handleCheckIn}
        animatedTextStyle={animatedTextStyle}
        animatedNewTextStyle={animatedNewTextStyle}
        animatedCircleStyle={animatedCircleStyle}
        onJoinClass={handleJoinClass}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
    padding: 16,
  },
  headerText: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 20,
    marginTop: 40,
  },
  classContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
});

export default UsageExample;
