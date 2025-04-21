import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { webDb } from "../utils/firebaseConfig";
import useAuthStore from "./useAuthStore";
import { getClassDetails } from "../utils/firebaseClassSessionHelpers";

/**
 * Custom hook to listen for changes in a session's status.
 * When a session status changes from 'active' to 'ended',
 * it sets a state to show the congratulations drawer.
 *
 * @param sessionId The ID of the session to monitor
 * @returns Object containing showCongratulations state and a function to hide it
 */
export const useSessionStatusListener = (sessionId: string | null) => {
  const [showCongratulations, setShowCongratulations] = useState(false);
  const [className, setClassName] = useState("");
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    // Don't set up listener if no sessionId or user
    if (!sessionId || !user) {
      return;
    }

    console.log(
      `Setting up session status listener for sessionId: ${sessionId}`
    );

    // Reference to the session document using Web SDK and webDb
    const sessionRef = doc(webDb, "sessions", sessionId);

    // Set up the snapshot listener
    const unsubscribe = onSnapshot(
      sessionRef,
      async (snapshot) => {
        if (!snapshot.exists) {
          console.log(`Session document ${sessionId} does not exist`);
          return;
        }

        const sessionData = snapshot.data();
        console.log(
          `Session status update for ${sessionId}: ${sessionData?.status}`
        );

        // Check if status changed to 'ended'
        if (sessionData?.status === "ended") {
          console.log(
            "Session ended! Getting class details and showing congratulations drawer"
          );

          try {
            // Get class details to retrieve the class name
            const classId = sessionData.classId;
            if (classId) {
              const classDetails = await getClassDetails(classId);
              if (classDetails) {
                setClassName(classDetails.name);
              } else {
                console.warn(
                  `Could not find class details for classId: ${classId}`
                );
                setClassName("Class");
              }
            } else {
              console.warn("Session data has no classId");
              setClassName("Class");
            }

            // Show congratulations drawer
            setShowCongratulations(true);
          } catch (error) {
            console.error("Error getting class details:", error);
            setClassName("Class");
            setShowCongratulations(true);
          }
        }
      },
      (error) => {
        console.error(`Error listening to session ${sessionId} status:`, error);
      }
    );

    // Clean up listener on unmount or when sessionId changes
    return () => {
      console.log(
        `Cleaning up session status listener for sessionId: ${sessionId}`
      );
      unsubscribe();
    };
  }, [sessionId, user]);

  // Function to hide the congratulations drawer
  const hideCongratulations = () => {
    setShowCongratulations(false);
  };

  return {
    showCongratulations,
    hideCongratulations,
    className,
  };
};
