class ChordLayoutPlacement {
  const ChordLayoutPlacement({required this.left, required this.tier});

  final double left;
  final int tier;
}

class ResolveChordLayoutInput {
  const ResolveChordLayoutInput({
    required this.starts,
    required this.anchorLeft,
    required this.width,
    this.gap = 5,
    this.maxTiers = 2,
  });

  final List<int> starts;
  final List<double> anchorLeft;
  final List<double> width;
  final double gap;
  final int maxTiers;
}

bool _overlaps(
  double left,
  double w,
  double otherLeft,
  double otherWidth,
  double gap,
) {
  return left < otherLeft + otherWidth + gap && left + w + gap > otherLeft;
}

double _rightEdge(double left, double width) => left + width;

List<ChordLayoutPlacement> resolveChordLayout(ResolveChordLayoutInput input) {
  final gap = input.gap;
  final maxTiers = input.maxTiers;
  final count = input.starts.length;
  if (count == 0) {
    return const [];
  }

  final placed = <ChordLayoutPlacement>[];
  final tierPlaced = List<List<ChordLayoutPlacement>>.generate(
    maxTiers,
    (_) => [],
  );

  for (var i = 0; i < count; i++) {
    final anchor = input.anchorLeft[i];
    final w = input.width[i];
    ChordLayoutPlacement? assigned;

    for (var tier = 0; tier < maxTiers; tier++) {
      var left = anchor;

      if (tier == 1) {
        final onTier = tierPlaced[1];
        if (onTier.isNotEmpty) {
          final lastOnTier = onTier.last;
          final lastIdx = placed.indexOf(lastOnTier);
          final lastWidth = lastIdx >= 0 ? input.width[lastIdx] : 0.0;
          left = left > _rightEdge(lastOnTier.left, lastWidth) + gap
              ? left
              : _rightEdge(lastOnTier.left, lastWidth) + gap;
        }
      }

      final collides = tierPlaced[tier].any((p) {
        final idx = placed.indexOf(p);
        final pw = idx >= 0 ? input.width[idx] : 0.0;
        return _overlaps(left, w, p.left, pw, gap);
      });

      if (!collides) {
        assigned = ChordLayoutPlacement(left: left, tier: tier);
        tierPlaced[tier].add(assigned);
        placed.add(assigned);
        break;
      }
    }

    if (assigned == null) {
      final fallback = ChordLayoutPlacement(left: anchor, tier: maxTiers - 1);
      tierPlaced[maxTiers - 1].add(fallback);
      placed.add(fallback);
    }
  }

  return placed;
}

int maxTierUsed(List<ChordLayoutPlacement> placements) {
  if (placements.isEmpty) {
    return 0;
  }
  return placements.fold(0, (max, p) => p.tier > max ? p.tier : max);
}
