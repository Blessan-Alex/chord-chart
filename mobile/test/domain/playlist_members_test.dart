import 'package:flutter_test/flutter_test.dart';
import 'package:lf_chords/domain/playlist_members.dart';
import 'package:lf_chords/domain/session_navigation.dart';

void main() {
  final session = PlaylistSession(
    id: 's1',
    title: 'Sunday',
    serviceType: 'sunday_morning',
    date: DateTime(2026, 1, 1),
    songCount: 3,
    status: 'draft',
    createdBy: 'owner-uid',
    ownerId: 'owner-uid',
    ownerUsername: 'blessan',
    sharedWith: ['member-a', 'member-b'],
    sharedMembers: [
      PlaylistMemberRecord(
        uid: 'member-a',
        username: 'alex',
        displayName: 'Alex',
      ),
    ],
  );

  test('playlistAccessCount', () {
    expect(playlistAccessCount(session), 3);
  });

  test('playlistAccessLabel', () {
    expect(playlistAccessLabel(1), '1 person with access');
    expect(playlistAccessLabel(3), '3 people with access');
  });

  test('buildPlaylistMemberList', () {
    final members = buildPlaylistMemberList(session);
    expect(members.map((m) => m.uid).toList(), [
      'owner-uid',
      'member-a',
      'member-b',
    ]);
  });
}
