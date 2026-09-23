import 'package:lf_chords/domain/session_navigation.dart';

String getPlaylistOwnerId(PlaylistSession session) =>
    session.ownerId ?? session.createdBy;

bool isPlaylistOwner(PlaylistSession session, String uid) =>
    getPlaylistOwnerId(session) == uid;

bool canViewPlaylist(
  PlaylistSession session,
  String uid, {
  bool isAdmin = false,
}) {
  return session.status == 'published' ||
      isPlaylistOwner(session, uid) ||
      session.sharedWith.contains(uid) ||
      isAdmin;
}
