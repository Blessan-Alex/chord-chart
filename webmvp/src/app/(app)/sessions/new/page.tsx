"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { SignInRequired } from "@/components/SignInRequired";
import { createSession } from "@/lib/firestore/sessions";
import { useAuth } from "@/lib/hooks/useAuth";

export default function NewSessionPage() {
  const router = useRouter();
  const { user, isAdmin, loading } = useAuth();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user && !isAdmin) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-4 bg-neutral-950 p-4 text-white sm:p-8">
        <h1 className="text-2xl font-semibold">Admin only</h1>
        <p className="text-neutral-400">
          Only admins can create sessions.
        </p>
        <Link href="/sessions" className="text-sm text-neutral-500 hover:underline">
          ← Sessions
        </Link>
      </main>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim()) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const session = await createSession(
        {
          title: title.trim(),
          serviceType: "sunday_morning",
          date: new Date(`${date}T12:00:00`),
        },
        user.uid,
      );
      router.push(`/sessions/${session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create session.");
      setSubmitting(false);
    }
  };

  return (
    <SignInRequired>
      <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 bg-neutral-950 p-4 text-white sm:p-8">
        <Link
          href="/sessions"
          className="text-sm text-neutral-400 hover:text-neutral-200"
        >
          ← Sessions
        </Link>

        <div>
          <h1 className="text-3xl font-bold">New session</h1>
          <p className="mt-2 text-sm text-neutral-400">
            Name your set list and pick the service date.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-neutral-300">Title</span>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Sunday Morning Worship"
              className="min-h-12 rounded-xl border border-white/10 bg-neutral-900 px-4 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-white/20"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-neutral-300">Date</span>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="min-h-12 rounded-xl border border-white/10 bg-neutral-900 px-4 text-white focus:outline-none focus:ring-2 focus:ring-white/20"
            />
          </label>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 min-h-12 rounded-full bg-white px-4 font-semibold text-black disabled:opacity-50"
          >
            {submitting ? "Creating…" : "Create session"}
          </button>
        </form>
      </main>
    </SignInRequired>
  );
}
