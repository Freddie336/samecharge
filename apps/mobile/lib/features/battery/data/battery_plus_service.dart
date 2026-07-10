import 'package:battery_plus/battery_plus.dart' as battery_plus;
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../domain/battery_service.dart';
import '../domain/battery_snapshot.dart';

final batteryServiceProvider = Provider<BatteryService>((ref) {
  return BatteryPlusService(battery_plus.Battery());
});

class BatteryPlusService implements BatteryService {
  const BatteryPlusService(this._battery);

  final battery_plus.Battery _battery;

  @override
  Future<BatterySnapshot> currentSnapshot() async {
    try {
      final level = await _battery.batteryLevel;
      final state = await _battery.batteryState;
      return BatterySnapshot(
        batteryLevel: level.clamp(0, 100),
        batteryState: _mapState(state),
        updatedAt: DateTime.now().toUtc(),
        source: BatterySnapshotSource.platform,
      );
    } catch (_) {
      return BatterySnapshot.failure(DateTime.now().toUtc());
    }
  }

  @override
  Stream<BatterySnapshot> snapshots() async* {
    yield await currentSnapshot();

    await for (final _ in _battery.onBatteryStateChanged) {
      yield await currentSnapshot();
    }
  }
}

BatteryChargeState _mapState(battery_plus.BatteryState state) {
  return switch (state) {
    battery_plus.BatteryState.charging => BatteryChargeState.charging,
    battery_plus.BatteryState.discharging => BatteryChargeState.discharging,
    battery_plus.BatteryState.full => BatteryChargeState.full,
    battery_plus.BatteryState.connectedNotCharging =>
      BatteryChargeState.unknown,
    battery_plus.BatteryState.unknown => BatteryChargeState.unknown,
  };
}
