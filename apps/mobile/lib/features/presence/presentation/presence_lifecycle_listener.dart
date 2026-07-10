import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/app_config.dart';
import '../../auth/domain/auth_user.dart';
import '../../battery/domain/battery_snapshot.dart';
import '../../battery/presentation/battery_providers.dart';
import '../../bootstrap/domain/bootstrap_state.dart';
import '../data/firebase_presence_repository.dart';
import '../domain/presence_repository.dart';
import '../domain/presence_snapshot.dart';

const presenceHeartbeatInterval = Duration(seconds: 45);

class PresenceLifecycleListener extends ConsumerStatefulWidget {
  const PresenceLifecycleListener({
    required this.user,
    required this.bootstrap,
    required this.child,
    super.key,
  });

  final AuthUser? user;
  final BootstrapState? bootstrap;
  final Widget child;

  @override
  ConsumerState<PresenceLifecycleListener> createState() =>
      _PresenceLifecycleListenerState();
}

class _PresenceLifecycleListenerState
    extends ConsumerState<PresenceLifecycleListener>
    with WidgetsBindingObserver {
  Timer? _heartbeat;
  String? _activeUid;
  String? _configuredDisconnectUid;
  late final PresenceRepository _repository;
  bool _foreground = true;

  @override
  void initState() {
    super.initState();
    _repository = ref.read(presenceRepositoryProvider);
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) => _syncPresence());
  }

  @override
  void didUpdateWidget(PresenceLifecycleListener oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.user?.uid != widget.user?.uid ||
        oldWidget.bootstrap != widget.bootstrap) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _syncPresence());
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _heartbeat?.cancel();
    final uid = _activeUid;
    if (uid != null) {
      unawaited(_bestEffort(_repository.markOffline(uid)));
    }
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _foreground = true;
      unawaited(_refreshAndWrite());
      _startHeartbeat();
      return;
    }

    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.detached ||
        state == AppLifecycleState.inactive) {
      _foreground = false;
      _heartbeat?.cancel();
      final uid = _activeUid;
      if (uid != null) {
        unawaited(_bestEffort(_repository.markOffline(uid)));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<AsyncValue<BatterySnapshot>>(batterySnapshotProvider, (
      previous,
      next,
    ) {
      if (_foreground && next.hasValue) {
        unawaited(_writeOnline());
      }
    });

    return widget.child;
  }

  Future<void> _syncPresence() async {
    final user = widget.user;
    final bootstrap = widget.bootstrap;

    if (user == null || bootstrap == null) {
      await _stopPresence();
      return;
    }

    _activeUid = user.uid;
    await _configureDisconnect(user.uid);
    await _writeOnline();
    _startHeartbeat();
  }

  Future<void> _stopPresence() async {
    _heartbeat?.cancel();
    final uid = _activeUid;
    _activeUid = null;
    _configuredDisconnectUid = null;

    if (uid != null) {
      await _bestEffort(_repository.markOffline(uid));
    }
  }

  Future<void> _configureDisconnect(String uid) async {
    if (_configuredDisconnectUid == uid) {
      return;
    }

    await _bestEffort(_repository.configureDisconnect(uid));
    _configuredDisconnectUid = uid;
  }

  Future<void> _refreshAndWrite() async {
    await refreshBatterySnapshot(ref);
    await _writeOnline();
  }

  Future<void> _writeOnline() async {
    final uid = widget.user?.uid;
    final bootstrap = widget.bootstrap;
    if (!_foreground || uid == null || bootstrap == null) {
      return;
    }

    final appConfig = ref.read(appConfigProvider);
    final snapshot = ref
        .read(batterySnapshotProvider)
        .maybeWhen(
          data: (value) => value,
          orElse: () => BatterySnapshot.unavailable(DateTime.now().toUtc()),
        );

    await _bestEffort(
      _repository.writeOnline(
        PresenceSnapshot(
          uid: uid,
          batteryLevel: snapshot.batteryLevel,
          batteryState: snapshot.batteryState,
          cityId: 'istanbul',
          online: true,
          profileEligible: bootstrap.discoveryEligible,
          appVersion: appConfig.appVersion,
        ),
      ),
    );
  }

  void _startHeartbeat() {
    _heartbeat?.cancel();
    _heartbeat = Timer.periodic(
      presenceHeartbeatInterval,
      (_) => unawaited(_writeOnline()),
    );
  }
}

Future<void> _bestEffort(Future<void> operation) async {
  try {
    await operation;
  } catch (_) {
    // Presence is an opportunistic foreground signal.
  }
}
