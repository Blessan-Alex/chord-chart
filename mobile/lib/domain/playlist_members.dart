import 'package:lf_chords/domain/playlist_access.dart';
import 'package:lf_chords/domain/session_navigation.dart';

int playlistAccessCount(PlaylistSession session) =>
    1 + session.sharedWith.length;

String playlistAccessLabel(int count) =>
    count == 1 ? '1 person with access' : '$count people with access';

List<PlaylistMemberRecord> buildPlaylistMemberList(PlaylistSession session) {
  final ownerId = getPlaylistOwnerId(session);
  final owner = PlaylistMemberRecord(
    uid: ownerId,
    username: session.ownerUsername,
    displayName: session.ownerUsername?.trim().isNotEmpty == true
        ? session.ownerUsername!.trim()
        : 'Owner',
  );

  final byUid = <String, PlaylistMemberRecord>{ownerId: owner};

  for (final member in session.sharedMembers) {
    if (member.uid != ownerId) {
      byUid[member.uid] = member;
    }
  }

  for (final uid in session.sharedWith) {
    if (uid != ownerId && !byUid.containsKey(uid)) {
      byUid[uid] = PlaylistMemberRecord(uid: uid, displayName: 'Member');
    }
  }

  return byUid.values.toList();
}
