import 'package:firebase_database/firebase_database.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/firebase/firebase_services.dart';
import '../../battery/domain/battery_snapshot.dart';
import '../domain/presence_repository.dart';
import '../domain/presence_snapshot.dart';

final presenceRepositoryProvider = Provider<PresenceRepository>((ref) {
  final database = ref.watch(firebaseServicesProvider).database;
  if (database == null) {
    return const DisabledPresenceRepository();
  }

  return FirebasePresenceRepository(database);
});

class DisabledPresenceRepository implements PresenceRepository {
  const DisabledPresenceRepository();

  @override
  Future<void> configureDisconnect(String uid) async {}

  @override
  Future<void> markOffline(String uid) async {}

  @override
  Future<void> writeOnline(PresenceSnapshot snapshot) async {}
}

class FirebasePresenceRepository implements PresenceRepository {
  const FirebasePresenceRepository(this._database);

  final FirebaseDatabase _database;

  @override
  Future<void> configureDisconnect(String uid) async {
    await _ref(uid).onDisconnect().update({
      'online': false,
      'lastSeenAt': ServerValue.timestamp,
    });
  }

  @override
  Future<void> writeOnline(PresenceSnapshot snapshot) async {
    await _ref(snapshot.uid).set({
      'batteryLevel': snapshot.batteryLevel,
      'batteryState': _batteryState(snapshot.batteryState),
      'cityId': snapshot.cityId,
      'online': true,
      'lastSeenAt': ServerValue.timestamp,
      'profileEligible': snapshot.profileEligible,
      'appVersion': snapshot.appVersion,
    });
  }

  @override
  Future<void> markOffline(String uid) async {
    await _ref(
      uid,
    ).update({'online': false, 'lastSeenAt': ServerValue.timestamp});
  }

  DatabaseReference _ref(String uid) => _database.ref('presence/$uid');
}

String _batteryState(BatteryChargeState state) {
  return switch (state) {
    BatteryChargeState.charging => 'charging',
    BatteryChargeState.discharging => 'discharging',
    BatteryChargeState.full => 'full',
    BatteryChargeState.unknown => 'unknown',
  };
}
