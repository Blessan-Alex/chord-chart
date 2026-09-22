import 'package:flutter/material.dart';
import 'package:lf_chords/data/repositories/recent_songs_repository.dart';
import 'package:lf_chords/features/library/widgets/song_row.dart';
import 'package:lf_chords/data/models/song_index_entry.dart';

class RecentSongsSection extends StatelessWidget {
  const RecentSongsSection({
    super.key,
    required this.entries,
    required this.onSongTap,
  });

  final List<RecentSongEntry> entries;
  final void Function(SongIndexEntry entry) onSongTap;

  @override
  Widget build(BuildContext context) {
    if (entries.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Text(
            'Recently viewed',
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                  letterSpacing: 1.2,
                ),
          ),
        ),
        ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: Column(
            children: [
              for (final recent in entries)
                SongRow(
                  entry: SongIndexEntry(
                    id: recent.songId,
                    title: recent.title,
                    artist: recent.artist,
                    key: recent.key,
                    tags: const [],
                  ),
                  onTap: () => onSongTap(
                    SongIndexEntry(
                      id: recent.songId,
                      title: recent.title,
                      artist: recent.artist,
                      key: recent.key,
                      tags: const [],
                    ),
                  ),
                ),
            ],
          ),
        ),
        const SizedBox(height: 24),
      ],
    );
  }
}
