import 'package:flutter_test/flutter_test.dart';
import 'package:lf_chords/domain/group.dart';

void main() {
  test('normalizeGroupInviteCode trims and uppercases', () {
    expect(normalizeGroupInviteCode('  abcd2345  '), 'ABCD2345');
  });
}
