import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lf_chords/data/models/lyric_line.dart';
import 'package:lf_chords/data/models/section.dart';
import 'package:lf_chords/features/admin/widgets/placement_editor.dart';

void main() {
  testWidgets('PlacementEditor shows toolbar and gap targets', (tester) async {
    final sections = [
      Section(
        label: 'Verse',
        lines: [
          LyricLine(lyrics: 'Hello world', chords: const []),
        ],
      ),
    ];

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: PlacementEditor(
            sections: sections,
            originalKey: 'C',
            onSectionsChanged: (_) {},
          ),
        ),
      ),
    );

    await tester.pump();

    expect(find.text('Undo'), findsOneWidget);
    expect(find.textContaining('0 chords'), findsOneWidget);
    expect(find.text('Hello world'), findsOneWidget);
    expect(find.textContaining('Tap lyrics'), findsOneWidget);
    expect(find.text('+ Chord line below'), findsOneWidget);
  });
}
