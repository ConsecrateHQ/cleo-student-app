import {
  GoogleSignin,
  statusCodes,
  isErrorWithCode,
} from "@react-native-google-signin/google-signin";
// Re-import FirebaseAuthTypes for the UserCredential type
import { FirebaseAuthTypes } from "@react-native-firebase/auth";
// Use modular imports from @react-native-firebase/auth for functions
import {
  getAuth as getRNAuth,
  signInWithCredential as signInWithCredentialNative,
  GoogleAuthProvider as GoogleAuthProviderNative,
  signOut as firebaseSignOutNative,
} from "@react-native-firebase/auth";
// Import Web SDK auth functions and types
import {
  GoogleAuthProvider as GoogleAuthProviderWeb,
  signInWithCredential as signInWithCredentialWeb,
  signOut as firebaseSignOutWeb,
  User as WebUser, // Import Web User type
} from "firebase/auth";
import { webApp, webAuth } from "./firebaseConfig"; // Import Web app and auth instance

// Configure Google Sign In - Call this once at app startup
// Using 'autoDetect' assumes you have firebase config files setup correctly
// (google-services.json and GoogleService-Info.plist with WEB_CLIENT_ID)
GoogleSignin.configure({
  webClientId:
    "48288193953-qabq45adf4lbsscfk4oc6rkv55m16trj.apps.googleusercontent.com", // Detects from firebase config
});

// Sign in function
export const signInWithGoogle =
  async (): Promise<FirebaseAuthTypes.UserCredential | null> => {
    // Get the NATIVE auth instance
    const nativeAuthInstance = getRNAuth(); // Use alias if needed, but getRNAuth is clear

    try {
      // Check if device has Google Play Services installed & up-to-date
      // Recommended for Android
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });

      // Get the users ID token
      console.log("[googleAuth] Calling GoogleSignin.signIn()...");
      const response = await GoogleSignin.signIn();
      console.log(
        "[googleAuth] GoogleSignin.signIn() response:",
        JSON.stringify(response, null, 2)
      );
      const idToken = (response as any)?.data?.idToken; // Access idToken via nested data property

      if (!idToken) {
        console.log(
          "[googleAuth] Google Sign-In cancelled or failed: No ID token received."
        );
        return null;
      }

      // --- Native Firebase Sign-In ---
      console.log("[googleAuth] Attempting Native Firebase Sign-In...");
      const nativeGoogleCredential =
        GoogleAuthProviderNative.credential(idToken);
      const nativeUserCredential: FirebaseAuthTypes.UserCredential =
        await signInWithCredentialNative(
          nativeAuthInstance,
          nativeGoogleCredential
        );
      console.log(
        "[googleAuth] ✅ Signed in with Native Firebase! User:",
        nativeUserCredential.user?.uid
      );

      // --- Web Firebase Sign-In (Bridging) ---
      try {
        console.log(
          "[googleAuth] Attempting Web Firebase Sign-In (Bridging)..."
        );
        const webGoogleCredential = GoogleAuthProviderWeb.credential(idToken);
        // Use the imported webAuth instance from firebaseConfig
        const webUserCredential = await signInWithCredentialWeb(
          webAuth,
          webGoogleCredential
        );
        const webUser: WebUser = webUserCredential.user; // Get the Web SDK user
        console.log(
          "[googleAuth] ✅ Signed in with Web Firebase! User:",
          webUser?.uid // Log Web SDK user UID
        );
        console.log(
          "[googleAuth]   Web SDK currentUser:",
          webAuth.currentUser?.uid
        ); // Confirm context is set
      } catch (webError) {
        console.error(
          "[googleAuth] ❌ Error during Web Firebase Sign-In:",
          webError
        );
        // Decide if this error should prevent the whole flow or just be logged
        // For now, we'll log it but still return the native credential if that succeeded.
        // Depending on requirements, you might want to sign out the native user here too.
      }

      // Return the NATIVE user credential as before (maintaining existing app flow)
      return nativeUserCredential;
    } catch (error: any) {
      console.error(
        "[googleAuth] Error during Google Sign-In or Firebase bridging:",
        error
      );
      console.error("[googleAuth] Error Code:", error?.code);
      console.error("[googleAuth] Error Message:", error?.message);
      if (isErrorWithCode(error)) {
        switch (error.code) {
          case statusCodes.SIGN_IN_CANCELLED:
            // user cancelled the login flow
            console.log("User cancelled the login flow");
            break;
          case statusCodes.IN_PROGRESS:
            // operation (e.g. sign in) is in progress already
            console.log("Operation (e.g. sign in) is in progress already");
            break;
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            // play services not available or outdated
            console.log("Play services not available or outdated");
            // You might want to trigger an update flow here
            break;
          default:
            // some other error happened
            console.log("Some other error happened", error.code);
        }
      } else {
        // an error that's not related to google sign in occurred
        console.log("An unknown error occurred", error);
      }
      return null;
    }
  };

// Sign out function
export const signOut = async () => {
  // Get the NATIVE auth instance
  const nativeAuthInstance = getRNAuth();
  // Web auth instance is already imported as webAuth

  let googleSignOutError = null;
  let nativeSignOutError = null;
  let webSignOutError = null;

  try {
    // 1. Try Google Signout
    try {
      console.log("[googleAuth] Attempting Google SignOut...");
      await GoogleSignin.revokeAccess();
      await GoogleSignin.signOut();
      console.log("[googleAuth] ✅ Google SignOut successful.");
    } catch (error) {
      googleSignOutError = error;
      console.warn("[googleAuth] ⚠️ Google Sign Out Error:", error);
      // Don't re-throw immediately, attempt Firebase signouts regardless
    }

    // 2. Try Native Firebase Signout
    try {
      console.log("[googleAuth] Attempting Native Firebase SignOut...");
      await firebaseSignOutNative(nativeAuthInstance);
      console.log("[googleAuth] ✅ Native Firebase SignOut successful.");
    } catch (error) {
      nativeSignOutError = error;
      console.error("[googleAuth] ❌ Native Firebase Sign Out Error:", error);
    }

    // 3. Try Web Firebase Signout
    try {
      console.log("[googleAuth] Attempting Web Firebase SignOut...");
      await firebaseSignOutWeb(webAuth); // Use imported webAuth instance
      console.log("[googleAuth] ✅ Web Firebase SignOut successful.");
    } catch (error) {
      webSignOutError = error;
      console.error("[googleAuth] ❌ Web Firebase Sign Out Error:", error);
    }

    // 4. Final error handling (re-throw in production if any critical step failed)
    if (!__DEV__) {
      if (googleSignOutError || nativeSignOutError || webSignOutError) {
        // Optionally create a composite error
        throw new Error("Sign out failed. See logs for details.");
      }
    } else {
      console.log(
        "[googleAuth] DEV mode: Sign out process complete (errors ignored)."
      );
    }
  } catch (error) {
    // Catch errors re-thrown in production
    console.error("[googleAuth] Sign Out failed critically:", error);
    if (!__DEV__) {
      throw error; // Re-throw final error in production
    }
  }
};
