import 'dart:math';

const _tokenAlphabet =
    'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
const int playlistInviteTokenLength = 16;
const int minInviteTokenLength = 12;

final _random = Random.secure();

String generatePlaylistInviteToken() {
  final buffer = StringBuffer();
  for (var i = 0; i < playlistInviteTokenLength; i++) {
    buffer.write(_tokenAlphabet[_random.nextInt(_tokenAlphabet.length)]);
  }
  return buffer.toString();
}

String normalizeInviteToken(String raw) => raw.trim();
