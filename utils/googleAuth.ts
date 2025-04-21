import {
  GoogleSignin,
  statusCodes,
  isErrorWithCode,
} from "@react-native-google-signin/google-signin";
// Remove Native Firebase Auth imports
// import { FirebaseAuthTypes } from "@react-native-firebase/auth";
// import {
//   getAuth as getRNAuth,
//   signInWithCredential as signInWithCredentialNative,
//   GoogleAuthProvider as GoogleAuthProviderNative,
//   signOut as firebaseSignOutNative,
// } from "@react-native-firebase/auth";

// Keep Web SDK auth functions and types
import {
  GoogleAuthProvider as GoogleAuthProviderWeb,
  signInWithCredential as signInWithCredentialWeb,
  signOut as firebaseSignOutWeb,
  User as WebUser,
  UserCredential as WebUserCredential, // Import UserCredential for return type if needed
} from "firebase/auth";
// Keep Web app and auth instance import
import { webAuth } from "./firebaseConfig";

// Configure Google Sign In - Call this once at app startup
// Using 'autoDetect' assumes you have firebase config files setup correctly
// (google-services.json and GoogleService-Info.plist with WEB_CLIENT_ID)
GoogleSignin.configure({
  webClientId:
    "48288193953-qabq45adf4lbsscfk4oc6rkv55m16trj.apps.googleusercontent.com", // Detects from firebase config
});

// Sign in function - Changed return type to Promise<WebUser | null>
// We primarily rely on onAuthStateChanged, but returning the user can be useful.
export const signInWithGoogle = async (): Promise<WebUser | null> => {
  // Remove nativeAuthInstance

  try {
    // Check if device has Google Play Services installed & up-to-date
    // Recommended for Android
    await GoogleSignin.hasPlayServices({
      showPlayServicesUpdateDialog: true,
    });

    console.log("[googleAuth] Calling GoogleSignin.signIn()...");
    const response = await GoogleSignin.signIn();
    console.log(
      "[googleAuth] GoogleSignin.signIn() response:",
      JSON.stringify(response, null, 2)
    );
    const idToken = (response as any)?.data?.idToken;

    if (!idToken) {
      console.log(
        "[googleAuth] Google Sign-In cancelled or failed: No ID token received."
      );
      return null;
    }

    // --- Remove Native Firebase Sign-In Block ---
    // console.log("[googleAuth] Attempting Native Firebase Sign-In...");
    // const nativeGoogleCredential =
    //   GoogleAuthProviderNative.credential(idToken);
    // const nativeUserCredential: FirebaseAuthTypes.UserCredential =
    //   await signInWithCredentialNative(
    //     nativeAuthInstance,
    //     nativeGoogleCredential
    //   );
    // console.log(
    //   "[googleAuth] ✅ Signed in with Native Firebase! User:",
    //   nativeUserCredential.user?.uid
    // );

    // --- Only Web Firebase Sign-In ---
    console.log("[googleAuth] Attempting Web Firebase Sign-In...");
    const webGoogleCredential = GoogleAuthProviderWeb.credential(idToken);
    const webUserCredential: WebUserCredential = await signInWithCredentialWeb(
      webAuth, // Use imported webAuth instance
      webGoogleCredential
    );
    const webUser: WebUser = webUserCredential.user;
    console.log(
      "[googleAuth] ✅ Signed in with Web Firebase! User:",
      webUser?.uid
    );
    console.log(
      "[googleAuth]   Web SDK currentUser:",
      webAuth.currentUser?.uid
    );

    // Return the Web SDK user
    return webUser;
  } catch (error: any) {
    console.error(
      "[googleAuth] Error during Google Sign-In or Web Firebase sign-in:",
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
  // Remove nativeAuthInstance
  let googleSignOutError = null;
  // Remove nativeSignOutError
  let webSignOutError = null;

  try {
    // 1. Try Google Signout (Keep this)
    try {
      console.log("[googleAuth] Attempting Google SignOut...");
      await GoogleSignin.revokeAccess();
      await GoogleSignin.signOut();
      console.log("[googleAuth] ✅ Google SignOut successful.");
    } catch (error) {
      googleSignOutError = error;
      console.warn("[googleAuth] ⚠️ Google Sign Out Error:", error);
    }

    // 2. Remove Native Firebase Signout block
    // try {
    //   console.log("[googleAuth] Attempting Native Firebase SignOut...");
    //   await firebaseSignOutNative(nativeAuthInstance);
    //   console.log("[googleAuth] ✅ Native Firebase SignOut successful.");
    // } catch (error) {
    //   nativeSignOutError = error;
    //   console.error("[googleAuth] ❌ Native Firebase Sign Out Error:", error);
    // }

    // 3. Try Web Firebase Signout (Keep this)
    try {
      console.log("[googleAuth] Attempting Web Firebase SignOut...");
      if (webAuth.currentUser) {
        // Check if user is signed in with Web SDK
        await firebaseSignOutWeb(webAuth);
        console.log("[googleAuth] ✅ Web Firebase SignOut successful.");
      } else {
        console.log(
          "[googleAuth] No user signed in with Web Firebase SDK, skipping sign out."
        );
      }
    } catch (error) {
      webSignOutError = error;
      console.error("[googleAuth] ❌ Web Firebase Sign Out Error:", error);
    }

    // 4. Final error handling
    if (!__DEV__) {
      // Only consider Google and Web errors now
      if (googleSignOutError || webSignOutError) {
        throw new Error("Sign out failed. See logs for details.");
      }
    } else {
      console.log(
        "[googleAuth] DEV mode: Sign out process complete (errors ignored)."
      );
    }
  } catch (error) {
    console.error("[googleAuth] Sign Out failed critically:", error);
    if (!__DEV__) {
      throw error;
    }
  }
};
