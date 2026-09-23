import 'package:flutter_test/flutter_test.dart';
import 'package:lf_chords/data/mappers/firestore_song_mapper.dart';

void main() {
  test('inactive song is ready with no song', () {
    final payload = mapLiveSongPayload('id', {
      'status': 'archived',
      'title': 'T',
      'originalKey': 'C',
    });
    expect(payload.ready, isTrue);
    expect(payload.song, isNull);
  });

  test('active song includes tags', () {
    final payload = mapLiveSongPayload('id', {
      'status': 'active',
      'title': 'T',
      'originalKey': 'C',
      'sections': [],
      'tags': ['lang:malayalam'],
    });
    expect(payload.ready, isTrue);
    expect(payload.song, isNotNull);
    expect(payload.tags, ['lang:malayalam']);
  });
}
