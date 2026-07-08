enum BatteryChargeState { charging, discharging, full, unknown }

enum BatterySnapshotSource { platform, unavailable, failure }

class BatterySnapshot {
  const BatterySnapshot({
    required this.batteryLevel,
    required this.batteryState,
    required this.updatedAt,
    required this.source,
  });

  factory BatterySnapshot.unavailable(DateTime updatedAt) {
    return BatterySnapshot(
      batteryLevel: 0,
      batteryState: BatteryChargeState.unknown,
      updatedAt: updatedAt,
      source: BatterySnapshotSource.unavailable,
    );
  }

  factory BatterySnapshot.failure(DateTime updatedAt) {
    return BatterySnapshot(
      batteryLevel: 0,
      batteryState: BatteryChargeState.unknown,
      updatedAt: updatedAt,
      source: BatterySnapshotSource.failure,
    );
  }

  final int batteryLevel;
  final BatteryChargeState batteryState;
  final DateTime updatedAt;
  final BatterySnapshotSource source;

  bool get isAvailable => source == BatterySnapshotSource.platform;
}
