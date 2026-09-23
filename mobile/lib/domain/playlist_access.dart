import 'package:lf_chords/domain/group.dart';
import 'package:lf_chords/domain/session_navigation.dart';

String getPlaylistOwnerId(PlaylistSession session) =>
    session.ownerId ?? session.createdBy;

bool isPlaylistOwner(PlaylistSession session, String uid) =>
    getPlaylistOwnerId(session) == uid;

bool canViewPlaylist(
  PlaylistSession session,
  String uid, {
  Set<String>? memberGroupIds,
}) {
  if (session.groupId != null &&
      memberGroupIds != null &&
      memberGroupIds.contains(session.groupId)) {
    return true;
  }
  return session.status == 'published' ||
      isPlaylistOwner(session, uid) ||
      session.sharedWith.contains(uid);
}

bool canDeletePlaylist(
  PlaylistSession session,
  String uid, {
  Group? group,
}) {
  if (isPlaylistOwner(session, uid)) {
    return true;
  }
  if (session.groupId != null &&
      group != null &&
      isGroupOwner(group, uid)) {
    return true;
  }
  return false;
}
