import {
  GoogleSignin,
  statusCodes,
  isErrorWithCode,
} from "@react-native-google-signin/google-signin";
// Re-import FirebaseAuthTypes for the UserCredential type
import auth, { FirebaseAuthTypes } from "@react-native-firebase/auth";
// Use modular imports from @react-native-firebase/auth for functions
import {
  getAuth,
  signInWithCredential,
  GoogleAuthProvider,
  signOut as firebaseSignOut, // Alias signOut to avoid naming conflict
} from "@react-native-firebase/auth";

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
    // Get the auth instance using the modular API
    const authInstance = getAuth();
    try {
      // Check if device has Google Play Services installed & up-to-date
      // Recommended for Android
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });

      // Get the users ID token
      // The response object contains a 'data' property holding the user info on success
      const response = await GoogleSignin.signIn();

      // Check if idToken exists in the response data to determine success
      const idToken = response?.data?.idToken; // Use optional chaining

      if (!idToken) {
        // Handle cancellation or failure where idToken is not received
        console.log(
          "Google Sign-In cancelled or failed: No ID token received."
        );
        return null;
      }

      // Create a Google credential with the token using the modular GoogleAuthProvider
      const googleCredential = GoogleAuthProvider.credential(idToken);

      // Sign-in the user with the credential using the modular signInWithCredential
      const userCredential: FirebaseAuthTypes.UserCredential =
        await signInWithCredential(authInstance, googleCredential);
      console.log("Signed in with Google!", userCredential.user);
      return userCredential;
    } catch (error: any) {
      console.error("Google Sign-In Error:", error);
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
  // Get the auth instance using the modular API
  const authInstance = getAuth();
  try {
    await GoogleSignin.revokeAccess(); // Revoke Google access
    await GoogleSignin.signOut(); // Sign out from Google
    await firebaseSignOut(authInstance); // Sign out from Firebase using the modular API
    console.log("User signed out successfully!");
  } catch (error) {
    console.error("Sign Out Error:", error);
  }
};
