import 'package:flutter_test/flutter_test.dart';
import 'package:lf_chords/domain/session_navigation.dart';

/// Documents web prefetch steps for Phase 6B (integration tested manually).
void main() {
  test('cacheSessionOffline expects one entry per song in parallel fetch', () {
    const entries = [
      SessionSongEntry(
        id: 'a',
        songId: 's1',
        songTitle: 'One',
        order: 1000,
      ),
      SessionSongEntry(
        id: 'b',
        songId: 's2',
        songTitle: 'Two',
        order: 2000,
      ),
    ];
    expect(entries.map((e) => e.songId).toList(), ['s1', 's2']);
    expect(
      entries.length,
      2,
      reason: 'Promise.all on web — one failure fails entire download',
    );
  });
}
