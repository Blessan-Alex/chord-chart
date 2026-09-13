"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useAuth } from "@/lib/hooks/useAuth";
import {
  readAppTheme,
  writeAppTheme,
  type AppTheme,
} from "@/lib/theme";
import { userDisplayName } from "@/lib/userDisplay";

export default function ProfilePage() {
  const { user, profile, isAdmin, signOut, updateDisplayName } = useAuth();
  const [theme, setThemeState] = useState<AppTheme>("light");
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    setThemeState(readAppTheme());
  }, []);

  useEffect(() => {
    if (profile?.displayName) {
      setDisplayName(profile.displayName);
    } else if (user?.displayName) {
      setDisplayName(user.displayName);
    }
  }, [profile?.displayName, user?.displayName]);

  const setTheme = (next: AppTheme) => {
    writeAppTheme(next);
    setThemeState(next);
  };

  const name = profile
    ? profile.displayName
    : user
      ? userDisplayName(user.displayName, user.email)
      : "Guest";

  const handleSaveDisplayName = async () => {
    setSaveError(null);
    setSaveMessage(null);
    setSaving(true);
    try {
      await updateDisplayName(displayName);
      setSaveMessage("Display name updated.");
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Could not update display name.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-lg p-4 sm:p-8">
      <h1 className="text-2xl font-semibold text-lf-text-primary">Profile</h1>

      {!user ? (
        <p className="mt-4 text-sm text-lf-text-secondary">
          <Link href="/login" className="font-medium text-lf-brand hover:underline">
            Sign in
          </Link>{" "}
          to manage your profile.
        </p>
      ) : (
        <>
          <div className="mt-6 space-y-4 rounded-[var(--lf-radius-lg)] border border-lf-border bg-lf-bg-elevated p-4">
            {profile?.username && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-lf-text-tertiary">
                  Username
                </p>
                <p className="mt-1 font-medium text-lf-brand">
                  @{profile.username}
                </p>
              </div>
            )}

            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-lf-text-tertiary">
                Email
              </p>
              <p className="mt-1 text-lf-text-primary">{user.email}</p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-lf-text-tertiary">
                Role
              </p>
              <p className="mt-1 text-lf-text-primary">
                {isAdmin ? "Administrator" : "Musician"}
              </p>
            </div>
          </div>

          <section className="mt-8">
            <h2 className="text-sm font-semibold text-lf-text-primary">
              Display name
            </h2>
            <p className="mt-1 text-sm text-lf-text-secondary">
              Shown in the sidebar and on shared playlists.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="min-h-11 flex-1 rounded-[var(--lf-radius-md)] border border-lf-border bg-lf-bg-elevated px-3 text-lf-text-primary focus:border-lf-brand focus:outline-none focus:ring-2 focus:ring-lf-brand/20"
              />
              <button
                type="button"
                disabled={saving || !displayName.trim()}
                onClick={() => {
                  void handleSaveDisplayName();
                }}
                className="min-h-11 rounded-[var(--lf-radius-md)] bg-lf-action-primary px-4 text-sm font-semibold text-lf-text-inverse hover:bg-lf-action-primary-hover disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
            {saveError && (
              <p className="mt-2 text-sm text-lf-danger">{saveError}</p>
            )}
            {saveMessage && (
              <p className="mt-2 text-sm text-lf-text-secondary">{saveMessage}</p>
            )}
            {!profile?.username && (
              <p className="mt-2 text-sm text-lf-text-secondary">
                Current name: {name}
              </p>
            )}
          </section>
        </>
      )}

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-lf-text-primary">Appearance</h2>
        <p className="mt-1 text-sm text-lf-text-secondary">
          Choose light or dark theme for the app shell.
        </p>
        <div className="mt-3 inline-flex rounded-[var(--lf-radius-md)] border border-lf-border bg-lf-bg-muted p-1">
          <button
            type="button"
            onClick={() => setTheme("light")}
            className={`min-h-10 rounded-[var(--lf-radius-sm)] px-4 text-sm font-medium ${
              theme === "light"
                ? "bg-lf-bg-elevated text-lf-text-primary shadow-sm"
                : "text-lf-text-secondary"
            }`}
          >
            Light
          </button>
          <button
            type="button"
            onClick={() => setTheme("dark")}
            className={`min-h-10 rounded-[var(--lf-radius-sm)] px-4 text-sm font-medium ${
              theme === "dark"
                ? "bg-lf-bg-elevated text-lf-text-primary shadow-sm"
                : "text-lf-text-secondary"
            }`}
          >
            Dark
          </button>
        </div>
      </section>

      {user && (
        <button
          type="button"
          onClick={() => {
            void signOut();
          }}
          className="mt-8 min-h-11 rounded-[var(--lf-radius-md)] border border-lf-border px-4 text-sm font-medium text-lf-text-secondary hover:bg-lf-bg-muted"
        >
          Sign out
        </button>
      )}
    </div>
  );
}
