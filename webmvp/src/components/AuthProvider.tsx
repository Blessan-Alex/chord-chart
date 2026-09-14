"use client";

import {
  createUserWithEmailAndPassword,
  deleteUser,
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
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import {
  getFirebaseAuth,
  initAppCheck,
  isFirebaseEnabled,
} from "@/lib/firebase";
import {
  claimUsername,
  createUserProfile,
  getUserProfile,
  isUsernameAvailable,
  touchLastLogin,
  updateUserDisplayName,
} from "@/lib/firestore/users";
import type { UserProfile } from "@/lib/types";
import { validateUsername } from "@/lib/validation";

export type AuthContextValue = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    displayName: string,
    username: string,
  ) => Promise<void>;
  signOut: () => Promise<void>;
  updateDisplayName: (displayName: string) => Promise<void>;
  claimUsername: (username: string) => Promise<void>;
  checkUsernameAvailable: (username: string) => Promise<boolean>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

async function ensureLegacyUserProfile(user: User): Promise<void> {
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
    lastLoginAt: serverTimestamp(),
  });
}

async function readIsAdmin(user: User): Promise<boolean> {
  const token = await user.getIdTokenResult();
  return token.claims.admin === true;
}

async function loadProfile(uid: string): Promise<UserProfile | null> {
  try {
    return await getUserProfile(uid);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(isFirebaseEnabled());
  const [isAdmin, setIsAdmin] = useState(false);
  const signUpInProgressRef = useRef(false);

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
          if (!signUpInProgressRef.current) {
            await ensureLegacyUserProfile(nextUser);
          }
          await touchLastLogin(nextUser.uid);
          setProfile(await loadProfile(nextUser.uid));
          setIsAdmin(await readIsAdmin(nextUser));
        } catch {
          setProfile(null);
          setIsAdmin(false);
        }
      } else {
        setProfile(null);
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
    async (
      email: string,
      password: string,
      displayName: string,
      username: string,
    ) => {
      if (!isFirebaseEnabled()) {
        throw new Error("Firebase is not configured");
      }

      const trimmedName = displayName.trim();
      if (!trimmedName) {
        throw new Error("Display name is required");
      }

      const usernameResult = validateUsername(username);
      if (!usernameResult.ok) {
        throw new Error(usernameResult.error);
      }

      if (!(await isUsernameAvailable(usernameResult.normalized))) {
        throw new Error("That username is already taken");
      }

      signUpInProgressRef.current = true;
      const auth = getFirebaseAuth();
      let credential: Awaited<
        ReturnType<typeof createUserWithEmailAndPassword>
      > | null = null;

      try {
        credential = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );

        await updateProfile(credential.user, {
          displayName: trimmedName,
        });

        await createUserProfile({
          uid: credential.user.uid,
          email: credential.user.email ?? email,
          displayName: trimmedName,
          username: usernameResult.normalized,
        });

        setProfile(await loadProfile(credential.user.uid));
      } catch (error) {
        if (credential?.user) {
          try {
            await deleteUser(credential.user);
          } catch {
            // Best-effort cleanup if profile creation fails after auth user exists.
          }
        }
        throw error;
      } finally {
        signUpInProgressRef.current = false;
      }
    },
    [],
  );

  const signOut = useCallback(async () => {
    if (!isFirebaseEnabled()) {
      return;
    }
    await firebaseSignOut(getFirebaseAuth());
    router.replace("/login");
  }, [router]);

  const updateDisplayName = useCallback(
    async (displayName: string) => {
      if (!user) {
        throw new Error("Not signed in");
      }

      const trimmed = displayName.trim();
      if (!trimmed) {
        throw new Error("Display name is required");
      }

      await updateUserDisplayName(user.uid, trimmed);
      await updateProfile(user, { displayName: trimmed });
      setProfile(await loadProfile(user.uid));
    },
    [user],
  );

  const claimUsernameForUser = useCallback(
    async (username: string) => {
      if (!user) {
        throw new Error("Not signed in");
      }

      await claimUsername(user.uid, username);
      setProfile(await loadProfile(user.uid));
    },
    [user],
  );

  const checkUsernameAvailable = useCallback(async (username: string) => {
    const result = validateUsername(username);
    if (!result.ok) {
      return false;
    }
    return isUsernameAvailable(result.normalized);
  }, []);

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      isAdmin,
      signIn,
      signUp,
      signOut,
      updateDisplayName,
      claimUsername: claimUsernameForUser,
      checkUsernameAvailable,
    }),
    [
      user,
      profile,
      loading,
      isAdmin,
      signIn,
      signUp,
      signOut,
      updateDisplayName,
      claimUsernameForUser,
      checkUsernameAvailable,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
