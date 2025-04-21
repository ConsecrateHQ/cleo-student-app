import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { signInWithGoogle, signOut } from "../utils/googleAuth";
import { User as WebUser } from "firebase/auth";

type AuthState = {
  isLoggedIn: boolean;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  user: WebUser | null;
  setUser: (user: WebUser | null) => void;
};

const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isLoggedIn: false,
      user: null,
      logout: async () => {
        if (get().user || __DEV__) {
          try {
            await signOut();
            set({ user: null, isLoggedIn: false });
          } catch (error) {
            console.error("[AuthStore] Error during sign out:", error);
            set({ user: null, isLoggedIn: false });
          }
        } else {
          console.log("[AuthStore] No user to log out.");
          set({ user: null, isLoggedIn: false });
        }
      },
      loginWithGoogle: async () => {
        try {
          await signInWithGoogle();
        } catch (error) {
          console.error("[AuthStore] Error initiating Google Sign-in:", error);
        }
      },
      setUser: (user: WebUser | null) =>
        set({ user: user, isLoggedIn: !!user }),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useAuthStore;
