"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { AppLogo } from "@/components/AppLogo";
import { DemoAccounts } from "@/components/DemoAccounts";
import { LoginForm } from "@/components/LoginForm";
import { getFirebaseAuth, isFirebaseEnabled } from "@/lib/firebase";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  getSafeRedirectPath,
  resolvePostAuthDestination,
  resolvePostAuthDestinationForUser,
} from "@/lib/safeRedirect";

const showDemoAccounts = process.env.NEXT_PUBLIC_DEMO_LOGIN === "true";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = getSafeRedirectPath(searchParams.get("next"));
  const { user, profile, loading, profileResolved, isAdmin, signIn, signInWithGoogle, authError, clearAuthError } =
    useAuth();
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
        <div className="w-full max-w-sm space-y-4 text-center">
          <AppLogo showTagline />
          <p className="text-sm text-lf-text-secondary">
            Firebase is not configured.
          </p>
          <Link href="/" className="text-sm text-lf-brand hover:underline">
            Browse songs
          </Link>
        </div>
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

  const handleSignIn = async (email: string, password: string) => {
    await signIn(email, password);
    await navigateAfterAuth();
  };

  const handleGoogleSignIn = async () => {
    await signInWithGoogle();
    if (getFirebaseAuth().currentUser) {
      await navigateAfterAuth();
    }
  };

  const signupHref = nextPath
    ? `/signup?next=${encodeURIComponent(nextPath)}`
    : "/signup";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-lf-bg-page px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="rounded-[var(--lf-radius-lg)] border border-lf-border bg-lf-bg-elevated p-6 shadow-sm">
          <div className="mb-6 flex justify-center">
            <AppLogo size="lg" />
          </div>

          {nextPath && (
            <p className="mb-4 text-center text-sm text-lf-text-secondary">
              Sign in to continue.
            </p>
          )}

          {redirectError && (
            <p className="mb-4 text-sm text-lf-danger" role="alert">
              {redirectError}
            </p>
          )}

          <LoginForm
            onSubmit={handleSignIn}
            onGoogleSignIn={handleGoogleSignIn}
            loading={loading}
            signupHref={signupHref}
          />

          {showDemoAccounts && (
            <div className="mt-5 border-t border-lf-border pt-5">
              <DemoAccounts
                onSelect={(email, password) => {
                  void handleSignIn(email, password);
                }}
              />
            </div>
          )}
        </div>

        <p className="mt-5 text-center text-sm">
          <Link href="/" className="text-lf-brand hover:underline">
            Browse without signing in
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-lf-bg-page p-4">
          <p className="text-sm text-lf-text-secondary">Loading…</p>
        </main>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
