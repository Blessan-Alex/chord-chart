import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:lf_chords/data/models/admin_models.dart';
import 'package:lf_chords/data/repositories/song_index_repository.dart';

class AdminStatsRepository {
  AdminStatsRepository(this._firestore, this._indexRepo);

  final FirebaseFirestore _firestore;
  final SongIndexRepository _indexRepo;

  Future<AdminStats> getAdminStats() async {
    final entries = await _indexRepo.loadSongIndex(preferServer: false);
    final playlistCount = await _firestore.collection('sessions').count().get();
    final groupCount = await _firestore.collection('groups').count().get();

    return AdminStats(
      songCount: entries.length,
      playlistCount: playlistCount.count ?? 0,
      groupCount: groupCount.count ?? 0,
    );
  }
}
