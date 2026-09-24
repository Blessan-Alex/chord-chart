import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:lf_chords/features/song/widgets/chord_chart_viewport.dart';

void main() {
  testWidgets('renders chart child', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: ChordChartViewport(
            scale: 1,
            showIndicator: false,
            onPinchCommit: (_) {},
            onDoubleTap: () {},
            child: const Text('chart'),
          ),
        ),
      ),
    );
    expect(find.text('chart'), findsOneWidget);
  });

  testWidgets('pinch commit fires after two-finger scale gesture', (tester) async {
    double? committed;
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SizedBox(
            width: 400,
            height: 400,
            child: ChordChartViewport(
              scale: 1,
              showIndicator: false,
              onPinchCommit: (next) => committed = next,
              onDoubleTap: () {},
              child: const Center(child: Text('chart')),
            ),
          ),
        ),
      ),
    );

    final center = tester.getCenter(find.text('chart'));
    final finger1 = await tester.startGesture(center + const Offset(-50, 0));
    final finger2 = await tester.startGesture(center + const Offset(50, 0));
    await tester.pump();
    await finger1.moveTo(center + const Offset(-80, 0));
    await finger2.moveTo(center + const Offset(80, 0));
    await tester.pump();
    await finger1.up();
    await finger2.up();
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));

    expect(committed, isNotNull);
    expect(committed! >= 0.65 && committed! <= 2, isTrue);
  });
}
