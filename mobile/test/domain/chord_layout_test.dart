import 'package:flutter_test/flutter_test.dart';
import 'package:lf_chords/domain/chord_layout.dart';

void main() {
  test('resolveChordLayout stacks crowded chords', () {
    final placements = resolveChordLayout(
      const ResolveChordLayoutInput(
        starts: [0, 2],
        anchorLeft: [0, 18],
        width: [40, 36],
      ),
    );
    expect(placements.length, 2);
    expect(placements[1].tier, greaterThanOrEqualTo(0));
  });
}
