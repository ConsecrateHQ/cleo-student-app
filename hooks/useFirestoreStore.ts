import { create } from "zustand";
import { getFirestore, createConverter } from "../utils/firebaseConfig";
import firestore, {
  FirebaseFirestoreTypes,
} from "@react-native-firebase/firestore";

// Types based on the database schema from the .cursor/rules/database.mdc
export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: "teacher" | "student";
  created_at: FirebaseFirestoreTypes.Timestamp;
}

export interface Class {
  classId: string;
  name: string;
  teacherId: string;
  joinCode?: string;
  created_at: FirebaseFirestoreTypes.Timestamp;
}

export interface Session {
  sessionId: string;
  classId: string;
  teacherId: string;
  startTime: FirebaseFirestoreTypes.Timestamp;
  endTime: FirebaseFirestoreTypes.Timestamp | null;
  status: "scheduled" | "active" | "ended" | "cancelled";
  location: FirebaseFirestoreTypes.GeoPoint;
  radius: number;
  created_at: FirebaseFirestoreTypes.Timestamp;
}

// Type converters for Firestore
const userConverter = createConverter<User>();
const classConverter = createConverter<Class>();
const sessionConverter = createConverter<Session>();

// Collection references with proper type casting
const usersCollection = () =>
  getFirestore()
    .collection("users")
    .withConverter(
      userConverter
    ) as FirebaseFirestoreTypes.CollectionReference<User>;

const classesCollection = () =>
  getFirestore()
    .collection("classes")
    .withConverter(
      classConverter
    ) as FirebaseFirestoreTypes.CollectionReference<Class>;

const sessionsCollection = () =>
  getFirestore()
    .collection("sessions")
    .withConverter(
      sessionConverter
    ) as FirebaseFirestoreTypes.CollectionReference<Session>;

// Store interface
interface FirestoreState {
  // Data
  classes: Class[];
  currentUserClasses: Class[];
  sessions: Session[];

  // Loading states
  isLoadingClasses: boolean;
  isLoadingUserClasses: boolean;
  isLoadingSessions: boolean;

  // Error states
  classesError: string | null;
  userClassesError: string | null;
  sessionsError: string | null;

  // Actions
  fetchClasses: (teacherId: string) => Promise<void>;
  fetchUserClasses: (userId: string) => Promise<void>;
  fetchClassSessions: (classId: string) => Promise<void>;
  createClass: (
    newClass: Omit<Class, "classId" | "created_at">
  ) => Promise<string>;
  createSession: (
    newSession: Omit<Session, "sessionId" | "created_at">
  ) => Promise<string>;
}

const useFirestoreStore = create<FirestoreState>((set, get) => ({
  // Initial data
  classes: [],
  currentUserClasses: [],
  sessions: [],

  // Initial loading states
  isLoadingClasses: false,
  isLoadingUserClasses: false,
  isLoadingSessions: false,

  // Initial error states
  classesError: null,
  userClassesError: null,
  sessionsError: null,

  // Actions
  fetchClasses: async (teacherId: string) => {
    set({ isLoadingClasses: true, classesError: null });
    try {
      const snapshot = await classesCollection()
        .where("teacherId", "==", teacherId)
        .get();

      const classes = snapshot.docs.map((doc) => ({
        ...doc.data(),
        classId: doc.id,
      }));

      set({ classes, isLoadingClasses: false });
    } catch (error) {
      console.error("Error fetching classes:", error);
      set({
        classesError: error instanceof Error ? error.message : "Unknown error",
        isLoadingClasses: false,
      });
    }
  },

  fetchUserClasses: async (userId: string) => {
    set({ isLoadingUserClasses: true, userClassesError: null });
    try {
      // Using the userClasses collection for efficiency
      const snapshot = await getFirestore()
        .collection(`userClasses/${userId}/classes`)
        .get();

      if (snapshot.empty) {
        set({ currentUserClasses: [], isLoadingUserClasses: false });
        return;
      }

      // Get the full class details for each class ID
      const classIds = snapshot.docs.map((doc) => doc.id);
      const classPromises = classIds.map((id) =>
        classesCollection().doc(id).get()
      );

      const classResults = await Promise.all(classPromises);
      const classes = classResults
        .filter((doc) => doc.exists)
        .map(
          (doc) =>
            ({
              ...doc.data(),
              classId: doc.id,
            } as Class)
        );

      set({ currentUserClasses: classes, isLoadingUserClasses: false });
    } catch (error) {
      console.error("Error fetching user classes:", error);
      set({
        userClassesError:
          error instanceof Error ? error.message : "Unknown error",
        isLoadingUserClasses: false,
      });
    }
  },

  fetchClassSessions: async (classId: string) => {
    set({ isLoadingSessions: true, sessionsError: null });
    try {
      const snapshot = await sessionsCollection()
        .where("classId", "==", classId)
        .orderBy("startTime", "desc")
        .get();

      const sessions = snapshot.docs.map((doc) => ({
        ...doc.data(),
        sessionId: doc.id,
      }));

      set({ sessions, isLoadingSessions: false });
    } catch (error) {
      console.error("Error fetching sessions:", error);
      set({
        sessionsError: error instanceof Error ? error.message : "Unknown error",
        isLoadingSessions: false,
      });
    }
  },

  createClass: async (newClass) => {
    try {
      // Create new class document with auto-generated ID
      const classRef = classesCollection().doc();

      // Prepare class data with created_at timestamp
      const classData: Class = {
        ...newClass,
        classId: classRef.id,
        created_at: firestore.Timestamp.now(),
      };

      // Save to Firestore
      await classRef.set(classData);

      // Update local state
      set((state) => ({
        classes: [...state.classes, classData],
      }));

      return classRef.id;
    } catch (error) {
      console.error("Error creating class:", error);
      throw error;
    }
  },

  createSession: async (newSession) => {
    try {
      // Create new session document with auto-generated ID
      const sessionRef = sessionsCollection().doc();

      // Prepare session data with created_at timestamp
      const sessionData: Session = {
        ...newSession,
        sessionId: sessionRef.id,
        created_at: firestore.Timestamp.now(),
      };

      // Save to Firestore
      await sessionRef.set(sessionData);

      // Update local state
      set((state) => ({
        sessions: [...state.sessions, sessionData],
      }));

      return sessionRef.id;
    } catch (error) {
      console.error("Error creating session:", error);
      throw error;
    }
  },
}));

export default useFirestoreStore;
