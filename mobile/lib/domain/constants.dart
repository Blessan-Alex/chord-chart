/// Max songs shown on Home when not browsing all (search/filter mode).
const int libraryBrowseCap = 100;

/// Songs per page on Home library browse (client-side slice — no extra reads).
const int homeLibraryPageSize = 10;

const int songIndexChunkSize = 2000;

const List<String> songIndexChunkIds = [
  'chunk0',
  'chunk1',
  'chunk2',
  'chunk3',
  'chunk4',
];

const int songIndexCapacity = 10000;

const int songIndexSearchTextMax = 512;

const int songIndexListenerDebounceMs = 400;

const int searchSuggestionsMax = 6;

const String recentSongsStorageKey = 'lf-recent-songs';

const int recentSongsMax = 10;
