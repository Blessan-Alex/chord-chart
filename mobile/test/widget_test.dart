import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:lf_chords/main.dart';

void main() {
  testWidgets('LF Chords shell smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(home: HomeShell()),
    );

    expect(find.text('LF Chords'), findsOneWidget);
    expect(find.text('Musician app — setup OK'), findsOneWidget);
  });
}
