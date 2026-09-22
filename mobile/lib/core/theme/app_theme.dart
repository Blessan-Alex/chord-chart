import 'package:flutter/material.dart';

ThemeData buildLightTheme() {
  const seed = Color(0xFF171717);
  return ThemeData(
    colorScheme: ColorScheme.fromSeed(
      seedColor: seed,
      brightness: Brightness.light,
    ),
    useMaterial3: true,
  );
}

ThemeData buildDarkTheme() {
  const seed = Color(0xFF171717);
  return ThemeData(
    colorScheme: ColorScheme.fromSeed(
      seedColor: seed,
      brightness: Brightness.dark,
    ),
    useMaterial3: true,
  );
}
