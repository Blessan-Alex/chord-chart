"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { AppLogo } from "@/components/AppLogo";
import { SignupForm } from "@/components/SignupForm";
import { getFirebaseAuth, isFirebaseEnabled } from "@/lib/firebase";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  getSafeRedirectPath,
  resolvePostAuthDestination,
  resolvePostAuthDestinationForUser,
} from "@/lib/safeRedirect";

function SignupPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = getSafeRedirectPath(searchParams.get("next"));
  const {
    user,
    profile,
    loading,
    profileResolved,
    isAdmin,
    signUp,
    signInWithGoogle,
    checkUsernameAvailable,
    authError,
    clearAuthError,
  } = useAuth();
  const [redirectError, setRedirectError] = useState<string | null>(null);

  useEffect(() => {
    if (authError) {
      setRedirectError(authError);
      clearAuthError();
    }
  }, [authError, clearAuthError]);

  useEffect(() => {
    if (!loading && profileResolved && user) {
      router.replace(resolvePostAuthDestination(nextPath, isAdmin, profile));
    }
  }, [loading, profileResolved, user, profile, isAdmin, router, nextPath]);

  if (!isFirebaseEnabled()) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-lf-bg-page p-4">
        <p className="text-sm text-lf-text-secondary">
          Firebase is not configured.
        </p>
      </main>
    );
  }

  const navigateAfterAuth = async () => {
    const destination = await resolvePostAuthDestinationForUser(
      nextPath,
      getFirebaseAuth().currentUser,
    );
    router.replace(destination);
  };

  const handleSignUp = async (
    displayName: string,
    username: string,
    email: string,
    password: string,
  ) => {
    await signUp(email, password, displayName, username);
    await navigateAfterAuth();
  };

  const handleGoogleSignIn = async () => {
    await signInWithGoogle();
    if (getFirebaseAuth().currentUser) {
      await navigateAfterAuth();
    }
  };

  const loginHref = nextPath
    ? `/login?next=${encodeURIComponent(nextPath)}`
    : "/login";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-lf-bg-page px-4 py-10">
      <div className="flex w-full max-w-md flex-col items-center gap-8">
        <div className="text-center">
          <div className="flex justify-center">
            <AppLogo size="lg" showTagline />
          </div>
          <h1 className="mt-6 text-xl font-semibold text-lf-text-primary">
            Create your account
          </h1>
          {nextPath && (
            <p className="mt-2 text-sm text-lf-text-secondary">
              You&apos;ll return to your invite after signing up.
            </p>
          )}
        </div>

        {redirectError && (
          <p className="w-full max-w-md text-center text-sm text-lf-danger" role="alert">
            {redirectError}
          </p>
        )}

        <SignupForm
          onSubmit={handleSignUp}
          onGoogleSignIn={handleGoogleSignIn}
          onCheckUsername={checkUsernameAvailable}
          loading={loading}
          loginHref={loginHref}
        />
      </div>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-lf-bg-page p-4">
          <p className="text-sm text-lf-text-secondary">Loading…</p>
        </main>
      }
    >
      <SignupPageContent />
    </Suspense>
  );
}
