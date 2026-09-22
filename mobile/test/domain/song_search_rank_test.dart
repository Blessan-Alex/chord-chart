import 'package:lf_chords/data/models/song_index_entry.dart';
import 'package:lf_chords/domain/constants.dart';
import 'package:lf_chords/domain/library_browse.dart';
import 'package:lf_chords/domain/song_search_rank.dart';
import 'package:flutter_test/flutter_test.dart';

SongIndexEntry _entry({
  required String id,
  String title = 'Title',
  String artist = '',
  String key = 'C',
  List<String> tags = const [],
  String? searchText,
  int updatedAtMs = 0,
}) {
  return SongIndexEntry(
    id: id,
    title: title,
    artist: artist,
    key: key,
    tags: tags,
    searchText: searchText,
    updatedAtMs: updatedAtMs,
  );
}

void main() {
  group('rankSongIndexResults', () {
    final entries = [
      _entry(
        id: 'way-maker',
        title: 'Way Maker',
        artist: 'Sinach',
        key: 'E',
        tags: ['worship'],
        searchText: 'way maker sinach worship miracle worker',
      ),
      _entry(
        id: 'lyric-only',
        title: 'Another Song',
        searchText: 'the way maker lives forever',
      ),
      _entry(
        id: 'good-good-father',
        title: 'Good Good Father',
        artist: 'Chris Tomlin',
        key: 'A',
        tags: ['worship'],
        searchText: 'good good father chris tomlin',
      ),
      _entry(
        id: 'malayalam-song',
        title: 'Malayalam Song',
        key: 'G',
        tags: ['lang:malayalam'],
        searchText: 'malayalam lyrics here',
      ),
    ];

    test('ranks title matches above lyric-only matches', () {
      final results = rankSongIndexResults(entries, 'maker');
      expect(results.first.id, 'way-maker');
      expect(results.any((e) => e.id == 'lyric-only'), isTrue);
    });

    test('requires all tokens to match somewhere', () {
      final results = rankSongIndexResults(entries, 'good father');
      expect(results.map((e) => e.id).toList(), ['good-good-father']);
    });

    test('excludes entries that miss a token', () {
      final results = rankSongIndexResults(entries, 'good maker');
      expect(results, isEmpty);
    });

    test('applies key filter before scoring', () {
      final results = rankSongIndexResults(entries, 'maker', keyFilter: 'C');
      expect(results.map((e) => e.id).toList(), ['lyric-only']);
    });

    test('applies language filter before scoring', () {
      final results = rankSongIndexResults(
        entries,
        'malayalam',
        tagFilter: 'lang:malayalam',
      );
      expect(results.map((e) => e.id).toList(), ['malayalam-song']);
    });

    test('applies artist filter before scoring', () {
      final results = rankSongIndexResults(
        entries,
        '',
        artistFilter: 'Chris Tomlin',
      );
      expect(results.map((e) => e.id).toList(), ['good-good-father']);
    });

    test('sorts by updatedAtMs descending when query is empty', () {
      final dated = [
        _entry(id: 'way-maker', title: 'Way Maker', updatedAtMs: 100),
        _entry(
          id: 'good-good-father',
          title: 'Good Good Father',
          updatedAtMs: 300,
        ),
        _entry(
          id: 'malayalam-song',
          title: 'Malayalam Song',
          updatedAtMs: 200,
        ),
      ];
      final results = rankSongIndexResults(dated, '');
      expect(
        results.map((e) => e.id).toList(),
        ['good-good-father', 'malayalam-song', 'way-maker'],
      );
    });

    test('finds lyric phrases in searchText', () {
      final results = rankSongIndexResults(entries, 'miracle worker');
      expect(results.first.id, 'way-maker');
    });

    test('entryMatchesQuery requires all tokens', () {
      final entry = entries.first;
      expect(entryMatchesQuery(entry, 'way maker'), isTrue);
      expect(entryMatchesQuery(entry, 'way zebra'), isFalse);
    });
  });

  group('library browse display', () {
    List<SongIndexEntry> manyEntries(int count) {
      return List.generate(
        count,
        (i) => _entry(id: 'song-$i', title: 'Song $i', updatedAtMs: i),
      );
    }

    test('browse-all page 0 returns 10 items', () {
      final all = sortLibraryEntries(manyEntries(25));
      final displayed = computeDisplayedLibraryResults(
        libraryResults: all,
        isBrowsingAll: true,
        libraryPage: 0,
      );
      expect(displayed.length, homeLibraryPageSize);
      expect(displayed.first.id, 'song-24');
    });

    test('browse-all page 2 returns next 10', () {
      final all = sortLibraryEntries(manyEntries(25));
      final displayed = computeDisplayedLibraryResults(
        libraryResults: all,
        isBrowsingAll: true,
        libraryPage: 2,
      );
      expect(displayed.length, 5);
    });

    test('filter-only with 150 matches caps at 100', () {
      final filtered = sortLibraryEntries(manyEntries(150));
      final isBrowsingAll = computeIsBrowsingAll(
        searchQuery: '',
        keyFilter: 'C',
        languageFilter: '',
        artistFilter: '',
      );
      expect(isBrowsingAll, isFalse);
      final displayed = computeDisplayedLibraryResults(
        libraryResults: filtered,
        isBrowsingAll: isBrowsingAll,
        libraryPage: 0,
      );
      expect(displayed.length, libraryBrowseCap);
      expect(
        computeLibraryCapped(
          isBrowsingAll: isBrowsingAll,
          libraryResultsLength: filtered.length,
        ),
        isTrue,
      );
    });
  });
}
