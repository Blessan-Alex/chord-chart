/// Build-time configuration (`--dart-define`).
abstract final class AppConfig {
  static const joinApiBaseUrl = String.fromEnvironment(
    'JOIN_API_BASE_URL',
    defaultValue: 'https://lfchords.vercel.app',
  );

  /// Web origin for invite links (defaults to join API host).
  static String get shareWebOrigin => joinApiBaseUrl;
}
