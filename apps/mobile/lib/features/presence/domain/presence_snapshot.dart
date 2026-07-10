import '../../battery/domain/battery_snapshot.dart';

class PresenceSnapshot {
  const PresenceSnapshot({
    required this.uid,
    required this.batteryLevel,
    required this.batteryState,
    required this.cityId,
    required this.online,
    required this.profileEligible,
    required this.appVersion,
  });

  final String uid;
  final int batteryLevel;
  final BatteryChargeState batteryState;
  final String cityId;
  final bool online;
  final bool profileEligible;
  final String appVersion;
}
