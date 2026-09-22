import 'package:lf_chords/data/models/song_index_entry.dart';
import 'package:lf_chords/domain/constants.dart';

bool computeIsBrowsingAll({
  required String searchQuery,
  required String keyFilter,
  required String languageFilter,
  required String artistFilter,
}) {
  return searchQuery.trim().isEmpty &&
      keyFilter.isEmpty &&
      languageFilter.isEmpty &&
      artistFilter.isEmpty;
}

List<SongIndexEntry> computeDisplayedLibraryResults({
  required List<SongIndexEntry> libraryResults,
  required bool isBrowsingAll,
  required int libraryPage,
}) {
  if (isBrowsingAll) {
    final start = libraryPage * homeLibraryPageSize;
    final end = start + homeLibraryPageSize;
    if (start >= libraryResults.length) {
      return const [];
    }
    return libraryResults.sublist(
      start,
      end > libraryResults.length ? libraryResults.length : end,
    );
  }
  if (libraryResults.length <= libraryBrowseCap) {
    return libraryResults;
  }
  return libraryResults.sublist(0, libraryBrowseCap);
}

bool computeLibraryCapped({
  required bool isBrowsingAll,
  required int libraryResultsLength,
}) {
  return !isBrowsingAll && libraryResultsLength > libraryBrowseCap;
}

int computeLibraryPageCount(int libraryResultsLength) {
  if (libraryResultsLength <= 0) {
    return 1;
  }
  return (libraryResultsLength / homeLibraryPageSize).ceil().clamp(1, 999999);
}

String libraryCapBannerText(int totalMatches) {
  return 'Showing $libraryBrowseCap of $totalMatches songs — search or filter to narrow the list.';
}
