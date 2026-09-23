import 'package:flutter_test/flutter_test.dart';
import 'package:lf_chords/data/repositories/session_songs_repository.dart';

void main() {
  test('computeMidOrder midpoint', () {
    expect(computeMidOrder(1000, 2000), 1500);
  });

  test('computeMidOrder fractional', () {
    expect(computeMidOrder(1000, 1001), 1000.5);
  });
}
