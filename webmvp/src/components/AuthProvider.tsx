"use client";

import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  getFirebaseAuth,
  initAppCheck,
  isFirebaseEnabled,
} from "@/lib/firebase";

export type AuthContextValue = {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<void>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

async function ensureUserProfile(user: User): Promise<void> {
  const { getDb } = await import("@/lib/firebase");
  const userRef = doc(getDb(), "users", user.uid);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    return;
  }

  await setDoc(userRef, {
    email: user.email ?? "",
    displayName:
      user.displayName?.trim() ||
      user.email?.split("@")[0] ||
      "Musician",
    role: "musician",
    createdAt: serverTimestamp(),
  });
}

async function readIsAdmin(user: User): Promise<boolean> {
  const token = await user.getIdTokenResult();
  return token.claims.admin === true;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isFirebaseEnabled());
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!isFirebaseEnabled()) {
      return;
    }

    initAppCheck();
    const auth = getFirebaseAuth();

    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);

      if (nextUser) {
        try {
          await ensureUserProfile(nextUser);
          setIsAdmin(await readIsAdmin(nextUser));
        } catch {
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!isFirebaseEnabled()) {
      throw new Error("Firebase is not configured");
    }
    await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, displayName: string) => {
      if (!isFirebaseEnabled()) {
        throw new Error("Firebase is not configured");
      }

      const auth = getFirebaseAuth();
      const credential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );

      if (displayName.trim()) {
        await updateProfile(credential.user, {
          displayName: displayName.trim(),
        });
      }
    },
    [],
  );

  const signOut = useCallback(async () => {
    if (!isFirebaseEnabled()) {
      return;
    }
    await firebaseSignOut(getFirebaseAuth());
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAdmin,
      signIn,
      signUp,
      signOut,
    }),
    [user, loading, isAdmin, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
