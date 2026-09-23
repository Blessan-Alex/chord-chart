import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:lf_chords/core/connectivity/connectivity_probe.dart';

class _MockClient extends http.BaseClient {
  _MockClient(this.handler);

  final Future<http.StreamedResponse> Function(http.BaseRequest request)
      handler;

  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) =>
      handler(request);
}

void main() {
  test('connectivityProbeUrl uses JOIN_API_BASE_URL host', () {
    expect(
      connectivityProbeUrl(baseUrl: 'https://lfchords.vercel.app'),
      'https://lfchords.vercel.app/connectivity.txt',
    );
    expect(
      connectivityProbeUrl(baseUrl: 'https://example.com/'),
      'https://example.com/connectivity.txt',
    );
  });

  test('probeConnectivity returns true when response ok', () async {
    final client = _MockClient((request) async {
      expect(request.headers['Cache-Control'], 'no-cache');
      return http.StreamedResponse(
        Stream<List<int>>.value([111, 107]),
        200,
      );
    });
    expect(
      await probeConnectivity(
        client: client,
        probeUrl: 'https://test/connectivity.txt',
      ),
      isTrue,
    );
  });

  test('probeConnectivity returns false on non-ok status', () async {
    final client = _MockClient((request) async {
      return http.StreamedResponse(Stream.value([]), 503);
    });
    expect(
      await probeConnectivity(
        client: client,
        probeUrl: 'https://test/connectivity.txt',
      ),
      isFalse,
    );
  });

  test('DebouncedOnlineStatus matches web debounce intent', () {
    final gate = DebouncedOnlineStatus(
      debounceDuration: const Duration(milliseconds: 2000),
    );
    expect(gate.online, isTrue);
    expect(gate.applyProbeResult(false), isTrue);
    expect(gate.online, isTrue);
    expect(gate.completeOfflineDebounce(), isFalse);
    expect(gate.applyProbeResult(true), isTrue);
    expect(gate.online, isTrue);
  });
}
