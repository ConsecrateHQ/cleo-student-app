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
  const host = Platform.OS === "ios" ? "localhost" : "10.0.2.2";
  console.log(
    `[FirebaseConfig] Determined emulator host for ${Platform.OS}: ${host}`
  );
  return host;
};

/**
 * Initialize Firebase services with emulators if in development
 */
export const initializeFirebase = () => {
  console.log(
    `[FirebaseConfig] initializeFirebase called. __DEV__ is ${__DEV__}`
  );
  if (useEmulator) {
    const host = getEmulatorHost();
    const firestorePort = 8082;
    const authPort = 9099;

    console.log(`[FirebaseConfig] 🔥 Using Firebase emulators. Host: ${host}`);

    try {
      console.log(
        `[FirebaseConfig]   -> Connecting to Firestore emulator at ${host}:${firestorePort}...`
      );
      firestore().useEmulator(host, firestorePort);
      console.log(
        "[FirebaseConfig]   ✅ Firestore emulator connection configured."
      );
    } catch (e) {
      console.error(
        "[FirebaseConfig]   ❌ Error configuring Firestore emulator:",
        e
      );
    }

    try {
      console.log(
        `[FirebaseConfig]   -> Connecting to Auth emulator at http://${host}:${authPort}...`
      );
      auth().useEmulator(`http://${host}:${authPort}`);
      console.log("[FirebaseConfig]   ✅ Auth emulator connection configured.");
    } catch (e) {
      console.error(
        "[FirebaseConfig]   ❌ Error configuring Auth emulator:",
        e
      );
    }
  } else {
    console.log(
      "[FirebaseConfig] Not using emulators (production mode or __DEV__ is false)."
    );
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
