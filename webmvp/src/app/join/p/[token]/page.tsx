"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AppLogo } from "@/components/AppLogo";
import { joinPlaylistByInviteToken } from "@/lib/firestore/playlistInvites";
import { useAuth } from "@/lib/hooks/useAuth";
import { getSafeRedirectPath } from "@/lib/safeRedirect";

export default function JoinPlaylistPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading } = useAuth();
  const token = typeof params.token === "string" ? params.token : "";
  const joinPath = `/join/p/${encodeURIComponent(token)}`;

  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (loading || !user || !token || joining || error) {
      return;
    }

    setJoining(true);
    void joinPlaylistByInviteToken(token)
      .then((sessionId) => {
        router.replace(`/playlists/${sessionId}`);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not join playlist.");
        setJoining(false);
      });
  }, [loading, user, token, joining, error, router]);

  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-lf-bg-page p-4">
        <p className="text-sm text-lf-text-secondary">Invalid invite link.</p>
      </main>
    );
  }

  if (loading || (user && joining && !error)) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-lf-bg-page p-4">
        <AppLogo size="lg" />
        <p className="text-sm text-lf-text-secondary">Joining playlist…</p>
      </main>
    );
  }

  if (!user) {
    const loginHref = `/login?next=${encodeURIComponent(getSafeRedirectPath(joinPath) ?? joinPath)}`;
    const signupHref = `/signup?next=${encodeURIComponent(getSafeRedirectPath(joinPath) ?? joinPath)}`;

    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-lf-bg-page px-4 py-8">
        <div className="w-full max-w-sm rounded-[var(--lf-radius-lg)] border border-lf-border bg-lf-bg-elevated p-6 text-center shadow-sm">
          <AppLogo size="lg" />
          <h1 className="mt-6 text-xl font-semibold text-lf-text-primary">
            Join playlist
          </h1>
          <p className="mt-2 text-sm text-lf-text-secondary">
            Sign in to accept this invite and open the set list.
          </p>
          <Link
            href={loginHref}
            className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-[var(--lf-radius-md)] bg-lf-action-primary text-sm font-semibold text-lf-text-inverse hover:bg-lf-action-primary-hover"
          >
            Sign in to join
          </Link>
          <p className="mt-4 text-sm text-lf-text-secondary">
            New here?{" "}
            <Link href={signupHref} className="font-medium text-lf-brand hover:underline">
              Create account
            </Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-lf-bg-page p-4">
      <p className="text-sm text-lf-danger" role="alert">
        {error ?? "Could not join this playlist."}
      </p>
      <Link
        href="/playlists"
        className="text-sm font-medium text-lf-brand hover:underline"
      >
        Go to playlists
      </Link>
    </main>
  );
}
