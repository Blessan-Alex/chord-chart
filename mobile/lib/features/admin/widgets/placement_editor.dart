import 'package:flutter/material.dart';
import 'package:lf_chords/data/models/section.dart';
import 'package:lf_chords/features/admin/widgets/interactive_placement_editor.dart';

class PlacementEditor extends StatelessWidget {
  const PlacementEditor({
    super.key,
    required this.sections,
    required this.originalKey,
    required this.onSectionsChanged,
  });

  final List<Section> sections;
  final String originalKey;
  final ValueChanged<List<Section>> onSectionsChanged;

  @override
  Widget build(BuildContext context) {
    return InteractivePlacementEditor(
      sections: sections,
      originalKey: originalKey,
      onSectionsChanged: onSectionsChanged,
    );
  }
}
