import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lf_chords/data/models/song_index_entry.dart';
import 'package:lf_chords/data/repositories/recent_songs_repository.dart';
import 'package:lf_chords/data/repositories/song_index_repository.dart';
import 'package:lf_chords/domain/library_browse.dart';
import 'package:lf_chords/domain/library_artists.dart';
import 'package:lf_chords/domain/song_search_rank.dart';
import 'package:lf_chords/providers/auth_providers.dart';
import 'package:shared_preferences/shared_preferences.dart';

final sharedPreferencesProvider = Provider<SharedPreferences>((ref) {
  throw UnimplementedError('Override sharedPreferencesProvider in main()');
});

final songIndexRepositoryProvider = Provider<SongIndexRepository>((ref) {
  final repo = SongIndexRepository(ref.watch(firestoreProvider));
  ref.onDispose(repo.dispose);
  return repo;
});

final recentSongsRepositoryProvider = Provider<RecentSongsRepository>((ref) {
  return RecentSongsRepository(ref.watch(sharedPreferencesProvider));
});

class SongIndexState {
  const SongIndexState({
    this.entries = const [],
    this.loading = false,
    this.loaded = false,
    this.error,
  });

  final List<SongIndexEntry> entries;
  final bool loading;
  final bool loaded;
  final String? error;

  SongIndexState copyWith({
    List<SongIndexEntry>? entries,
    bool? loading,
    bool? loaded,
    String? error,
    bool clearError = false,
  }) {
    return SongIndexState(
      entries: entries ?? this.entries,
      loading: loading ?? this.loading,
      loaded: loaded ?? this.loaded,
      error: clearError ? null : error ?? this.error,
    );
  }
}

/// Web [HomePage] partial callback guard: ignore stale partials with fewer entries.
bool shouldApplySongIndexPartial(int partialLength, int bestCount) {
  return partialLength >= bestCount;
}

final songIndexControllerProvider =
    NotifierProvider<SongIndexController, SongIndexState>(
  SongIndexController.new,
);

class SongIndexController extends Notifier<SongIndexState> {
  void Function()? _unsubscribe;
  bool _cancelled = false;

  @override
  SongIndexState build() {
    ref.onDispose(() {
      _cancelled = true;
      _unsubscribe?.call();
    });

    final repo = ref.read(songIndexRepositoryProvider);
    final peek = repo.peekSongIndexCache();
    final initial = SongIndexState(
      entries: peek ?? const [],
      loading: peek == null,
      loaded: peek != null,
    );

    Future.microtask(_bootstrap);
    return initial;
  }

  Future<void> _bootstrap() async {
    final repo = ref.read(songIndexRepositoryProvider);
    _unsubscribe ??= repo.subscribeSongIndexUpdates((entries) {
      if (_cancelled) {
        return;
      }
      state = state.copyWith(
        entries: entries,
        loading: false,
        loaded: true,
        clearError: true,
      );
    });

    await _loadProgressive();
  }

  Future<void> retry() async {
    state = state.copyWith(loading: true, clearError: true);
    final repo = ref.read(songIndexRepositoryProvider);
    try {
      final entries = await repo.invalidateSongIndexCache();
      if (!_cancelled) {
        state = state.copyWith(
          entries: entries,
          loading: false,
          loaded: true,
          clearError: true,
        );
      }
    } catch (error) {
      if (!_cancelled) {
        state = state.copyWith(
          loading: false,
          loaded: true,
          error: error.toString(),
        );
      }
    }
  }

  Future<void> _loadProgressive() async {
    final repo = ref.read(songIndexRepositoryProvider);

    if (repo.peekSongIndexCache() == null && !state.loading) {
      state = state.copyWith(loading: true, clearError: true);
    }

    try {
      var bestCount = repo.peekSongIndexCache()?.length ?? state.entries.length;
      final entries = await repo.loadSongIndexCachedProgressive((partial) {
        if (_cancelled || !shouldApplySongIndexPartial(partial.length, bestCount)) {
          return;
        }
        bestCount = partial.length;
        state = state.copyWith(
          entries: partial,
          loading: false,
          loaded: true,
        );
      });
      if (!_cancelled) {
        state = state.copyWith(
          entries: entries,
          loading: false,
          loaded: true,
        );
      }
    } catch (error) {
      if (!_cancelled) {
        state = state.copyWith(
          loading: false,
          loaded: true,
          error: error.toString(),
        );
      }
    }
  }
}

final librarySearchQueryProvider = NotifierProvider<LibrarySearchQueryNotifier, String>(
  LibrarySearchQueryNotifier.new,
);

class LibrarySearchQueryNotifier extends Notifier<String> {
  @override
  String build() => '';

  void setQuery(String value) => state = value;
}

class LibraryFilters {
  const LibraryFilters({
    this.keyFilter = '',
    this.languageFilter = '',
    this.artistFilter = '',
  });

