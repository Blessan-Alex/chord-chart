import 'package:flutter_test/flutter_test.dart';
import 'package:lf_chords/domain/placement_text_selection.dart';

void main() {
  test('collapseSelectionToWord snaps narrow selections to graphemes', () {
    final result = collapseSelectionToWord('little star', 0, 4);
    expect(result.start, 0);
    expect(result.end, 4);
  });

  test('collapseSelectionToWord collapses wide selection to one word', () {
    final result = collapseSelectionToWord('little star', 0, 11);
    expect(result.start, 0);
    expect(result.end, 6);
  });
}
