import 'package:flutter_test/flutter_test.dart';
import 'package:lf_chords/domain/session_navigation.dart';

void main() {
  final songs = [
    SessionSongEntry(
      id: 'a',
      songId: 'song-1',
      songTitle: 'Song One',
      order: 0,
      keyOverride: 'G',
    ),
    SessionSongEntry(
      id: 'b',
      songId: 'song-2',
      songTitle: 'Song Two',
      order: 1,
    ),
  ];

  test('parses playlist params', () {
    final params = parseSessionNavParams({'playlist': 's1', 'index': '1', 'key': 'G'});
    expect(params.sessionId, 's1');
    expect(params.index, 1);
  });

  test('parses legacy session params', () {
    final params = parseSessionNavParams({'session': 'legacy', 'index': '0'});
    expect(params.sessionId, 'legacy');
    expect(params.index, 0);
  });

  test('canonicalPlaylistQuery rewrites session to playlist', () {
    expect(
      canonicalPlaylistQuery({'session': 's1', 'index': '2'}),
      {'index': '2', 'playlist': 's1'},
    );
    expect(canonicalPlaylistQuery({'playlist': 's1'}), isNull);
  });

  test('SessionNavParams value equality', () {
    const a = SessionNavParams(sessionId: 's1', index: 2);
    const b = SessionNavParams(sessionId: 's1', index: 2);
    const c = SessionNavParams(sessionId: 's1', index: 3);
    expect(a, b);
    expect(a == c, isFalse);
    expect(a.hashCode, b.hashCode);
  });

  test('builds song path with playlist context', () {
    expect(
      sessionSongPath('s1', songs[0], 0),
      '/song/song-1?playlist=s1&index=0&key=G',
    );
  });

  test('builds adjacent paths', () {
    expect(
      buildAdjacentSongPath('s1', songs, 1, -1),
      '/song/song-1?playlist=s1&index=0&key=G',
    );
    expect(buildAdjacentSongPath('s1', songs, 0, -1), isNull);
  });
}
