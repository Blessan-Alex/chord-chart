import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lf_chords/core/connectivity/connectivity_probe.dart';

final connectivityProbeRunnerProvider = Provider<Future<bool> Function()>(
  (ref) => () => probeConnectivity(),
);

/// Source of truth for [OfflineBanner] — probe-based, not radio alone.
final onlineStatusProvider =
    NotifierProvider<OnlineStatusNotifier, bool>(OnlineStatusNotifier.new);

class OnlineStatusNotifier extends Notifier<bool> with WidgetsBindingObserver {
  Timer? _offlineDebounceTimer;
  Timer? _pollTimer;
  StreamSubscription<List<ConnectivityResult>>? _connectivitySub;
  var _cancelled = false;
  int _probeGeneration = 0;

  @override
  bool build() {
    _cancelled = false;
    ref.onDispose(_dispose);
    WidgetsBinding.instance.addObserver(this);
    unawaited(_check());
    _pollTimer = Timer.periodic(
      const Duration(milliseconds: connectivityPollMs),
      (_) => unawaited(_check()),
    );
    _connectivitySub = Connectivity().onConnectivityChanged.listen((_) {
      unawaited(_check());
    });
    return true;
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      unawaited(_check());
    }
  }

  Future<void> _check() async {
    if (_cancelled) {
      return;
    }
    final generation = ++_probeGeneration;
    final probe = ref.read(connectivityProbeRunnerProvider);
    final reachable = await probe();
    if (_cancelled || generation != _probeGeneration) {
      return;
    }
    _applyReachable(reachable, generation);
  }

  void _applyReachable(bool reachable, int generation) {
    if (reachable) {
      _offlineDebounceTimer?.cancel();
      _offlineDebounceTimer = null;
      state = true;
      return;
    }

    _offlineDebounceTimer?.cancel();
    _offlineDebounceTimer = Timer(
      const Duration(milliseconds: offlineDebounceMs),
      () {
        if (!_cancelled && generation == _probeGeneration) {
          state = false;
        }
      },
    );
  }

  void _dispose() {
    _cancelled = true;
    WidgetsBinding.instance.removeObserver(this);
    _offlineDebounceTimer?.cancel();
    _pollTimer?.cancel();
    unawaited(_connectivitySub?.cancel());
  }
}
