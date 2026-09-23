
const _tileGradientKeys = [
  'emerald',
  'violet',
  'rose',
  'sky',
  'amber',
  'fuchsia',
];

/// Stable gradient bucket for playlist tiles (web `sessionTileGradient`).
int sessionTileGradientIndex(String sessionId) {
  var hash = 0;
  for (var i = 0; i < sessionId.length; i++) {
    hash = (hash + sessionId.codeUnitAt(i) * (i + 1)) % _tileGradientKeys.length;
  }
  return hash;
}

String formatSessionDateLong(DateTime date) {
  const weekdays = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  final w = weekdays[date.weekday - 1];
  final m = months[date.month - 1];
  return '$w, $m ${date.day}, ${date.year}';
}

String formatPlaylistDateShort(DateTime date) {
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return '${weekdays[date.weekday - 1]}, ${months[date.month - 1]} ${date.day}';
}

String sessionInitials(String title) {
  final words = title.trim().split(RegExp(r'\s+')).where((w) => w.isNotEmpty);
  final list = words.toList();
  if (list.isEmpty) {
    return '♪';
  }
  if (list.length == 1) {
    return list.first.length >= 2
        ? list.first.substring(0, 2).toUpperCase()
        : list.first.toUpperCase();
  }
  return '${list[0][0]}${list[1][0]}'.toUpperCase();
}

String songInitials(String title) {
  final word = title.trim().split(RegExp(r'\s+')).firstWhere(
        (w) => w.isNotEmpty,
        orElse: () => '',
      );
  if (word.isEmpty) {
    return '♪';
  }
  return word[0].toUpperCase();
}
