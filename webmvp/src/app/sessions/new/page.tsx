"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { SignInRequired } from "@/components/SignInRequired";
import { createSession } from "@/lib/firestore/sessions";
import { useAuth } from "@/lib/hooks/useAuth";
import { SERVICE_TYPE_LABELS } from "@/lib/sessionLabels";
import type { ServiceType } from "@/lib/types";

const SERVICE_TYPES: ServiceType[] = [
  "friday",
  "sunday_morning",
  "sunday_evening",
];

export default function NewSessionPage() {
  const router = useRouter();
  const { user, isAdmin, loading } = useAuth();
  const [title, setTitle] = useState("");
  const [serviceType, setServiceType] = useState<ServiceType>("sunday_morning");
  const [date, setDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user && !isAdmin) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-4 p-4 sm:p-8">
        <h1 className="text-2xl font-semibold">Admin only</h1>
        <p className="text-neutral-600 dark:text-neutral-400">
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
          serviceType,
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
      <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 p-4 sm:p-8">
        <Link
          href="/sessions"
          className="text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
        >
          ← Sessions
        </Link>

        <div>
          <h1 className="text-2xl font-semibold">New session</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Create a set list, then add songs on the next screen.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Title</span>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Sunday Morning — Sep 14"
              className="rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-950"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Service</span>
            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value as ServiceType)}
              className="rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-950"
            >
              {SERVICE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {SERVICE_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Date</span>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-950"
            />
          </label>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-black px-4 py-3 font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {submitting ? "Creating…" : "Create session"}
          </button>
        </form>
      </main>
    </SignInRequired>
  );
}
