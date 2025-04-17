import firestore, {
  FirebaseFirestoreTypes,
} from "@react-native-firebase/firestore";
import auth from "@react-native-firebase/auth";
import { Platform } from "react-native";

const useEmulator = __DEV__;
// Host IP address must point to your machine's IP, not localhost
// This is because the emulator runs in a separate environment than your app
// For iOS simulators, use 'localhost'
// For Android emulators, use '10.0.2.2' or your machine's actual IP
const getEmulatorHost = () => {
  return Platform.OS === "ios" ? "localhost" : "10.0.2.2";
};

/**
 * Initialize Firebase services with emulators if in development
 */
export const initializeFirebase = () => {
  if (useEmulator) {
    console.log("🔥 Using Firebase emulators");

    // Connect to Auth emulator
    auth().useEmulator(`http://${getEmulatorHost()}:9099`);

    // Connect to Firestore emulator
    firestore().useEmulator(getEmulatorHost(), 8081);
  }
};

/**
 * Get a singleton Firestore instance
 */
export const getFirestore = () => {
  return firestore();
};

/**
 * Create a Firestore data converter for a specific type
 * This helps with TypeScript type safety when reading/writing documents
 */
export function createConverter<T>() {
  return {
    toFirestore: (data: T) => data,
    fromFirestore: (snap: FirebaseFirestoreTypes.QueryDocumentSnapshot) =>
      snap.data() as T,
  };
}
