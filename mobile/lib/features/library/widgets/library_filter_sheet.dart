import 'package:flutter/material.dart';
import 'package:lf_chords/domain/keys.dart';
import 'package:lf_chords/domain/language_tags.dart';

class LibraryFilterSheet extends StatefulWidget {
  const LibraryFilterSheet({
    super.key,
    required this.keyFilter,
    required this.languageFilter,
    required this.artistFilter,
    required this.artists,
    required this.onApply,
  });

  final String keyFilter;
  final String languageFilter;
  final String artistFilter;
  final List<String> artists;
  final void Function({
    required String keyFilter,
    required String languageFilter,
    required String artistFilter,
  }) onApply;

  @override
  State<LibraryFilterSheet> createState() => _LibraryFilterSheetState();
}

class _LibraryFilterSheetState extends State<LibraryFilterSheet> {
  late String _key;
  late String _language;
  late String _artist;

  @override
  void initState() {
    super.initState();
    _key = widget.keyFilter;
    _language = widget.languageFilter;
    _artist = widget.artistFilter;
  }

  void _clear() {
    setState(() {
      _key = '';
      _language = '';
      _artist = '';
    });
  }

  void _apply() {
    widget.onApply(
      keyFilter: _key,
      languageFilter: _language,
      artistFilter: _artist,
    );
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        shrinkWrap: true,
        children: [
          Text(
                'Filters',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 16),
              Text(
                'Key',
                style: Theme.of(context).textTheme.titleSmall,
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  FilterChip(
                    label: const Text('All'),
                    selected: _key.isEmpty,
                    onSelected: (_) => setState(() => _key = ''),
                  ),
                  for (final key in allKeys)
                    FilterChip(
                      label: Text(key),
                      selected: _key == key,
                      onSelected: (_) => setState(() => _key = key),
                    ),
                ],
              ),
              const SizedBox(height: 20),
              Text(
                'Language',
                style: Theme.of(context).textTheme.titleSmall,
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  FilterChip(
                    label: const Text('All'),
                    selected: _language.isEmpty,
                    onSelected: (_) => setState(() => _language = ''),
                  ),
                  for (final tag in languageTags)
                    FilterChip(
                      label: Text(tag.label),
                      selected: _language == tag.value,
                      onSelected: (_) => setState(() => _language = tag.value),
                    ),
                ],
              ),
              const SizedBox(height: 20),
              Text(
                'Artist',
                style: Theme.of(context).textTheme.titleSmall,
              ),
              const SizedBox(height: 8),
              DropdownMenu<String>(
                initialSelection: _artist.isEmpty ? null : _artist,
                label: const Text('Artist'),
                dropdownMenuEntries: [
                  const DropdownMenuEntry(value: '', label: 'All'),
                  for (final name in widget.artists)
                    DropdownMenuEntry(value: name, label: name),
                ],
                onSelected: (value) =>
                    setState(() => _artist = value ?? ''),
              ),
              const SizedBox(height: 24),
              Row(
                children: [
                  TextButton(onPressed: _clear, child: const Text('Clear')),
                  const Spacer(),
                  FilledButton(onPressed: _apply, child: const Text('Apply')),
                ],
              ),
        ],
      ),
    );
  }
}

Future<void> showLibraryFilterSheet(
  BuildContext context, {
  required String keyFilter,
  required String languageFilter,
  required String artistFilter,
  required List<String> artists,
  required void Function({
    required String keyFilter,
    required String languageFilter,
    required String artistFilter,
  }) onApply,
}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (context) => Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.viewInsetsOf(context).bottom,
      ),
      child: LibraryFilterSheet(
        keyFilter: keyFilter,
        languageFilter: languageFilter,
        artistFilter: artistFilter,
        artists: artists,
        onApply: onApply,
      ),
    ),
  );
}
