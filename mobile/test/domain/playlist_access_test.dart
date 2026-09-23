import 'package:flutter_test/flutter_test.dart';
import 'package:lf_chords/domain/playlist_access.dart';
import 'package:lf_chords/domain/session_navigation.dart';

PlaylistSession _session({
  String status = 'draft',
  List<String> sharedWith = const [],
  String ownerId = 'owner',
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
}
