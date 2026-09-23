import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:lf_chords/core/config/app_config.dart';
import 'package:lf_chords/domain/playlist_invite_token.dart';

class JoinApiException implements Exception {
  JoinApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

class JoinApiClient {
  JoinApiClient({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  Uri get _joinUri =>
      Uri.parse('${AppConfig.joinApiBaseUrl}/api/playlists/join');

  Future<String> joinByInviteToken({
    required String tokenRaw,
    required String idToken,
  }) async {
    final token = normalizeInviteToken(tokenRaw);
    if (token.length < minInviteTokenLength) {
      throw JoinApiException('Invalid invite link');
    }

    final response = await _client.post(
      _joinUri,
      headers: {
        'Authorization': 'Bearer $idToken',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({'token': token}),
    );

    Map<String, dynamic>? payload;
    try {
      payload = jsonDecode(response.body) as Map<String, dynamic>?;
    } catch (_) {
      payload = null;
    }

    final sessionId = payload?['sessionId'] as String?;
    final error = payload?['error'] as String?;

    if (response.statusCode == 200 && sessionId != null) {
      return sessionId;
    }

    if (response.statusCode == 401) {
      throw JoinApiException(error ?? 'Unauthorized', statusCode: 401);
    }
    if (response.statusCode == 400) {
      throw JoinApiException(error ?? 'Invalid invite link', statusCode: 400);
    }
    if (response.statusCode == 404) {
      throw JoinApiException(
        error ?? 'This invite link is invalid or has expired',
        statusCode: 404,
      );
    }

    throw JoinApiException(
      error ?? 'Could not join playlist',
      statusCode: response.statusCode,
    );
  }
}
