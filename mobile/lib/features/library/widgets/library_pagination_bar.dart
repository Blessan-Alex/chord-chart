import 'package:flutter/material.dart';
import 'package:lf_chords/domain/constants.dart';

class LibraryPaginationBar extends StatelessWidget {
  const LibraryPaginationBar({
    super.key,
    required this.page,
    required this.pageCount,
    required this.onPrevious,
    required this.onNext,
  });

  final int page;
  final int pageCount;
  final VoidCallback onPrevious;
  final VoidCallback onNext;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          TextButton(
            onPressed: page > 0 ? onPrevious : null,
            child: const Text('Previous'),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Text('Page ${page + 1} of $pageCount'),
          ),
          TextButton(
            onPressed: page < pageCount - 1 ? onNext : null,
            child: const Text('Next'),
          ),
        ],
      ),
    );
  }
}

bool showLibraryPagination({
  required bool isBrowsingAll,
  required int libraryResultsLength,
}) {
  return isBrowsingAll && libraryResultsLength > homeLibraryPageSize;
}
