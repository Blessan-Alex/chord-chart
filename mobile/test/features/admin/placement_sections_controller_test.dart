import 'package:flutter_test/flutter_test.dart';
import 'package:lf_chords/data/models/lyric_line.dart';
import 'package:lf_chords/data/models/section.dart';
import 'package:lf_chords/domain/chord_marks.dart';
import 'package:lf_chords/domain/chord_placement.dart';
import 'package:lf_chords/features/admin/placement/placement_sections_controller.dart';

void main() {
  Section verse(String lyrics) {
    return Section(
      label: 'Verse',
      lines: [LyricLine(lyrics: lyrics, chords: const [])],
    );
  }

  group('PlacementSectionsController', () {
    test('commit notifies parent once per committed edit', () {
      var notifyCount = 0;
      List<Section>? last;
      final controller = PlacementSectionsController(
        initialSections: [verse('little star')],
        onSectionsChanged: (sections) {
          notifyCount += 1;
          last = sections;
        },
      );

      controller.stampChord(
        0,
        0,
        const PlacementSlot.gap(index: 6),
        'C',
      );

      expect(notifyCount, 1);
      expect(getMarkStart(last!.first.lines.first.chords.single), 6);
    });

    test('undo restores prior sections', () {
      final initial = [verse('little star')];
      final controller = PlacementSectionsController(
        initialSections: initial,
        onSectionsChanged: (_) {},
      );

      controller.stampChord(
        0,
        0,
        const PlacementSlot.gap(index: 6),
        'C',
      );
      expect(controller.chordCount, 1);

      controller.undo();
      expect(controller.chordCount, 0);
      expect(controller.sections.first.lines.first.lyrics, 'little star');
    });

    test('quick place stamps without opening active placement', () {
      final controller = PlacementSectionsController(
        initialSections: [verse('little star')],
        onSectionsChanged: (_) {},
      );

      controller.stampChord(
        0,
        0,
        const PlacementSlot.gap(index: 6),
        'Am',
      );
      controller.toggleQuickChord();
      expect(controller.quickChord, 'Am');

      controller.openSlot(0, 0, const PlacementSlot.gap(index: 6));
      expect(controller.active, isNull);
      expect(controller.chordCount, 2);
    });

    test('gap preview does not notify parent until commit', () {
      var notifyCount = 0;
      final controller = PlacementSectionsController(
        initialSections: [verse('Twinkle Twinkle')],
        onSectionsChanged: (_) => notifyCount += 1,
      );

      controller.stampChord(
        0,
        0,
        const PlacementSlot.gap(index: 7),
        'C',
      );
      expect(notifyCount, 1);

      controller.openSlot(0, 0, const PlacementSlot.gap(index: 7));
      expect(notifyCount, 1);
      expect(
        controller.sections.first.lines.first.lyrics,
        'Twinkle   Twinkle',
      );

      controller.clearPlacement();
      expect(
        controller.sections.first.lines.first.lyrics,
        'Twinkle Twinkle',
      );
      expect(notifyCount, 1);
    });

    test('insertChordLine adds empty chord-only line', () {
      final controller = PlacementSectionsController(
        initialSections: [
          Section(
            label: 'Verse',
            lines: [
              LyricLine(lyrics: 'Hello', chords: const []),
            ],
          ),
        ],
        onSectionsChanged: (_) {},
      );

      controller.insertChordLine(0, 0);
      expect(controller.sections.first.lines.length, 2);
      expect(controller.sections.first.lines[1].lyrics, isEmpty);
      expect(controller.sections.first.lines[1].chords, isEmpty);
    });

    test('syncFromParent ignores echo of emitted sections', () {
      var sections = [verse('hello')];
      late PlacementSectionsController controller;
      controller = PlacementSectionsController(
        initialSections: sections,
        onSectionsChanged: (next) => sections = next,
      );

      controller.stampChord(
        0,
        0,
        const PlacementSlot.gap(index: 5),
        'G',
      );
      expect(controller.canUndo, isTrue);

      controller.syncFromParent(sections);
      expect(controller.canUndo, isTrue);
    });
  });
}
