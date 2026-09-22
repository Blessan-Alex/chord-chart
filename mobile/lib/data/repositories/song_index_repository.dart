import 'dart:async';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:lf_chords/data/models/song_index_entry.dart';
import 'package:lf_chords/domain/constants.dart';
import 'package:lf_chords/domain/song_search_rank.dart';

List<SongIndexEntry> _dedupeIndexEntries(List<SongIndexEntry> entries) {
  final byId = <String, SongIndexEntry>{};
  for (final entry in entries) {
    if (entry.id.isEmpty) {
      continue;
    }
    byId[entry.id] = entry;
  }
  return byId.values.toList();
}

List<SongIndexEntry> _parseChunkEntries(Map<String, dynamic>? data) {
  if (data == null) {
    return const [];
  }
  final raw = data['entries'];
  if (raw is! List) {
    return const [];
  }
  return raw
      .whereType<Map>()
      .map((e) => SongIndexEntry.fromMap(Map<String, dynamic>.from(e)))
      .where((e) => e.id.isNotEmpty)
      .toList();
}

class SongIndexRepository {
  SongIndexRepository(this._firestore);

  final FirebaseFirestore _firestore;

  List<SongIndexEntry>? _cachedEntries;
  List<SongIndexEntry>? _partialEntries;
  Future<List<SongIndexEntry>>? _inflight;
  Future<List<SongIndexEntry>>? _inflightProgressive;
  int _cacheGeneration = 0;

  StreamSubscription<DocumentSnapshot<Map<String, dynamic>>>? _chunk0Sub;
  int _listenerCount = 0;
  final _indexListeners = <void Function(List<SongIndexEntry>)>{};
  Timer? _debounceTimer;
  bool _skipInitialSnapshot = true;

  List<SongIndexEntry>? peekSongIndexCache() {
    return _cachedEntries ?? _partialEntries;
  }

  List<SongIndexEntry>? peekFullSongIndexCache() => _cachedEntries;

  void clearSongIndexCache() {
    _cachedEntries = null;
    _partialEntries = null;
    _inflight = null;
    _inflightProgressive = null;
    _cacheGeneration += 1;
  }

  int _beginCacheRefresh() {
    _cacheGeneration += 1;
    _inflight = null;
    _inflightProgressive = null;
    return _cacheGeneration;
  }

  bool _isCurrentGeneration(int generation) => generation == _cacheGeneration;

  Future<DocumentSnapshot<Map<String, dynamic>>> _readChunkDoc(
    DocumentReference<Map<String, dynamic>> ref, {
    required bool preferServer,
  }) async {
    if (preferServer) {
      return ref.get(const GetOptions(source: Source.server));
    }
    try {
      return await ref.get(const GetOptions(source: Source.cache));
    } catch (_) {
      return ref.get(const GetOptions(source: Source.server));
    }
  }

  Future<List<SongIndexEntry>> loadSongIndexChunks(
    List<String> chunkIds, {
    bool preferServer = false,
  }) async {
    final snaps = await Future.wait(
      chunkIds.map((chunkId) {
        final ref = _firestore.collection('songIndex').doc(chunkId);
        return _readChunkDoc(ref, preferServer: preferServer);
      }),
    );

    return snaps
        .where((snap) => snap.exists)
        .expand((snap) => _parseChunkEntries(snap.data()))
        .toList();
  }

  Future<List<SongIndexEntry>> loadSongIndex({bool preferServer = false}) {
    return loadSongIndexChunks(songIndexChunkIds, preferServer: preferServer);
  }

  Future<List<SongIndexEntry>> loadSongIndexCached({
    bool preferServer = false,
  }) async {
    if (_cachedEntries != null && !preferServer) {
      return _cachedEntries!;
    }

    final existing = _inflight;
    if (existing != null) {
      return existing;
    }

    final loadGeneration = _cacheGeneration;
    _inflight = loadSongIndex(preferServer: preferServer).then((entries) {
      if (!_isCurrentGeneration(loadGeneration)) {
        return _cachedEntries ?? entries;
      }
      _cachedEntries = sortLibraryEntries(_dedupeIndexEntries(entries));
      _partialEntries = null;
      return _cachedEntries!;
    }).whenComplete(() {
      _inflight = null;
    });

    return _inflight!;
  }

