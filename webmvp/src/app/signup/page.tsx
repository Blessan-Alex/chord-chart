"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

import { AppLogo } from "@/components/AppLogo";
import { SignupForm } from "@/components/SignupForm";
import { useAuth } from "@/lib/hooks/useAuth";
import { isFirebaseEnabled } from "@/lib/firebase";
import { getSafeRedirectPath } from "@/lib/safeRedirect";

function SignupPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = getSafeRedirectPath(searchParams.get("next"));
  const { user, loading, signUp, checkUsernameAvailable } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.replace(nextPath ?? "/");
    }
  }, [loading, user, router, nextPath]);

  if (!isFirebaseEnabled()) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-lf-bg-page p-4">
        <p className="text-sm text-lf-text-secondary">
          Firebase is not configured.
        </p>
      </main>
    );
  }

  const handleSignUp = async (
    displayName: string,
    username: string,
    email: string,
    password: string,
  ) => {
    await signUp(email, password, displayName, username);
    router.replace(nextPath ?? "/");
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

        <SignupForm
          onSubmit={handleSignUp}
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
