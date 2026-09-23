import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lf_chords/core/routing/route_paths.dart';
import 'package:lf_chords/data/models/song.dart';
import 'package:lf_chords/domain/autoscroll_speed.dart';
import 'package:lf_chords/domain/chart_display.dart';
import 'package:lf_chords/domain/key_utils.dart';
import 'package:lf_chords/domain/performance_preferences.dart';
import 'package:lf_chords/domain/session_navigation.dart';
import 'package:lf_chords/domain/wrap_lyric_line.dart';
import 'package:lf_chords/features/performance/autoscroll_engine.dart';
import 'package:lf_chords/features/performance/performance_mode.dart';
import 'package:lf_chords/features/playlists/widgets/add_to_playlist_sheet.dart';
import 'package:lf_chords/features/song/song_providers.dart';
import 'package:lf_chords/features/song/widgets/autoscroll_bar.dart';
import 'package:lf_chords/features/song/widgets/chart_theme_scope.dart';
import 'package:lf_chords/features/song/widgets/chord_chart_viewport.dart';
import 'package:lf_chords/features/song/widgets/chord_line.dart';
import 'package:lf_chords/features/song/widgets/performance_bottom_bar.dart';
import 'package:lf_chords/features/song/widgets/performance_fullscreen_overlay.dart';
import 'package:lf_chords/features/song/widgets/song_control_bar.dart';
import 'package:lf_chords/features/song/widgets/song_header.dart';
import 'package:lf_chords/providers/auth_providers.dart';
import 'package:lf_chords/providers/song_index_providers.dart';
import 'package:share_plus/share_plus.dart';
import 'package:wakelock_plus/wakelock_plus.dart';

class SongScreen extends ConsumerStatefulWidget {
  const SongScreen({
    super.key,
    required this.songId,
    required this.queryParameters,
  });

  final String songId;
  final Map<String, String> queryParameters;

  @override
  ConsumerState<SongScreen> createState() => _SongScreenState();
}

