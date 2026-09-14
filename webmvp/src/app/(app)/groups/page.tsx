"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { CreateGroupModal } from "@/components/CreateGroupModal";
import { JoinGroupModal } from "@/components/JoinGroupModal";
import { MemberPills } from "@/components/MemberPills";
import { SignInRequired } from "@/components/SignInRequired";
import {
  createGroup,
  joinGroupByInviteCode,
  listGroupsForMember,
} from "@/lib/firestore/groups";
import { getUserProfile } from "@/lib/firestore/users";
import { useAuth } from "@/lib/hooks/useAuth";
import type { Group } from "@/lib/types";

function GroupIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <path d="M16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M8 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M12 14c-3.5 0-6 1.8-6 4v1h12v-1c0-2.2-2.5-4-6-4Z" />
      <path d="M20 12c0-1.5-1.2-2.7-2.7-2.7" />
      <path d="M4 12c0-1.5 1.2-2.7 2.7-2.7" />
    </svg>
  );
}

export default function GroupsPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      return;
    }
    const next = await listGroupsForMember(user.uid);
    setGroups(next);
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    let cancelled = false;

    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const next = await listGroupsForMember(user.uid);
        if (!cancelled) {
          setGroups(next);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load groups.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleCreate = async (name: string) => {
    if (!user) {
      return;
    }
    setBusy(true);
    try {
      const profile = await getUserProfile(user.uid);
      await createGroup({ name }, user.uid, profile);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = async (inviteCode: string) => {
    if (!user) {
      return;
    }
    setBusy(true);
    try {
      const profile = await getUserProfile(user.uid);
      await joinGroupByInviteCode(inviteCode, user.uid, profile);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <SignInRequired>
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-8">
        <CreateGroupModal
          open={showCreate}
          busy={busy}
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
        />
        <JoinGroupModal
          open={showJoin}
          busy={busy}
          onClose={() => setShowJoin(false)}
          onJoin={handleJoin}
        />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-lf-text-secondary">
              Band teams and shared playlists
            </p>
          </div>

          <div className="flex items-center gap-2 self-start">
            <button
              type="button"
              onClick={() => setShowJoin(true)}
              className="min-h-11 rounded-[var(--lf-radius-md)] px-4 text-sm font-semibold text-lf-text-primary hover:bg-lf-bg-muted"
            >
              Join
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              aria-label="Create group"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-lf-action-primary text-lg font-semibold text-lf-text-inverse hover:bg-lf-action-primary-hover"
            >
              +
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-lf-danger">{error}</p>}

        {loading ? (
          <p className="text-lf-text-tertiary">Loading…</p>
        ) : groups.length === 0 ? (
          <div className="rounded-[var(--lf-radius-lg)] border border-dashed border-lf-border bg-lf-bg-muted px-4 py-10 text-center">
            <p className="font-semibold text-lf-text-primary">No groups yet</p>
            <p className="mt-2 text-sm text-lf-text-secondary">
              Create a group or join with an invite code.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {groups.map((group) => (
              <li key={group.id}>
                <Link
                  href={`/groups/${group.id}`}
                  className="flex min-h-20 items-center gap-3 rounded-[var(--lf-radius-lg)] border border-lf-border bg-lf-bg-elevated px-4 py-3 transition-colors hover:bg-lf-bg-muted"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--lf-radius-sm)] bg-lf-bg-muted text-lf-text-secondary">
                    <GroupIcon />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-lf-text-primary">
                      {group.name}
                    </p>
                    <p className="mt-0.5 text-sm text-lf-text-secondary">
                      {group.memberIds.length}{" "}
                      {group.memberIds.length === 1 ? "member" : "members"} ·{" "}
                      {group.playlistCount}{" "}
                      {group.playlistCount === 1 ? "playlist" : "playlists"}
                    </p>
                    <div className="mt-2">
                      <MemberPills members={group.members} />
                    </div>
                  </div>
                  <span className="shrink-0 text-lf-text-tertiary" aria-hidden>
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </SignInRequired>
  );
}
