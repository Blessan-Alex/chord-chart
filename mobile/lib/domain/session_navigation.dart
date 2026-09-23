import 'package:cloud_firestore/cloud_firestore.dart' show Timestamp;

class SessionSongEntry {
  const SessionSongEntry({
    required this.id,
    required this.songId,
    required this.songTitle,
    required this.order,
    this.keyOverride,
  });

  final String id;
  final String songId;
  final String songTitle;
  final double order;
  final String? keyOverride;

  factory SessionSongEntry.fromMap(String id, Map<String, dynamic> data) {
    return SessionSongEntry(
      id: id,
      songId: data['songId'] as String? ?? '',
      songTitle: data['songTitle'] as String? ?? '',
      order: (data['order'] as num?)?.toDouble() ?? 0,
      keyOverride: data['keyOverride'] as String?,
    );
  }
}

class PlaylistMemberRecord {
  const PlaylistMemberRecord({
    required this.uid,
    this.username,
    required this.displayName,
  });

  final String uid;
  final String? username;
  final String displayName;

  factory PlaylistMemberRecord.fromMap(Map<String, dynamic> data) {
    return PlaylistMemberRecord(
      uid: data['uid'] as String? ?? '',
      username: data['username'] as String?,
      displayName: data['displayName'] as String? ?? 'Member',
    );
  }
}

class PlaylistSession {
  const PlaylistSession({
    required this.id,
    required this.title,
    required this.serviceType,
    required this.date,
    required this.songCount,
    required this.status,
    required this.createdBy,
    this.ownerId,
    this.ownerUsername,
    this.sharedWith = const [],
    this.sharedMembers = const [],
    this.shareToken,
    this.groupId,
  });

  final String id;
  final String title;
  final String serviceType;
  final DateTime date;
  final int songCount;
  final String status;
  final String createdBy;
  final String? ownerId;
  final String? ownerUsername;
  final List<String> sharedWith;
  final List<PlaylistMemberRecord> sharedMembers;
  final String? shareToken;
  final String? groupId;

  factory PlaylistSession.fromMap(String id, Map<String, dynamic> data) {
    final ts = data['date'];
    DateTime date;
    if (ts is Timestamp) {
      date = ts.toDate();
    } else {
      date = DateTime.now();
    }

    final sharedRaw = data['sharedWith'];
    final membersRaw = data['sharedMembers'];

    return PlaylistSession(
      id: id,
      title: data['title'] as String? ?? '',
      serviceType: data['serviceType'] as String? ?? 'sunday_morning',
      date: date,
      songCount: (data['songCount'] as num?)?.toInt() ?? 0,
      status: data['status'] as String? ?? 'draft',
      createdBy: data['createdBy'] as String? ?? '',
      ownerId: data['ownerId'] as String?,
      ownerUsername: _nullableNonEmptyString(data['ownerUsername']),
      sharedWith: sharedRaw is List
          ? sharedRaw.map((e) => e.toString()).toList()
          : const [],
      sharedMembers: membersRaw is List
          ? membersRaw
              .whereType<Map>()
              .map(
                (m) => PlaylistMemberRecord.fromMap(
                  Map<String, dynamic>.from(m),
                ),
              )
              .toList()
          : const [],
      shareToken: data['shareToken'] as String?,
      groupId: data['groupId'] as String?,
    );
  }

  PlaylistSession withShareToken(String token) {
    return PlaylistSession(
      id: id,
      title: title,
      serviceType: serviceType,
      date: date,
      songCount: songCount,
      status: status,
      createdBy: createdBy,
      ownerId: ownerId,
      ownerUsername: ownerUsername,
      sharedWith: sharedWith,
      sharedMembers: sharedMembers,
      shareToken: token,
      groupId: groupId,
    );
  }
}

const String playlistQueryParam = 'playlist';
const String legacySessionQueryParam = 'session';

class SessionNavParams {
  const SessionNavParams({this.sessionId, this.index});

  final String? sessionId;
  final int? index;

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        other is SessionNavParams &&
            sessionId == other.sessionId &&
            index == other.index;
  }

  @override
  int get hashCode => Object.hash(sessionId, index);
}

SessionNavParams parseSessionNavParams(Map<String, String> query) {
  final sessionId =
      query[playlistQueryParam] ?? query[legacySessionQueryParam];
  final indexRaw = query['index'];
  if (sessionId == null || indexRaw == null) {
    return SessionNavParams(sessionId: sessionId, index: null);
  }
  final index = int.tryParse(indexRaw);
  if (index == null || index < 0) {
    return SessionNavParams(sessionId: sessionId, index: null);
  }
  return SessionNavParams(sessionId: sessionId, index: index);
}

String sessionSongPath(
  String sessionId,
  SessionSongEntry entry,
  int index,
) {
  final params = <String, String>{
    playlistQueryParam: sessionId,
    'index': index.toString(),
  };
  if (entry.keyOverride != null && entry.keyOverride!.isNotEmpty) {
    params['key'] = entry.keyOverride!;
  }
  final query = params.entries
      .map((e) => '${Uri.encodeComponent(e.key)}=${Uri.encodeComponent(e.value)}')
      .join('&');
  return '/song/${Uri.encodeComponent(entry.songId)}?$query';
}

String? buildAdjacentSongPath(
  String sessionId,
  List<SessionSongEntry> songs,
  int currentIndex,
  int direction,
) {
  final nextIndex = currentIndex + direction;
  if (nextIndex < 0 || nextIndex >= songs.length) {
    return null;
  }
  return sessionSongPath(sessionId, songs[nextIndex], nextIndex);
}

String? startSetPath(String sessionId, List<SessionSongEntry> songs) {
  if (songs.isEmpty) {
    return null;
  }
  return sessionSongPath(sessionId, songs.first, 0);
}

Map<String, String>? canonicalPlaylistQuery(Map<String, String> query) {
  final legacy = query[legacySessionQueryParam];
  if (legacy == null || query.containsKey(playlistQueryParam)) {
    return null;
  }
  final next = Map<String, String>.from(query);
  next.remove(legacySessionQueryParam);
  next[playlistQueryParam] = legacy;
  return next;
}

String songSharePath(String songId) => '/song/${Uri.encodeComponent(songId)}';

String songShareMessage(String title, String url) =>
    'Check out "$title" from the LF Chords app $url';

String? _nullableNonEmptyString(Object? value) {
  if (value is! String) {
    return null;
  }
  final trimmed = value.trim();
  return trimmed.isEmpty ? null : trimmed;
}
