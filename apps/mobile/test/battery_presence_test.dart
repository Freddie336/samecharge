import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:samecharge/core/config/app_config.dart';
import 'package:samecharge/core/config/app_environment.dart';
import 'package:samecharge/features/auth/domain/auth_user.dart';
import 'package:samecharge/features/battery/data/battery_plus_service.dart';
import 'package:samecharge/features/battery/domain/battery_service.dart';
import 'package:samecharge/features/battery/domain/battery_snapshot.dart';
import 'package:samecharge/features/battery/presentation/battery_providers.dart';
import 'package:samecharge/features/bootstrap/domain/bootstrap_state.dart';
import 'package:samecharge/features/presence/data/firebase_presence_repository.dart';
import 'package:samecharge/features/presence/domain/presence_repository.dart';
import 'package:samecharge/features/presence/domain/presence_snapshot.dart';
import 'package:samecharge/features/presence/presentation/presence_lifecycle_listener.dart';

class FakeBatteryService implements BatteryService {
  FakeBatteryService(this.snapshot);

  final BatterySnapshot snapshot;

  @override
  Future<BatterySnapshot> currentSnapshot() async => snapshot;

  @override
  Stream<BatterySnapshot> snapshots() => Stream.value(snapshot);
}

class RecordingPresenceRepository implements PresenceRepository {
  final configuredDisconnect = <String>[];
  final offline = <String>[];
  final online = <PresenceSnapshot>[];

  @override
  Future<void> configureDisconnect(String uid) async {
    configuredDisconnect.add(uid);
  }

  @override
  Future<void> markOffline(String uid) async {
    offline.add(uid);
  }

  @override
  Future<void> writeOnline(PresenceSnapshot snapshot) async {
    online.add(snapshot);
  }
}

void main() {
  final batterySnapshot = BatterySnapshot(
    batteryLevel: 64,
    batteryState: BatteryChargeState.charging,
    updatedAt: DateTime.utc(2026, 7, 8, 12),
    source: BatterySnapshotSource.platform,
  );

  test('battery provider exposes a safe snapshot', () async {
    final container = ProviderContainer(
      overrides: [
        batteryServiceProvider.overrideWithValue(
          FakeBatteryService(batterySnapshot),
        ),
      ],
    );
    addTearDown(container.dispose);

    final subscription = container.listen(
      batterySnapshotProvider,
      (_, _) {},
      fireImmediately: true,
    );
    await Future<void>.delayed(Duration.zero);
    final snapshot = subscription.read().when(
      data: (value) => value,
      error: (error, stackTrace) => throw error,
      loading: () => throw StateError('Battery snapshot did not load.'),
    );

    expect(snapshot.batteryLevel, 64);
    expect(snapshot.batteryState, BatteryChargeState.charging);
    expect(snapshot.source, BatterySnapshotSource.platform);
  });

  testWidgets('presence does not start when unauthenticated', (tester) async {
    final presence = RecordingPresenceRepository();

    await tester.pumpWidget(
      _presenceHarness(
        presence: presence,
        battery: batterySnapshot,
        user: null,
      ),
    );
    await tester.pump();

    expect(presence.configuredDisconnect, isEmpty);
    expect(presence.online, isEmpty);
    expect(presence.offline, isEmpty);
  });

  testWidgets('presence starts foreground writes and marks offline on pause', (
    tester,
  ) async {
    final presence = RecordingPresenceRepository();

    await tester.pumpWidget(
      _presenceHarness(
        presence: presence,
        battery: batterySnapshot,
        user: const AuthUser(uid: 'alice'),
      ),
    );
    await tester.pump();
    await tester.pump();

    expect(presence.configuredDisconnect, ['alice']);
    expect(presence.online, isNotEmpty);
    expect(presence.online.last.batteryLevel, 64);
    expect(presence.online.last.profileEligible, isTrue);

    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
    await tester.pump();

    expect(presence.offline, contains('alice'));
  });
}

Widget _presenceHarness({
  required RecordingPresenceRepository presence,
  required BatterySnapshot battery,
  required AuthUser? user,
}) {
  return ProviderScope(
    overrides: [
      appConfigProvider.overrideWithValue(
        AppConfig.forEnvironment(AppEnvironment.prod),
      ),
      batteryServiceProvider.overrideWithValue(FakeBatteryService(battery)),
      presenceRepositoryProvider.overrideWithValue(presence),
    ],
    child: Directionality(
      textDirection: TextDirection.ltr,
      child: PresenceLifecycleListener(
        user: user,
        bootstrap: const BootstrapState(
          onboardingStatus: OnboardingStatus.completed,
          accountStatus: PublicAccountStatus.active,
          profileStatus: ProfileStatus.approved,
          discoveryEligible: true,
          moderationActionRequired: false,
        ),
        child: const SizedBox.shrink(),
      ),
    ),
  );
}
