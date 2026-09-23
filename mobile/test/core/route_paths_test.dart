import 'package:flutter_test/flutter_test.dart';
import 'package:lf_chords/core/routing/route_paths.dart';

void main() {
  test('playlistDetail encodes session id', () {
    expect(RoutePaths.playlistDetail('abc 123'), '/playlists/abc%20123');
  });
}
