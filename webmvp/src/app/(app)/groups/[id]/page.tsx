"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { MemberPills } from "@/components/MemberPills";
import { PlaylistCard } from "@/components/PlaylistCard";
import { SignInRequired } from "@/components/SignInRequired";
import {
  getGroup,
  incrementGroupPlaylistCount,
  inviteGroupMemberByUsername,
  isGroupMember,
  isGroupOwner,
} from "@/lib/firestore/groups";
import { createSession, listPlaylistsForGroup } from "@/lib/firestore/sessions";
import { getUserProfile } from "@/lib/firestore/users";
import { useAuth } from "@/lib/hooks/useAuth";
import type { Group, Session } from "@/lib/types";

export default function GroupDetailPage() {
  const params = useParams();
  const groupId = typeof params.id === "string" ? params.id : "";
  const { user } = useAuth();

  const [group, setGroup] = useState<Group | null>(null);
  const [playlists, setPlaylists] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [inviteUsername, setInviteUsername] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [nextGroup, nextPlaylists] = await Promise.all([
      getGroup(groupId),
      listPlaylistsForGroup(groupId),
    ]);
    setGroup(nextGroup);
    setPlaylists(nextPlaylists);
  }, [groupId]);

  useEffect(() => {
    if (!user || !groupId) {
      return;
    }

    let cancelled = false;

    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const [nextGroup, nextPlaylists] = await Promise.all([
          getGroup(groupId),
          listPlaylistsForGroup(groupId),
        ]);
        if (!cancelled) {
          setGroup(nextGroup);
          setPlaylists(nextPlaylists);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load group.");
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
  }, [user, groupId]);

  const isOwner = Boolean(user && group && isGroupOwner(group, user.uid));
  const canView = Boolean(user && group && isGroupMember(group, user.uid));

  const handleCopyInvite = async () => {
    if (!group) {
      return;
    }
    try {
      await navigator.clipboard.writeText(group.inviteCode);
      setActionMessage("Invite code copied");
    } catch {
      setActionMessage(`Invite code: ${group.inviteCode}`);
    }
  };

  const handleInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!group || !user) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await inviteGroupMemberByUsername(
        group,
        inviteUsername,
        user.uid,
      );
      setGroup(updated);
      setInviteUsername("");
      setActionMessage(`Invited @${inviteUsername.trim().toLowerCase()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not invite member.");
    } finally {
      setBusy(false);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!group || !user) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const profile = await getUserProfile(user.uid);
      await createSession(
        {
          title: `${group.name} set list`,
          serviceType: "sunday_morning",
          date: new Date(),
          status: "draft",
          groupId: group.id,
        },
        user.uid,
        profile?.username,
      );
      await incrementGroupPlaylistCount(group.id);
      await refresh();
      setActionMessage("Playlist created");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create playlist.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SignInRequired>
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-8">
        <div>
          <Link
            href="/groups"
            className="text-sm text-lf-text-secondary hover:text-lf-text-primary"
          >
            ← Groups
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-lf-text-primary sm:text-3xl">
            {group?.name ?? "Group"}
          </h1>
          {group && (
            <p className="mt-1 text-sm text-lf-text-secondary">
              {group.memberIds.length}{" "}
              {group.memberIds.length === 1 ? "member" : "members"} ·{" "}
              {group.playlistCount}{" "}
              {group.playlistCount === 1 ? "playlist" : "playlists"}
            </p>
          )}
        </div>

        {actionMessage && (
          <p className="text-sm text-lf-brand" role="status">
            {actionMessage}
          </p>
        )}
        {error && <p className="text-sm text-lf-danger">{error}</p>}

        {loading ? (
          <p className="text-lf-text-tertiary">Loading…</p>
        ) : !group ? (
          <p className="text-sm text-lf-text-secondary">Group not found.</p>
        ) : !canView ? (
          <p className="text-sm text-lf-text-secondary">
            You do not have access to this group.
          </p>
        ) : (
          <>
            <section className="rounded-[var(--lf-radius-lg)] border border-lf-border bg-lf-bg-elevated p-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-lf-text-tertiary">
                Members
              </h2>
              <div className="mt-3">
                <MemberPills members={group.members} maxVisible={8} />
              </div>
            </section>

            <section className="rounded-[var(--lf-radius-lg)] border border-lf-border bg-lf-bg-elevated p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-lf-text-tertiary">
                    Invite code
                  </h2>
                  <p className="mt-2 font-mono text-lg tracking-widest text-lf-text-primary">
                    {group.inviteCode}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void handleCopyInvite();
                  }}
                  className="min-h-11 self-start rounded-[var(--lf-radius-md)] border border-lf-border px-4 text-sm font-semibold text-lf-text-primary hover:bg-lf-bg-muted"
                >
                  Copy code
                </button>
              </div>
            </section>

            {isOwner && (
              <section className="rounded-[var(--lf-radius-lg)] border border-lf-border bg-lf-bg-elevated p-4">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-lf-text-tertiary">
                  Invite by username
                </h2>
                <form
                  className="mt-3 flex flex-col gap-3 sm:flex-row"
                  onSubmit={(event) => {
                    void handleInvite(event);
                  }}
                >
                  <input
                    type="text"
                    value={inviteUsername}
                    onChange={(e) => setInviteUsername(e.target.value)}
                    placeholder="@username"
                    className="min-h-11 flex-1 rounded-[var(--lf-radius-md)] border border-lf-border bg-lf-bg-muted px-3 text-lf-text-primary placeholder:text-lf-text-tertiary focus:border-lf-brand focus:outline-none focus:ring-2 focus:ring-lf-brand/20"
                  />
                  <button
                    type="submit"
                    disabled={busy || !inviteUsername.trim()}
                    className="min-h-11 rounded-[var(--lf-radius-md)] bg-lf-action-primary px-5 text-sm font-semibold text-lf-text-inverse hover:bg-lf-action-primary-hover disabled:opacity-50"
                  >
                    Invite
                  </button>
                </form>
              </section>
            )}

            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-lf-text-tertiary">
                  Group playlists
                </h2>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    void handleCreatePlaylist();
                  }}
                  className="text-sm font-semibold text-lf-brand hover:underline disabled:opacity-50"
                >
                  + New playlist
                </button>
              </div>
              {playlists.length === 0 ? (
                <div className="rounded-[var(--lf-radius-lg)] border border-dashed border-lf-border bg-lf-bg-muted px-4 py-8 text-center text-sm text-lf-text-secondary">
                  No group playlists yet.
                </div>
              ) : (
                <ul className="flex flex-col gap-3">
                  {playlists.map((session) => (
                    <PlaylistCard key={session.id} session={session} />
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </SignInRequired>
  );
}
