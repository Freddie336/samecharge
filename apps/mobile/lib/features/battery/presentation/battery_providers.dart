import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/battery_plus_service.dart';
import '../domain/battery_snapshot.dart';

final batterySnapshotProvider = StreamProvider<BatterySnapshot>((ref) {
  return ref.watch(batteryServiceProvider).snapshots();
});

Future<void> refreshBatterySnapshot(WidgetRef ref) async {
  ref.invalidate(batterySnapshotProvider);
  await ref.read(batterySnapshotProvider.future);
}
