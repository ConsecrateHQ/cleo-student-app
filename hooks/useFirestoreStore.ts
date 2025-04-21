import { create } from "zustand";
import { createConverter, webDb } from "../utils/firebaseConfig";
// Updated imports for v9+ Web SDK syntax
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
  setDoc,
  Timestamp,
  GeoPoint,
  writeBatch,
} from "firebase/firestore";
// Import necessary types directly from the namespace
// import type { FirebaseFirestoreTypes } from "@react-native-firebase/firestore";

// Types based on the database schema from the .cursor/rules/database.mdc
export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: "teacher" | "student";
  created_at: Timestamp; // Use Web SDK Timestamp
  joinCode?: string;
}

export interface Class {
  classId: string;
  name: string;
  teacherId: string;
  joinCode?: string;
  created_at: Timestamp; // Use Web SDK Timestamp
}

export interface Session {
  sessionId: string;
  classId: string;
  teacherId: string;
  startTime: Timestamp; // Use Web SDK Timestamp
  endTime: Timestamp | null; // Use Web SDK Timestamp
  status: "scheduled" | "active" | "ended" | "cancelled";
  location: GeoPoint; // Use Web SDK GeoPoint
  radius: number;
  created_at: Timestamp; // Use Web SDK Timestamp
}

// Type converters for Firestore (defined but not used on collections directly)
const userConverter = createConverter<User>();
const classConverter = createConverter<Class>();
const sessionConverter = createConverter<Session>();

// Collection references WITHOUT withConverter, using webDb
const usersCollection = () => {
  return collection(webDb, "users");
};

const classesCollection = () => {
  return collection(webDb, "classes");
};

const sessionsCollection = () => {
  return collection(webDb, "sessions");
};

// Get a typed reference to a specific user's classes subcollection
// No converter needed here as we often just store IDs or simple data
const userSpecificClassesCollection = (userId: string) => {
  return collection(webDb, `userClasses/${userId}/classes`);
};

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
    newClass: Omit<Class, "classId" | "created_at" | "joinCode"> // Removed joinCode as it's generated server-side
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
      // Use v9+ query syntax
      const q = query(classesCollection(), where("teacherId", "==", teacherId));
      const snapshot = await getDocs(q);

      const fetchedClasses = snapshot.docs.map((docSnap) => {
        // Explicitly assert type since converter is not used on collection
        const data = docSnap.data() as Class;
        return {
          ...data,
          classId: docSnap.id,
        };
      });

      set({ classes: fetchedClasses, isLoadingClasses: false });
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
      // Using the userClasses collection for efficiency with v9+ syntax
      const userClassesRef = userSpecificClassesCollection(userId);
      const snapshot = await getDocs(userClassesRef);

      if (snapshot.empty) {
        set({ currentUserClasses: [], isLoadingUserClasses: false });
        return;
      }

      // Get the full class details for each class ID
      const classIds = snapshot.docs.map((docSnap) => docSnap.id);
      // Use base collection ref for doc() calls
      const classesColRef = collection(webDb, "classes");
      const classPromises = classIds.map((id) =>
        getDoc(doc(classesColRef, id))
      );

      const classResults = await Promise.all(classPromises);
      const fetchedClasses = classResults
        .filter((docSnap) => docSnap.exists) // Keep simple exists check
        .map((docSnap) => {
          // Explicitly assert type
          const data = docSnap.data() as Class;
          return {
            ...data,
            classId: docSnap.id,
          };
        });

      set({ currentUserClasses: fetchedClasses, isLoadingUserClasses: false });
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
      // Use v9+ query syntax
      const q = query(
        sessionsCollection(),
        where("classId", "==", classId),
        orderBy("startTime", "desc")
      );
      const snapshot = await getDocs(q);

      const fetchedSessions = snapshot.docs.map((docSnap) => {
        // Explicitly assert type
        const data = docSnap.data() as Session;
        return {
          ...data,
          sessionId: docSnap.id,
        };
      });

      set({ sessions: fetchedSessions, isLoadingSessions: false });
    } catch (error) {
      console.error("Error fetching sessions:", error);
      set({
        sessionsError: error instanceof Error ? error.message : "Unknown error",
        isLoadingSessions: false,
      });
    }
  },

  createClass: async (newClass) => {
    // Explicitly return Promise<string>
    try {
      // const db = getFirestore(app); // Removed, use webDb
      // Create ref in base collection
      // Use webDb instead of getFirestore(app)
      const classesColRef = collection(webDb, "classes");
      const classRef = doc(classesColRef);

      // Prepare class data
      const classData: Class = {
        ...newClass,
        classId: classRef.id,
        created_at: Timestamp.fromDate(new Date()),
        // joinCode is optional and added by cloud function
      };

      const batch = writeBatch(webDb);
      // Set data using the untyped ref (Firestore handles the object)
      batch.set(classRef, classData);

      const userClassRef = doc(
        userSpecificClassesCollection(newClass.teacherId),
        classRef.id
      );
      batch.set(userClassRef, { added_at: Timestamp.fromDate(new Date()) });

      await batch.commit();

      // Update local state optimistically
      // Ensure the object matches Class type, explicitly setting joinCode as undefined
      const optimisticClassData: Class = {
        ...classData,
        joinCode: undefined,
      };

      set((state) => ({
        classes: [...state.classes, optimisticClassData],
      }));

      return classRef.id;
    } catch (error) {
      console.error("Error creating class:", error);
      throw error; // Re-throw the error to be handled by the caller
    }
  },

  createSession: async (newSession): Promise<string> => {
    // Explicit return type
    try {
      // const db = getFirestore(app); // Removed, use webDb
      // Create ref in base collection
      // Use webDb directly
      const sessionColRef = collection(webDb, "sessions");
      const sessionRef = doc(sessionColRef);

      // Prepare session data
      const sessionData: Session = {
        ...newSession,
        sessionId: sessionRef.id,
        created_at: Timestamp.fromDate(new Date()),
      };

      // Save to Firestore using untyped ref
      await setDoc(sessionRef, sessionData);

      // Update local state
      set((state) => ({
        // Order might change if not re-fetching, add to beginning if sorted desc
        sessions: [sessionData, ...state.sessions],
      }));

      return sessionRef.id;
    } catch (error) {
      console.error("Error creating session:", error);
      throw error; // Re-throw the error to be handled by the caller
    }
  },
}));

export default useFirestoreStore;
