import 'package:http/http.dart' as http;
import 'package:lf_chords/core/config/app_config.dart';

/// Matches web `useOnlineStatus.ts` timing.
const offlineDebounceMs = 2000;
const connectivityPollMs = 30000;
const probeTimeoutMs = 5000;

/// Web `CONNECTIVITY_PROBE_URL` on Vercel host (not a bundled asset).
String connectivityProbeUrl({String? baseUrl}) {
  final base = baseUrl ?? AppConfig.joinApiBaseUrl;
  final normalized = base.endsWith('/') ? base.substring(0, base.length - 1) : base;
  return '$normalized/connectivity.txt';
}

/// Network-only probe — must not use HTTP cache (web `cache: no-store`).
Future<bool> probeConnectivity({
  http.Client? client,
  String? probeUrl,
  Duration timeout = const Duration(milliseconds: probeTimeoutMs),
}) async {
  final uri = Uri.parse(probeUrl ?? connectivityProbeUrl());
  final httpClient = client ?? http.Client();
  final ownsClient = client == null;
  try {
    final response = await httpClient
        .get(
          uri,
          headers: const {'Cache-Control': 'no-cache'},
        )
        .timeout(timeout);
    return response.statusCode >= 200 && response.statusCode < 300;
  } catch (_) {
    return false;
  } finally {
    if (ownsClient) {
      httpClient.close();
    }
  }
}

/// Ports web `applyStatus` debounce (testable without Flutter bindings).
class DebouncedOnlineStatus {
  DebouncedOnlineStatus({
    this.debounceDuration = const Duration(milliseconds: offlineDebounceMs),
  });

  final Duration debounceDuration;
  bool online = true;
  Duration? pendingOfflineAfter;

  /// [elapsed] time since last probe when debounce timer fires.
  bool applyProbeResult(bool reachable, {Duration elapsed = Duration.zero}) {
    if (reachable) {
      pendingOfflineAfter = null;
      online = true;
      return true;
    }

    pendingOfflineAfter = debounceDuration;
    if (elapsed >= debounceDuration) {
      online = false;
      pendingOfflineAfter = null;
      return false;
    }
    return online;
  }

  /// Call when debounce interval completes after a failed probe.
  bool completeOfflineDebounce() {
    if (pendingOfflineAfter == null) {
      return online;
    }
    online = false;
    pendingOfflineAfter = null;
    return false;
  }
}
