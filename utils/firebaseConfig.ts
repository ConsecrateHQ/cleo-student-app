import { Platform } from "react-native";

// Web SDK imports
import { initializeApp, FirebaseApp, getApp, getApps } from "firebase/app";
import {
  getFirestore,
  connectFirestoreEmulator as connectWebFirestoreEmulator,
  collection as webCollection,
  doc as webDoc,
  setDoc as webSetDoc,
  getDoc as webGetDoc,
  deleteDoc as webDeleteDoc,
  Firestore as WebFirestore,
  initializeFirestore,
  Firestore,
  QueryDocumentSnapshot,
  DocumentSnapshot,
} from "firebase/firestore";
import {
  getAuth as getWebAuth,
  connectAuthEmulator as connectWebAuthEmulator,
  Auth as WebAuth,
} from "firebase/auth";

// React Native Firebase imports
// import {
//   getFirestore as getRNFirestore,
//   connectFirestoreEmulator as connectRNFirestoreEmulator,
//   FirebaseFirestoreTypes,
//   collection as rnCollection,
//   doc as rnDoc,
//   setDoc as rnSetDoc,
//   getDoc as rnGetDoc,
//   deleteDoc as rnDeleteDoc,
// } from "@react-native-firebase/firestore";
// import {
//   getAuth as getRNAuth,
//   connectAuthEmulator as connectRNAuthEmulator,
//   FirebaseAuthTypes,
// } from "@react-native-firebase/auth";
// Use the default export for the app instance and type
// import rnFirebaseApp from "@react-native-firebase/app";

// Firebase Web SDK configuration - Export this
export const firebaseConfig = {
  apiKey: "AIzaSyAnhd1j8ws16y0X6iDuBcwbUdgHr9M_1II",
  authDomain: "cleo-dev-f31ac.firebaseapp.com",
  projectId: "cleo-dev-f31ac",
  storageBucket: "cleo-dev-f31ac.firebasestorage.app",
  messagingSenderId: "48288193953",
  appId: "1:48288193953:web:de985ddf1b3f3d4ffe3fe0",
};

// --- Initialize Apps ---
// Initialize Web App safely (check if already initialized)
const initializeWebApp = (): FirebaseApp => {
  if (!getApps().length) {
    return initializeApp(firebaseConfig);
  } else {
    return getApp(); // Return existing app
  }
};
export const webApp: FirebaseApp = initializeWebApp();
// Use the imported default RN app instance and infer its type
// export const rnApp = rnFirebaseApp.app();

// --- Configurable Instances (Connect to Emulator OR Cloud based on useEmulator) ---
// Declare exports without assigning here
export let webDb: WebFirestore;
// export let rnDb: FirebaseFirestoreTypes.Module;
export let webAuth: WebAuth;
// export let rnAuth: FirebaseAuthTypes.Module;

// --- Configuration Flags ---
export const useEmulator = false; // Toggle this value to switch
// export const useWebSDK = true; // Remove this flag

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
 * Initialize Firebase services with emulators if enabled, otherwise use real Firebase
 * This function now configures the *exported* webDb, rnDb, webAuth, rnAuth instances.
 */
