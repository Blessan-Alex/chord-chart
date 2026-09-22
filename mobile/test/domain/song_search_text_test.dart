import 'package:flutter_test/flutter_test.dart';
import 'package:lf_chords/domain/constants.dart';
import 'package:lf_chords/domain/song_search_text.dart';

void main() {
  const sampleSections = [
    {
      'label': 'Verse 1',
      'lines': [
        {'lyrics': 'Amazing grace, how sweet the sound', 'chords': []},
        {'lyrics': 'That saved a wretch like me', 'chords': []},
      ],
    },
  ];

  group('flattenSectionsLyrics', () {
    test('returns all lyric lines in order', () {
      expect(
        flattenSectionsLyrics(sampleSections),
        [
          'Amazing grace, how sweet the sound',
          'That saved a wretch like me',
        ],
      );
    });
  });

  group('buildSongSearchText', () {
    test('includes title, artist, tags, and lyrics', () {
      final text = buildSongSearchText(
        title: 'Amazing Grace',
        artist: 'John Newton',
        tags: ['lang:english', 'worship'],
        sections: sampleSections,
      );

      expect(text, contains('amazing grace'));
      expect(text, contains('john newton'));
      expect(text, contains('lang:english'));
      expect(text, contains('sweet the sound'));
      expect(text, contains('wretch like me'));
    });

    test('normalizes whitespace and case', () {
      final text = buildSongSearchText(
        title: '  Hello   World  ',
        sections: [
          {
            'label': 'Verse',
            'lines': [
              {'lyrics': 'Line   one', 'chords': []},
            ],
          },
        ],
      );

      expect(text, 'hello world line one');
    });

    test('truncates at songIndexSearchTextMax', () {
      final longLyric = List.filled(songIndexSearchTextMax, 'word ').join();
      final text = buildSongSearchText(
        title: 'Long Song',
        sections: [
          {
            'label': 'Verse',
            'lines': [
              {'lyrics': longLyric, 'chords': []},
            ],
          },
        ],
      );

      expect(text.length, songIndexSearchTextMax);
    });
  });
}