  Future<List<SongIndexEntry>> loadSongIndexCachedProgressive(
    void Function(List<SongIndexEntry> partial)? onPartial, {
    bool preferServer = false,
  }) async {
    if (_cachedEntries != null && !preferServer) {
      onPartial?.call(_cachedEntries!);
      return _cachedEntries!;
    }

    final existing = _inflightProgressive;
    if (existing != null) {
      return existing;
    }

    final loadGeneration = _cacheGeneration;

    _inflightProgressive = () async {
      try {
        final chunk0 = await loadSongIndexChunks(
          const ['chunk0'],
          preferServer: preferServer,
        );
        if (!_isCurrentGeneration(loadGeneration)) {
          return _cachedEntries ?? chunk0;
        }
        _partialEntries = chunk0;
        onPartial?.call(chunk0);

        final remainingIds = songIndexChunkIds.sublist(1);
        final rest = await loadSongIndexChunks(
          remainingIds,
          preferServer: preferServer,
        );
        final merged = sortLibraryEntries(
          _dedupeIndexEntries([...chunk0, ...rest]),
        );
        if (!_isCurrentGeneration(loadGeneration)) {
          return _cachedEntries ?? merged;
        }
        _cachedEntries = merged;
        _partialEntries = null;
        onPartial?.call(merged);
        return merged;
      } catch (error) {
        _partialEntries = null;
        rethrow;
      }
    }().whenComplete(() {
      _inflightProgressive = null;
    });

    return _inflightProgressive!;
  }

  void _notifyIndexListeners(List<SongIndexEntry> entries) {
    for (final listener in _indexListeners) {
      listener(entries);
    }
  }

  Future<List<SongIndexEntry>> invalidateSongIndexCache() async {
    final refreshGeneration = _beginCacheRefresh();
    final entries = sortLibraryEntries(
      _dedupeIndexEntries(await loadSongIndex(preferServer: true)),
    );
    if (!_isCurrentGeneration(refreshGeneration)) {
      return _cachedEntries ?? entries;
    }
    _cachedEntries = entries;
    _partialEntries = null;
    _notifyIndexListeners(entries);
    return entries;
  }

  void dispose() {
    _debounceTimer?.cancel();
    _chunk0Sub?.cancel();
    _chunk0Sub = null;
    _indexListeners.clear();
    _listenerCount = 0;
  }

  void Function() subscribeSongIndexUpdates(
    void Function(List<SongIndexEntry> entries) onUpdate,
  ) {
    _indexListeners.add(onUpdate);
    _listenerCount += 1;

    final cached = _cachedEntries;
    if (cached != null) {
      onUpdate(cached);
    }

    if (_listenerCount == 1) {
      _skipInitialSnapshot = true;
      final chunkRef = _firestore.collection('songIndex').doc('chunk0');
      _chunk0Sub = chunkRef.snapshots().listen((_) {
        if (_skipInitialSnapshot) {
          _skipInitialSnapshot = false;
          if (_cachedEntries == null) {
            unawaited(invalidateSongIndexCache());
          }
          return;
        }
        _debounceTimer?.cancel();
        _debounceTimer = Timer(
          const Duration(milliseconds: songIndexListenerDebounceMs),
          () {
            unawaited(invalidateSongIndexCache());
          },
        );
      });
    }

    return () {
      _indexListeners.remove(onUpdate);
      _listenerCount -= 1;
      if (_listenerCount == 0) {
        _debounceTimer?.cancel();
        _debounceTimer = null;
        _chunk0Sub?.cancel();
        _chunk0Sub = null;
      }
    };
  }
}
