import 'package:lf_chords/data/models/song_index_entry.dart';
import 'package:lf_chords/domain/library_artists.dart';
import 'package:flutter_test/flutter_test.dart';

SongIndexEntry _entry({required String id, String artist = ''}) {
  return SongIndexEntry(
    id: id,
    title: 'Title',
    artist: artist,
    key: 'C',
    tags: const [],
  );
}

void main() {
  group('collectLibraryArtists', () {
    test('dedupes case-insensitively and sorts', () {
      final artists = collectLibraryArtists([
        _entry(id: '1', artist: 'Sinach'),
        _entry(id: '2', artist: 'sinach'),
        _entry(id: '3', artist: 'Chris Tomlin'),
      ]);
      expect(artists, ['Chris Tomlin', 'Sinach']);
    });

    test('artistMatchesFilter is exact case-insensitive', () {
      expect(artistMatchesFilter('Chris Tomlin', 'chris tomlin'), isTrue);
      expect(artistMatchesFilter('Chris Tomlin', 'Chris'), isFalse);
    });
  });
}
