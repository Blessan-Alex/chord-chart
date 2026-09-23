import 'package:flutter_test/flutter_test.dart';
import 'package:lf_chords/domain/group.dart';
import 'package:lf_chords/domain/playlist_access.dart';
import 'package:lf_chords/domain/session_navigation.dart';

PlaylistSession _session({
  String status = 'draft',
  List<String> sharedWith = const [],
  String ownerId = 'owner',
  String? groupId,
}) {
  return PlaylistSession(
    id: 's1',
    title: 'Test',
    serviceType: 'sunday_morning',
    date: DateTime(2026, 1, 1),
    songCount: 0,
    status: status,
    createdBy: ownerId,
    ownerId: ownerId,
    sharedWith: sharedWith,
    groupId: groupId,
  );
}

void main() {
  test('canViewPlaylist published', () {
    expect(canViewPlaylist(_session(status: 'published'), 'any'), isTrue);
  });

  test('canViewPlaylist owner', () {
    expect(canViewPlaylist(_session(), 'owner'), isTrue);
  });

  test('canViewPlaylist shared member', () {
    expect(
      canViewPlaylist(_session(sharedWith: ['member']), 'member'),
      isTrue,
    );
  });

  test('canViewPlaylist denies stranger on draft', () {
    expect(canViewPlaylist(_session(), 'stranger'), isFalse);
  });

  test('canViewPlaylist group member on draft', () {
    expect(
      canViewPlaylist(
        _session(groupId: 'g1'),
        'member',
        memberGroupIds: {'g1'},
      ),
      isTrue,
    );
  });

  test('canDeletePlaylist group owner', () {
    const group = Group(
      id: 'g1',
      name: 'Band',
      ownerId: 'leader',
      memberIds: ['leader', 'member'],
      members: [],
      inviteCode: 'ABCD2345',
      playlistCount: 1,
    );
    expect(
      canDeletePlaylist(
        _session(groupId: 'g1', ownerId: 'member'),
        'leader',
        group: group,
      ),
      isTrue,
    );
  });
}