  final String keyFilter;
  final String languageFilter;
  final String artistFilter;

  LibraryFilters copyWith({
    String? keyFilter,
    String? languageFilter,
    String? artistFilter,
  }) {
    return LibraryFilters(
      keyFilter: keyFilter ?? this.keyFilter,
      languageFilter: languageFilter ?? this.languageFilter,
      artistFilter: artistFilter ?? this.artistFilter,
    );
  }

  bool get hasActiveFilters =>
      keyFilter.isNotEmpty ||
      languageFilter.isNotEmpty ||
      artistFilter.isNotEmpty;
}

final libraryFiltersProvider =
    NotifierProvider<LibraryFiltersNotifier, LibraryFilters>(
  LibraryFiltersNotifier.new,
);

class LibraryFiltersNotifier extends Notifier<LibraryFilters> {
  @override
  LibraryFilters build() => const LibraryFilters();

  void setKey(String value) => state = state.copyWith(keyFilter: value);
  void setLanguage(String value) =>
      state = state.copyWith(languageFilter: value);
  void setArtist(String value) => state = state.copyWith(artistFilter: value);
  void clearAll() => state = const LibraryFilters();
}

final libraryPageProvider = NotifierProvider<LibraryPageNotifier, int>(
  LibraryPageNotifier.new,
);

class LibraryPageNotifier extends Notifier<int> {
  @override
  int build() {
    ref.listen(librarySearchQueryProvider, (_, _) => state = 0);
    ref.listen(libraryFiltersProvider, (_, _) => state = 0);
    return 0;
  }

  void setPage(int page) => state = page;
  void next(int maxPage) => state = (state + 1).clamp(0, maxPage);
  void previous() => state = (state - 1).clamp(0, 999999);
}

final songIndexEntriesProvider = Provider<List<SongIndexEntry>>((ref) {
  return ref.watch(songIndexControllerProvider).entries;
});

final libraryArtistsProvider = Provider<List<String>>((ref) {
  return collectLibraryArtists(ref.watch(songIndexEntriesProvider));
});

final libraryResultsProvider = Provider<List<SongIndexEntry>>((ref) {
  final entries = ref.watch(songIndexEntriesProvider);
  final query = ref.watch(librarySearchQueryProvider);
  final filters = ref.watch(libraryFiltersProvider);

  return rankSongIndexResults(
    entries,
    query,
    keyFilter: filters.keyFilter.isEmpty ? null : filters.keyFilter,
    tagFilter: filters.languageFilter.isEmpty ? null : filters.languageFilter,
    artistFilter: filters.artistFilter.isEmpty ? null : filters.artistFilter,
  );
});

final artistFilterSyncProvider = Provider<void>((ref) {
  ref.listen(libraryArtistsProvider, (prev, next) {
    final filters = ref.read(libraryFiltersProvider);
    if (!isArtistFilterValid(filters.artistFilter, next)) {
      ref.read(libraryFiltersProvider.notifier).setArtist('');
    }
  });
});

final isBrowsingAllProvider = Provider<bool>((ref) {
  final query = ref.watch(librarySearchQueryProvider);
  final filters = ref.watch(libraryFiltersProvider);
  return computeIsBrowsingAll(
    searchQuery: query,
    keyFilter: filters.keyFilter,
    languageFilter: filters.languageFilter,
    artistFilter: filters.artistFilter,
  );
});

final libraryCappedProvider = Provider<bool>((ref) {
  final isBrowsingAll = ref.watch(isBrowsingAllProvider);
  final results = ref.watch(libraryResultsProvider);
  return computeLibraryCapped(
    isBrowsingAll: isBrowsingAll,
    libraryResultsLength: results.length,
  );
});

final displayedLibraryResultsProvider = Provider<List<SongIndexEntry>>((ref) {
  final results = ref.watch(libraryResultsProvider);
  final isBrowsingAll = ref.watch(isBrowsingAllProvider);
  final page = ref.watch(libraryPageProvider);
  return computeDisplayedLibraryResults(
    libraryResults: results,
    isBrowsingAll: isBrowsingAll,
    libraryPage: page,
  );
});

final libraryPageCountProvider = Provider<int>((ref) {
  final results = ref.watch(libraryResultsProvider);
  return computeLibraryPageCount(results.length);
});

final recentSongsProvider = Provider<List<RecentSongEntry>>((ref) {
  final repo = ref.watch(recentSongsRepositoryProvider);
  final knownIds = ref.watch(songIndexEntriesProvider).map((e) => e.id).toSet();
  return filterRecentByKnownIds(repo.getRecentSongs(), knownIds);
});

final showRecentSongsProvider = Provider<bool>((ref) {
  final recent = ref.watch(recentSongsProvider);
  return recent.isNotEmpty && ref.watch(isBrowsingAllProvider);
});
