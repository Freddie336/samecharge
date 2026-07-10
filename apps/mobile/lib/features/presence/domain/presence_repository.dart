import 'presence_snapshot.dart';

abstract class PresenceRepository {
  Future<void> configureDisconnect(String uid);
  Future<void> writeOnline(PresenceSnapshot snapshot);
  Future<void> markOffline(String uid);
}
