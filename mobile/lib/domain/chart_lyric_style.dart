import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lf_chords/domain/language_tags.dart';

/// Lyric face for chart lines — matches web CSS font stack by language tag.
TextStyle chartLyricTextStyle({
  required double fontSize,
  List<String> tags = const [],
}) {
  switch (getLanguageTag(tags)) {
    case 'lang:malayalam':
      return GoogleFonts.notoSansMalayalam(
        fontSize: fontSize,
        height: 1.4,
      );
    case 'lang:hindi':
    case 'lang:marathi':
      return GoogleFonts.notoSansDevanagari(
        fontSize: fontSize,
        height: 1.4,
      );
    default:
      return TextStyle(
        fontFamily: 'monospace',
        fontSize: fontSize,
        height: 1.4,
      );
  }
}

/// Wait for async Google Font loads before measuring lyric chord anchors.
Future<void> ensureChartLyricFontsLoaded(List<String> tags) async {
  switch (getLanguageTag(tags)) {
    case 'lang:malayalam':
      await GoogleFonts.pendingFonts(
        [GoogleFonts.notoSansMalayalam(fontSize: 14)],
      );
    case 'lang:hindi':
    case 'lang:marathi':
      await GoogleFonts.pendingFonts(
        [GoogleFonts.notoSansDevanagari(fontSize: 14)],
      );
    default:
      return;
  }
}
