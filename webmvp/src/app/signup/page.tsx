"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { AppLogo } from "@/components/AppLogo";
import { SignupForm } from "@/components/SignupForm";
import { useAuth } from "@/lib/hooks/useAuth";
import { isFirebaseEnabled } from "@/lib/firebase";

export default function SignupPage() {
  const router = useRouter();
  const { user, loading, signUp, checkUsernameAvailable } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/");
    }
  }, [loading, user, router]);

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
    router.replace("/");
  };

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
        </div>

        <SignupForm
          onSubmit={handleSignUp}
          onCheckUsername={checkUsernameAvailable}
          loading={loading}
        />
      </div>
    </main>
  );
}
