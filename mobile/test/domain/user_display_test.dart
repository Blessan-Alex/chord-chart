import 'package:flutter_test/flutter_test.dart';
import 'package:lf_chords/domain/user_display.dart';

void main() {
  test('userInitials', () {
    expect(userInitials('Alex Rivera'), 'AR');
    expect(userInitials('Madonna'), 'MA');
  });

  test('userDisplayName', () {
    expect(userDisplayName('Alex', 'a@b.com'), 'Alex');
    expect(userDisplayName(null, 'alex@example.com'), 'alex');
    expect(userDisplayName(null, null), 'Guest');
  });
}
