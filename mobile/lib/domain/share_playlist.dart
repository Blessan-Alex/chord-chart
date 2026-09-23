import 'package:lf_chords/core/config/app_config.dart';

String playlistInvitePath(String token) =>
    '/join/p/${Uri.encodeComponent(token)}';

String playlistInviteUrl(String token, {String? origin}) {
  final base = origin ?? AppConfig.shareWebOrigin;
  return '$base${playlistInvitePath(token)}';
}

String playlistShareMessage(String title, String url) =>
    'Check out "$title" from the LF Chords app $url';

String? playlistShareResultMessage(String result) {
  switch (result) {
    case 'shared':
      return 'Invite link shared.';
    case 'copied':
      return 'Message copied — paste in WhatsApp or Messages.';
    case 'cancelled':
      return null;
    case 'failed':
      return 'Could not share or copy the link.';
    default:
      return null;
  }
}