export const initializeFirebase = async () => {
  console.log(
    `[FirebaseConfig] initializeFirebase called. Using emulator: ${useEmulator}`
  );

  // Initialize exported variables to cloud versions first
  webDb = getFirestore(webApp);
  // rnDb = getRNFirestore(rnApp);
  webAuth = getWebAuth(webApp);
  // rnAuth = getRNAuth(rnApp);

  if (useEmulator) {
    const host = getEmulatorHost();
    const firestorePort = 8082;
    const authPort = 9099;

    console.log(`[FirebaseConfig] 🔥 Using Firebase emulators. Host: ${host}`);

    // ALWAYS Use Web SDK emulator setup
    try {
      console.log(
        `[FirebaseConfig]   -> Connecting Web Firestore instance to emulator at ${host}:${firestorePort}...`
      );
      connectWebFirestoreEmulator(webDb, host, firestorePort);
      console.log(
        "[FirebaseConfig]   ✅ Web Firestore instance configured for emulator."
      );
    } catch (e) {
      console.error(
        "[FirebaseConfig]   ❌ Error configuring Firestore emulator (Web SDK):",
        e
      );
    }

    try {
      console.log(
        `[FirebaseConfig]   -> Connecting Web Auth instance to emulator at http://${host}:${authPort}...`
      );
      connectWebAuthEmulator(webAuth, `http://${host}:${authPort}`);
      console.log(
        "[FirebaseConfig]   ✅ Web Auth instance configured for emulator."
      );
    } catch (e) {
      console.error(
        "[FirebaseConfig]   ❌ Error configuring Auth emulator (Web SDK):",
        e
      );
    }
  } else {
    console.log(
      "[FirebaseConfig] 🌐 Using production Firebase (cloud instance) for default exports."
    );

    // Optional: Perform a connection test to the CLOUD using the configured instances
    if (__DEV__) {
      // Define testCollectionName here
      const testCollectionName = "_initial_connection_test";
      try {
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(
              new Error(
                "Firebase cloud connection test timed out after 10 seconds"
              )
            );
          }, 10000);
        });

        const testDocData = {
          timestamp: new Date().toISOString(),
          message: "Firestore cloud connection test (Initial Config Check)",
          platform: Platform.OS,
          sdk: "Web SDK",
        };

        console.log(
          `[FirebaseConfig] 🔍 Testing Cloud Firestore connection with configured Web SDK instance...`
        );

        const connectionTest = async () => {
          const testDocId = `test_${Platform.OS}_web`;
          try {
            const testCollectionRef = webCollection(webDb, testCollectionName);
            const testDocRef = webDoc(testCollectionRef, testDocId);
            await webSetDoc(testDocRef, testDocData);
            console.log("[FirebaseConfig] ✅ Wrote test doc (Cloud Web SDK)");
            const snap = await webGetDoc(testDocRef);
            if (!snap.exists())
              throw new Error("Test doc not found after write");
            console.log("[FirebaseConfig] ✅ Read test doc (Cloud Web SDK)");
            await webDeleteDoc(testDocRef);
            console.log("[FirebaseConfig] ✅ Deleted test doc (Cloud Web SDK)");
            console.log(
              `[FirebaseConfig] 🎉 CONFIRMED: Configured Web SDK instance connected to Cloud Firestore!`
            );

            return true;
          } catch (err) {
            console.error(
              `[FirebaseConfig] ❌ Error during Cloud Web SDK connection test:`,
              err
            );
            throw err;
          }
        };

        await Promise.race([connectionTest(), timeoutPromise]).catch(
          (error) => {
            console.error(
              "[FirebaseConfig] ❌ Firebase CLOUD connection test failed:",
              error.message
            );
            console.error("[FirebaseConfig] Check that:");
            console.error("  1. Your Firebase project has Firestore enabled");
            console.error("  2. Your Firebase credentials are correct");
            console.error(
              `  3. Your Firestore security rules allow write/read/delete to the ${testCollectionName} collection`
            );
            console.error("  4. Your device/emulator has network connectivity");
            console.warn(
              "[FirebaseConfig] ⚠️ Continuing app startup despite Firebase cloud connection issues"
            );
          }
        );
      } catch (error) {
        console.error(
          "[FirebaseConfig] ❌ Failed initial setup/connection test:",
          error
        );
      }
    }
  }

  return true;
};

/**
 * Create a Firestore data converter for a specific type
 * This helps with TypeScript type safety when reading/writing documents
 */
export function createConverter<T>() {
  return {
    toFirestore: (data: Partial<T>) => data,
    fromFirestore: (snap: QueryDocumentSnapshot | DocumentSnapshot): T =>
      snap.data() as T,
  };
}
