import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { signInWithGoogle, signOut } from "../utils/googleAuth";
import { FirebaseAuthTypes } from "@react-native-firebase/auth";

type AuthState = {
  isLoggedIn: boolean;
  login: () => void;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  user: FirebaseAuthTypes.User | null;
  setUser: (user: FirebaseAuthTypes.User | null) => void;
};

const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isLoggedIn: false,
      user: null,
      login: () => set({ isLoggedIn: true, user: null }),
      logout: async () => {
        if (get().user) {
          try {
            await signOut();
          } catch (error) {
            console.error("Error during Firebase/Google sign out:", error);
            set({ user: null, isLoggedIn: false });
          }
        } else {
          console.log("Developer Mode Signed Out.");
          set({ user: null, isLoggedIn: false });
        }
      },
      loginWithGoogle: async () => {
        try {
          await signInWithGoogle();
        } catch (error) {
          console.error("Error initiating Google Sign-in:", error);
        }
      },
      setUser: (user) => set({ user: user, isLoggedIn: !!user }),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useAuthStore;
