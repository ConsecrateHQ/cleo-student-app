import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { signInWithGoogle, signOut } from "../utils/googleAuth";
import { User as WebUser } from "firebase/auth";
import {
  Timestamp,
  doc,
  getDoc,
  GeoPoint,
  FieldValue,
} from "firebase/firestore";
import { webDb } from "../utils/firebaseConfig";

interface ActiveSessionInfo {
  sessionId: string;
  classId: string;
  checkInTime: Timestamp | null;
  lastUpdated: Timestamp;
  joinTimestamp: number; // Local timestamp in milliseconds when user joined
}

interface StudentAttendanceRecordData {
  classId: string;
  checkInTime: Timestamp | null;
  checkInLocation: GeoPoint | null;
  status: string;
  isGpsVerified: boolean;
  lastUpdated: Timestamp;
}

type AuthState = {
  isLoggedIn: boolean;
  user: WebUser | null;
  activeSessionInfo: ActiveSessionInfo | null;
  isRestoringSession: boolean;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  setUser: (user: WebUser | null) => void;
  setActiveSession: (sessionInfo: ActiveSessionInfo | null) => void;
  checkAndRestoreSession: (userId: string) => Promise<void>;
};

const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isLoggedIn: false,
      user: null,
      activeSessionInfo: null,
      isRestoringSession: true,

      logout: async () => {
        if (get().user || __DEV__) {
          try {
            await signOut();
            set({
              user: null,
              isLoggedIn: false,
              activeSessionInfo: null,
              isRestoringSession: false,
            });
          } catch (error) {
            console.error("[AuthStore] Error during sign out:", error);
            set({
              user: null,
              isLoggedIn: false,
              activeSessionInfo: null,
              isRestoringSession: false,
            });
          }
        } else {
          console.log("[AuthStore] No user to log out.");
          set({
            user: null,
            isLoggedIn: false,
            activeSessionInfo: null,
            isRestoringSession: false,
          });
        }
      },

      loginWithGoogle: async () => {
        try {
          await signInWithGoogle();
        } catch (error) {
          console.error("[AuthStore] Error initiating Google Sign-in:", error);
        }
      },

      setUser: (user: WebUser | null) => {
        if (!user) {
          set({
            user: null,
            isLoggedIn: false,
            activeSessionInfo: null,
            isRestoringSession: false,
          });
        } else {
          set({ user: user, isLoggedIn: true });
        }
      },

      setActiveSession: (sessionInfo: ActiveSessionInfo | null) => {
        console.log("[AuthStore] Setting active session:", sessionInfo);
        set({ activeSessionInfo: sessionInfo });
      },

      checkAndRestoreSession: async (userId: string) => {
        if (!userId) {
          set({ isRestoringSession: false });
          return;
        }
        console.log(
          `[AuthStore] Checking for restored session for user: ${userId}`
        );
        set({ isRestoringSession: true });

        const restoredSessionInfo = get().activeSessionInfo;

        if (restoredSessionInfo && restoredSessionInfo.sessionId) {
          console.log(
            `[AuthStore] Found restored session ID: ${restoredSessionInfo.sessionId}. Verifying...`
          );
          try {
            const attendanceRef = doc(
              webDb,
              `sessions/${restoredSessionInfo.sessionId}/attendance/${userId}`
            );
            const attendanceSnap = await getDoc(attendanceRef);

            if (
              attendanceSnap.exists() &&
              (attendanceSnap.data().status === "checked_in" ||
                attendanceSnap.data().status === "verified")
            ) {
              const attendanceData =
                attendanceSnap.data() as StudentAttendanceRecordData;
              console.log(
                `[AuthStore] Restored session verified. Status: ${attendanceData.status}. Updating lastUpdated.`
              );
              set({
                activeSessionInfo: {
                  sessionId: restoredSessionInfo.sessionId,
                  classId: restoredSessionInfo.classId,
                  checkInTime: attendanceData.checkInTime,
                  lastUpdated: attendanceData.lastUpdated,
                  joinTimestamp:
                    restoredSessionInfo.joinTimestamp || Date.now(),
                },
                isRestoringSession: false,
              });
            } else {
              console.log(
                `[AuthStore] Restored session ${
                  restoredSessionInfo.sessionId
                } is no longer valid (status: ${
                  attendanceSnap.data()?.status ?? "not found"
                }). Clearing.`
              );
              set({ activeSessionInfo: null, isRestoringSession: false });
            }
          } catch (error) {
            console.error(
              "[AuthStore] Error verifying restored session:",
              error
            );
            set({ activeSessionInfo: null, isRestoringSession: false });
          }
        } else {
          console.log("[AuthStore] No session info found in storage.");
          set({ activeSessionInfo: null, isRestoringSession: false });
        }
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        isLoggedIn: state.isLoggedIn,
        activeSessionInfo: state.activeSessionInfo,
      }),
    }
  )
);

export default useAuthStore;
