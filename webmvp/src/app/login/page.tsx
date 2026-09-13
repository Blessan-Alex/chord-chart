"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { AppLogo } from "@/components/AppLogo";
import { DemoAccounts } from "@/components/DemoAccounts";
import { LoginForm } from "@/components/LoginForm";
import { useAuth } from "@/lib/hooks/useAuth";
import { isFirebaseEnabled } from "@/lib/firebase";

const showDemoAccounts = process.env.NEXT_PUBLIC_DEMO_LOGIN === "true";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, signIn } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/");
    }
  }, [loading, user, router]);

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

  const handleSignIn = async (email: string, password: string) => {
    await signIn(email, password);
    router.replace("/");
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-lf-bg-page px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="rounded-[var(--lf-radius-lg)] border border-lf-border bg-lf-bg-elevated p-6 shadow-sm">
          <div className="mb-6 flex justify-center">
            <AppLogo size="lg" />
          </div>

          <LoginForm onSubmit={handleSignIn} loading={loading} />

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
