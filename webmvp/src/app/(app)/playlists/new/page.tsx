"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { SignInRequired } from "@/components/SignInRequired";
import { createSession } from "@/lib/firestore/sessions";
import { useAuth } from "@/lib/hooks/useAuth";

export default function NewPlaylistPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
        profile?.username,
      );
      router.push(`/playlists/${session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create playlist.");
      setSubmitting(false);
    }
  };

  return (
    <SignInRequired>
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-8">
        <Link
          href="/playlists"
          className="text-sm text-lf-text-secondary hover:text-lf-text-primary"
        >
          ← Playlists
        </Link>

        <div>
          <h1 className="text-2xl font-semibold text-lf-text-primary sm:text-3xl">
            New playlist
          </h1>
          <p className="mt-2 text-sm text-lf-text-secondary">
            Name your set list and pick a date.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-lf-text-primary">Title</span>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Sunday Morning Worship"
              className="min-h-12 rounded-[var(--lf-radius-md)] border border-lf-border bg-lf-bg-page px-4 text-lf-text-primary placeholder:text-lf-text-tertiary focus:border-lf-brand focus:outline-none focus:ring-2 focus:ring-lf-brand/20"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-lf-text-primary">Date</span>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="min-h-12 rounded-[var(--lf-radius-md)] border border-lf-border bg-lf-bg-page px-4 text-lf-text-primary focus:border-lf-brand focus:outline-none focus:ring-2 focus:ring-lf-brand/20"
            />
          </label>

          {error && <p className="text-sm text-lf-danger">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 min-h-12 rounded-[var(--lf-radius-md)] bg-lf-action-primary px-4 font-semibold text-lf-text-inverse hover:bg-lf-action-primary-hover disabled:opacity-50"
          >
            {submitting ? "Creating…" : "Create playlist"}
          </button>
        </form>
      </main>
    </SignInRequired>
  );
}
