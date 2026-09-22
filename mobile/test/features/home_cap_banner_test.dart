import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lf_chords/domain/constants.dart';
import 'package:lf_chords/domain/library_browse.dart';

void main() {
  test('libraryCapBannerText matches web overflow copy', () {
    expect(
      libraryCapBannerText(150),
      'Showing $libraryBrowseCap of 150 songs — search or filter to narrow the list.',
    );
  });

  testWidgets('cap banner string appears in a Text widget', (tester) async {
    const message = 'Showing 100 of 150 songs — search or filter to narrow the list.';
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: Text(message),
        ),
      ),
    );
    expect(find.text(message), findsOneWidget);
  });
}
