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
        <div className="w-full max-w-md space-y-4">
          <AppLogo showTagline />
          <p className="text-sm text-lf-text-secondary">
            Firebase is not configured. Copy <code>.env.example</code> to{" "}
            <code>.env.local</code> and add your project keys.
          </p>
          <Link href="/" className="text-sm text-lf-brand hover:underline">
            ← Home
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
    <main className="flex min-h-screen flex-col items-center justify-center bg-lf-bg-page px-4 py-10">
      <div className="flex w-full max-w-md flex-col items-center gap-8">
        <div className="text-center">
          <div className="flex justify-center">
            <AppLogo size="lg" showTagline />
          </div>
        </div>

        <LoginForm onSubmit={handleSignIn} loading={loading} />

        {showDemoAccounts && (
          <DemoAccounts
            onSelect={(email, password) => {
              void handleSignIn(email, password);
            }}
          />
        )}
      </div>
    </main>
  );
}
