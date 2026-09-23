import 'package:flutter_test/flutter_test.dart';
import 'package:lf_chords/domain/playlist_invite_token.dart';
import 'package:lf_chords/domain/share_playlist.dart';

void main() {
  test('playlist invite path and url', () {
    expect(playlistInvitePath('abc123xyz'), '/join/p/abc123xyz');
    expect(
      playlistInviteUrl('tok', origin: 'https://lfchords.vercel.app'),
      'https://lfchords.vercel.app/join/p/tok',
    );
  });

  test('playlist share message', () {
    expect(
      playlistShareMessage('Sunday Set', 'https://lfchords.vercel.app/join/p/tok'),
      'Check out "Sunday Set" from the LF Chords app '
      'https://lfchords.vercel.app/join/p/tok',
    );
  });

  test('generate token length', () {
    expect(generatePlaylistInviteToken().length, playlistInviteTokenLength);
  });

  test('normalize invite token', () {
    expect(normalizeInviteToken('  abc  '), 'abc');
  });
}