class _SongScreenState extends ConsumerState<SongScreen>
    with SingleTickerProviderStateMixin, WidgetsBindingObserver {
  String _targetKey = 'C';
  SongViewMode _viewMode = SongViewMode.chords;
  String? _transposeFlash;
  double _scale = 1;
  bool _showZoomIndicator = false;
  Timer? _zoomTimer;
  String? _recordedRecentId;
  String? _initializedSongId;
  String? _keySyncSongId;
  String? _keySyncOriginalKey;
  String? _keySyncKeyParam;

  ChartTheme _chartTheme = ChartTheme.system;
  bool _fullscreenActive = false;
  late final ScrollController _scrollController;
  late final AutoscrollEngine _autoscroll;
  double? _swipeStartX;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _scrollController = ScrollController();
    _autoscroll = AutoscrollEngine(
      vsync: this,
      scrollController: _scrollController,
    );
    WidgetsBinding.instance.addPostFrameCallback((_) => _canonicalRedirect());
    _loadZoom();
    _loadChartTheme();
  }

  @override
  void didUpdateWidget(SongScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.songId != widget.songId) {
      if (_scrollController.hasClients) {
        _scrollController.jumpTo(0);
      }
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _zoomTimer?.cancel();
    _autoscroll.dispose();
    _scrollController.dispose();
    WakelockPlus.disable();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _syncWakeLockAndSystemUi();
    }
  }

  void _syncWakeLockAndSystemUi() {
    final immersive = _autoscroll.active || _fullscreenActive;
    if (_fullscreenActive) {
      SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    } else {
      SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    }
    if (immersive) {
      unawaited(WakelockPlus.enable());
    } else {
      unawaited(WakelockPlus.disable());
    }
    setState(() {});
  }

  void _canonicalRedirect() {
    final canonical = canonicalPlaylistQuery(widget.queryParameters);
    if (canonical == null) {
      return;
    }
    final query = canonical.entries
        .map((e) =>
            '${Uri.encodeComponent(e.key)}=${Uri.encodeComponent(e.value)}')
        .join('&');
    context.replace('${RoutePaths.song(widget.songId)}?$query');
  }

  Future<void> _loadZoom() async {
    final prefs = ref.read(sharedPreferencesProvider);
    final nav = parseSessionNavParams(widget.queryParameters);
    final sessionZoom = nav.sessionId != null
        ? await readSessionZoom(prefs, nav.sessionId!)
        : null;
    final initial = sessionZoom ?? await readGlobalZoom(prefs);
    if (mounted) {
      setState(() => _scale = initial);
    }
  }

  Future<void> _loadChartTheme() async {
    final prefs = ref.read(sharedPreferencesProvider);
    final theme = await readChartTheme(prefs);
    if (mounted) {
      setState(() => _chartTheme = theme);
    }
  }

  Future<void> _persistZoom() async {
    final prefs = ref.read(sharedPreferencesProvider);
    final snapped = snapChartScale(_scale);
    await writeGlobalZoom(prefs, snapped);
    final sessionId = parseSessionNavParams(widget.queryParameters).sessionId;
    if (sessionId != null) {
      await writeSessionZoom(prefs, sessionId, snapped);
    }
  }

  void _flashZoomIndicator() {
    setState(() => _showZoomIndicator = true);
    _zoomTimer?.cancel();
    _zoomTimer = Timer(const Duration(milliseconds: 1500), () {
      if (mounted) {
        setState(() => _showZoomIndicator = false);
      }
    });
  }

  Future<void> _setScale(double next, {bool persist = true}) async {
    setState(() => _scale = snapChartScale(next));
    if (persist) {
      await _persistZoom();
    }
    _flashZoomIndicator();
  }

  void _maybeSyncTargetKey(Song song) {
    final keyParam = widget.queryParameters['key'];
    if (_keySyncSongId == song.id &&
        _keySyncOriginalKey == song.originalKey &&
        _keySyncKeyParam == keyParam) {
      return;
    }
    _keySyncSongId = song.id;
    _keySyncOriginalKey = song.originalKey;
    _keySyncKeyParam = keyParam;
    final next =
        keyParam != null && isKey(keyParam) ? keyParam : song.originalKey;
    if (_targetKey != next) {
      setState(() => _targetKey = next);
    }
  }

  Future<void> _recordRecent(Song song, String artist) async {
    if (_recordedRecentId == song.id) {
      return;
    }
    _recordedRecentId = song.id;
    await ref.read(recentSongsRepositoryProvider).recordRecentSong(
          songId: song.id,
          title: song.title,
          artist: artist,
          key: song.originalKey,
        );
    if (mounted) {
      ref.invalidate(recentSongsProvider);
    }
  }

  Future<void> _openAddToPlaylist(Song song) async {
    await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (context) => AddToPlaylistSheet(
        songId: song.id,
        songTitle: song.title,
      ),
    );
  }

  Future<void> _shareSong(Song song) async {
    const base = 'https://lfchords.app';
    final url = '$base${songSharePath(song.id)}';
    Rect? shareOrigin;
    final renderBox = context.findRenderObject();
    if (renderBox is RenderBox && renderBox.hasSize) {
      shareOrigin = renderBox.localToGlobal(Offset.zero) & renderBox.size;
    }
    await SharePlus.instance.share(
      ShareParams(
        text: songShareMessage(song.title, url),
        sharePositionOrigin: shareOrigin,
      ),
    );
  }

  Future<void> _openKeyModal(String originalKey) async {
    final picked = await showDialog<String>(
      context: context,
      builder: (context) => _KeyGridDialog(
        originalKey: originalKey,
        selectedKey: _targetKey,
      ),
    );
    if (picked != null && mounted) {
      setState(() => _targetKey = picked);
    }
  }

  void _toggleAutoscroll() {
    if (_autoscroll.active) {
      _autoscroll.stop();
    } else {
      _autoscroll.isTouchDevice = detectTouchAutoscrollDevice(context);
      _autoscroll.start();
    }
    _syncWakeLockAndSystemUi();
  }

  void _toggleFullscreen() {
    setState(() => _fullscreenActive = !_fullscreenActive);
    _syncWakeLockAndSystemUi();
  }

  Future<void> _cycleChartTheme() async {
    final next = cycleChartTheme(_chartTheme);
    setState(() => _chartTheme = next);
    await writeChartTheme(ref.read(sharedPreferencesProvider), next);
  }

  Future<void> _navigateAdjacent(
    SessionNavParams nav,
    List<SessionSongEntry> songs,
    int direction,
  ) async {
    if (nav.sessionId == null || nav.index == null) {
      return;
    }
    final path = buildAdjacentSongPath(
      nav.sessionId!,
      songs,
      nav.index!,
      direction,
    );
    if (path == null) {
      return;
    }
    final newIndex = nav.index! + direction;
    await writeLastSessionIndex(
      ref.read(sharedPreferencesProvider),
      nav.sessionId!,
      newIndex,
    );
    if (_autoscroll.active) {
      _autoscroll.stop();
    }
    if (_fullscreenActive) {
      _fullscreenActive = false;
    }
    _syncWakeLockAndSystemUi();
    if (mounted) {
      context.push(path);
    }
  }

  @override
  Widget build(BuildContext context) {
    final nav = parseSessionNavParams(widget.queryParameters);
    final playlistCtx = ref.watch(playlistContextProvider(nav)).value;
    final sessionSongs = playlistCtx?.songs ?? const <SessionSongEntry>[];
    final liveAsync = ref.watch(songLiveProvider(widget.songId));
    final auth = ref.watch(authControllerProvider).session;

    return liveAsync.when(
      loading: () => const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      ),
      error: (error, _) => Scaffold(
        body: Center(child: Text('Error loading song: $error')),
      ),
      data: (payload) {
        if (!payload.ready) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }
        final song = payload.song;
        if (song == null) {
          return Scaffold(
            body: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Song not found',
                    style: TextStyle(fontSize: 22, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    auth.user != null
                        ? 'No song matches this link.'
                        : 'Sign in to view shared songs.',
                  ),
                  TextButton(
                    onPressed: () => context.go(RoutePaths.home),
                    child: const Text('← Home'),
                  ),
                ],
              ),
            ),
          );
        }

        final keyParam = widget.queryParameters['key'];
        final needsKeySync = _keySyncSongId != song.id ||
            _keySyncOriginalKey != song.originalKey ||
            _keySyncKeyParam != keyParam;

        if (_initializedSongId != song.id || needsKeySync) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (!mounted) {
              return;
            }
            if (_initializedSongId != song.id) {
              setState(() => _initializedSongId = song.id);
              _recordRecent(song, payload.artist);
            }
            if (needsKeySync) {
              _maybeSyncTargetKey(song);
            }
          });
        }

        final originalKey = song.originalKey;
        final currentKey = isKey(_targetKey) ? _targetKey : originalKey;
        final backHref = nav.sessionId != null
            ? RoutePaths.playlistDetail(nav.sessionId!)
            : RoutePaths.home;
        final backLabel =
            nav.sessionId != null ? 'Back to playlist' : 'Back to home';

        final prevPath = nav.sessionId != null && nav.index != null
            ? buildAdjacentSongPath(
                nav.sessionId!,
                sessionSongs,
                nav.index!,
                -1,
              )
            : null;
        final nextPath = nav.sessionId != null && nav.index != null
            ? buildAdjacentSongPath(
                nav.sessionId!,
                sessionSongs,
                nav.index!,
                1,
              )
            : null;
        final sessionPosition = nav.index != null && sessionSongs.isNotEmpty
            ? '${nav.index! + 1}/${sessionSongs.length}'
            : null;

        return LayoutBuilder(
          builder: (context, constraints) {
            final width = constraints.maxWidth;
            final isMobile = isMobileLayout(width);
            final performanceMode = isPerformanceMode(
              viewportWidth: width,
              hasPlaylist: nav.sessionId != null,
            );
            final immersive = _autoscroll.active || _fullscreenActive;
            final showHeader = !_fullscreenActive;
            final showControlBar =
                !(isMobile && _autoscroll.active) && !_fullscreenActive;
            final showBottomBar =
                isMobile && !_autoscroll.active && !_fullscreenActive;

            final wrapEnabled = computeWrapEnabled(
              viewportWidth: width,
              hasPlaylist: nav.sessionId != null,
            );
            final chartWidth = width - 32;
            final layoutScale = clampChartScale(_scale);
            final scaledFontSize = chartBaseFontSize * layoutScale;
            final maxChars = wrapEnabled
                ? charsPerLine(chartWidth, scaledFontSize)
                : 9999;

            final themeColors = ChartThemeColors.resolve(
              _chartTheme,
              Theme.of(context).brightness,
            );

            return Scaffold(
              body: GestureDetector(
                behavior: HitTestBehavior.translucent,
                onHorizontalDragStart: (details) {
                  _swipeStartX = details.globalPosition.dx;
                },
                onHorizontalDragEnd: (details) {
                  if (_swipeStartX == null ||
                      nav.sessionId == null ||
                      nav.index == null) {
                    return;
                  }
                  final delta =
                      details.globalPosition.dx - _swipeStartX!;
                  _swipeStartX = null;
                  if (delta.abs() < 72) {
                    return;
                  }
                  unawaited(_navigateAdjacent(
                    nav,
                    sessionSongs,
                    delta > 0 ? -1 : 1,
                  ));
                },
                child: Stack(
                  children: [
                    Positioned.fill(
                      child: SafeArea(
                        bottom: showBottomBar || _autoscroll.active
                            ? false
                            : true,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            if (showHeader)
                              SongHeader(
                                title: song.title,
                                artist: payload.artist,
                                backHref: backHref,
                                backLabel: backLabel,
                                compact: isMobile || performanceMode,
                              ),
                            if (showControlBar)
                              Padding(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 16,
                                ),
                                child: SongControlBar(
                                  displayKey: currentKey,
                                  originalKey: originalKey,
                                  viewMode: _viewMode,
                                  transposeFlash: _transposeFlash,
                                  showMobileControls: isMobile,
                                  onTransposeDown: () {
                                    setState(() {
                                      _targetKey =
                                          transposeKeyBy(currentKey, -1);
                                      _transposeFlash = _targetKey;
                                    });
                                    Future.delayed(
                                      const Duration(milliseconds: 900),
                                      () {
                                        if (mounted) {
                                          setState(
                                            () => _transposeFlash = null,
                                          );
                                        }
                                      },
                                    );
                                  },
                                  onTransposeUp: () {
                                    setState(() {
                                      _targetKey =
                                          transposeKeyBy(currentKey, 1);
                                      _transposeFlash = _targetKey;
                                    });
                                    Future.delayed(
                                      const Duration(milliseconds: 900),
                                      () {
                                        if (mounted) {
                                          setState(
                                            () => _transposeFlash = null,
                                          );
                                        }
                                      },
                                    );
                                  },
                                  onOpenKeyModal: () =>
                                      _openKeyModal(originalKey),
                                  onViewModeChange: (mode) =>
                                      setState(() => _viewMode = mode),
                                  onZoomOut: () => _setScale(_scale - 0.1),
                                  onZoomIn: () => _setScale(_scale + 0.1),
                                  onShare: () => _shareSong(song),
                                  onAddToPlaylist: auth.user != null
                                      ? () => _openAddToPlaylist(song)
                                      : null,
                                  onToggleAutoscroll: isMobile
                                      ? null
                                      : _toggleAutoscroll,
                                  autoscrollActive: _autoscroll.active,
                                  onToggleFullscreen:
                                      isMobile ? null : _toggleFullscreen,
                                  fullscreenActive: _fullscreenActive,
                                ),
                              ),
                            Expanded(
                              child: SingleChildScrollView(
                                controller: _scrollController,
                                padding: EdgeInsets.fromLTRB(
                                  16,
                                  16,
                                  16,
                                  immersive
                                      ? 96
                                      : showBottomBar
                                          ? 112
                                          : 16,
                                ),
                                child: ChartThemeScope(
                                  colors: themeColors,
                                  child: DecoratedBox(
                                    decoration: BoxDecoration(
                                      color: themeColors.chartBackground,
                                      borderRadius: themeColors
                                                  .chartBackground !=
                                              null
                                          ? BorderRadius.circular(12)
                                          : null,
                                    ),
                                    child: Padding(
                                      padding: themeColors.chartPadding,
                                      child: ChordChartViewport(
                                        scale: _scale,
                                        scalePercent:
                                            (_scale * 100).round(),
                                        showIndicator: _showZoomIndicator,
                                        gesturesEnabled:
                                            !_autoscroll.active,
                                        onPinchUpdate: (next) {
                                          setState(() =>
                                              _scale = clampChartScale(next));
                                          _flashZoomIndicator();
                                        },
                                        onPinchEnd: () async {
                                          await _setScale(_scale);
                                        },
                                        onDoubleTap: () => _setScale(
                                          _scale >= 1.4 ? 1 : 1.5,
                                        ),
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            for (final section
                                                in song.sections)
                                              SectionBlock(
                                                label: section.label,
                                                lines: section.lines,
                                                originalKey: originalKey,
                                                targetKey: currentKey,
                                                viewMode: _viewMode,
                                                wrapEnabled: wrapEnabled,
                                                maxChars: maxChars,
                                                maxWidth: chartWidth,
                                                fontSize: scaledFontSize,
                                                languageTags: payload.tags,
                                              ),
                                          ],
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    if (_autoscroll.active)
                      Positioned(
                        left: 0,
                        right: 0,
                        bottom: 0,
                        child: AutoscrollBar(
                          speed: _autoscroll.speed,
                          paused: _autoscroll.paused,
                          onDecrease: () {
                            setState(() => _autoscroll.decreaseSpeed());
                          },
                          onIncrease: () {
                            setState(() => _autoscroll.increaseSpeed());
                          },
                          onTogglePause: () {
                            setState(() {
                              if (_autoscroll.paused) {
                                _autoscroll.resume();
                              } else {
                                _autoscroll.pause();
                              }
                            });
                          },
                          onClose: () {
                            _autoscroll.stop();
                            _syncWakeLockAndSystemUi();
                          },
                        ),
                      ),
                    if (showBottomBar)
                      Positioned(
                        left: 0,
                        right: 0,
                        bottom: 0,
                        child: PerformanceBottomBar(
                          displayKey: currentKey,
                          transposeFlash: _transposeFlash,
                          onOpenKeyModal: () => _openKeyModal(originalKey),
                          onZoomOut: () => _setScale(_scale - 0.1),
                          onZoomIn: () => _setScale(_scale + 0.1),
                          chartTheme: _chartTheme,
                          onToggleTheme: () => unawaited(_cycleChartTheme()),
                          onToggleAutoscroll: _toggleAutoscroll,
                          autoscrollActive: _autoscroll.active,
                          onToggleFullscreen: _toggleFullscreen,
                          fullscreenActive: _fullscreenActive,
                          sessionLabel: playlistCtx?.session?.title,
                          sessionPosition: sessionPosition,
                          prevPath: prevPath,
                          nextPath: nextPath,
                          sessionBackPath: nav.sessionId != null
                              ? RoutePaths.playlistDetail(nav.sessionId!)
                              : null,
                          onNavigatePrev: prevPath != null
                              ? () => unawaited(_navigateAdjacent(
                                    nav,
                                    sessionSongs,
                                    -1,
                                  ))
                              : null,
                          onNavigateNext: nextPath != null
                              ? () => unawaited(_navigateAdjacent(
                                    nav,
                                    sessionSongs,
                                    1,
                                  ))
                              : null,
                        ),
                      ),
                    if (_fullscreenActive)
                      PerformanceFullscreenOverlay(
                        onExit: _toggleFullscreen,
                        onZoomIn: () => _setScale(_scale + 0.1),
                        onZoomOut: () => _setScale(_scale - 0.1),
                        nextPath: nextPath,
                        sessionPosition: sessionPosition,
                        onNavigateNext: nextPath != null
                            ? () => unawaited(_navigateAdjacent(
                                  nav,
                                  sessionSongs,
                                  1,
                                ))
                            : null,
                      ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }
}

class _KeyGridDialog extends StatelessWidget {
  const _KeyGridDialog({
    required this.originalKey,
    required this.selectedKey,
  });

  final String originalKey;
  final String selectedKey;

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text('Select key (original $originalKey)'),
      content: SizedBox(
        width: double.maxFinite,
        child: GridView.count(
          shrinkWrap: true,
          crossAxisCount: 4,
          mainAxisSpacing: 8,
          crossAxisSpacing: 8,
          children: [
            for (final key in allKeys)
              FilledButton.tonal(
                onPressed: () => Navigator.pop(context, key),
                style: selectedKey == key
                    ? FilledButton.styleFrom(
                        backgroundColor:
                            Theme.of(context).colorScheme.primaryContainer,
                      )
                    : null,
                child: Text(key),
              ),
          ],
        ),
      ),
    );
  }
}
