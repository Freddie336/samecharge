import 'battery_snapshot.dart';

abstract class BatteryService {
  Future<BatterySnapshot> currentSnapshot();
  Stream<BatterySnapshot> snapshots();
}
