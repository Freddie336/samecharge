import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:samecharge/core/config/app_config.dart';
import 'package:samecharge/core/config/app_environment.dart';
import 'package:samecharge/core/firebase/firebase_initializer.dart';
import 'package:samecharge/core/firebase/firebase_options_dev.dart';
import 'package:samecharge/core/firebase/firebase_services.dart';

class FakeFirebaseAdapter implements FirebaseBootstrapAdapter {
  final calls = <String>[];
  FirebaseOptions? initializedOptions;
  String? configuredRegion;

  @override
  Future<void> activateDebugAppCheck() async {
    calls.add('activateDebugAppCheck');
  }

  @override
  Future<void> configureFunctions(String region) async {
    calls.add('configureFunctions:$region');
    configuredRegion = region;
  }

  @override
  Future<void> connectAuthEmulator(String host, int port) async {
    calls.add('connectAuthEmulator:$host:$port');
  }

  @override
  Future<void> configureDatabase() async {
    calls.add('configureDatabase');
  }

  @override
  Future<void> connectDatabaseEmulator(String host, int port) async {
    calls.add('connectDatabaseEmulator:$host:$port');
  }

  @override
  Future<void> connectFunctionsEmulator(String host, int port) async {
    calls.add('connectFunctionsEmulator:$host:$port');
  }

  @override
  Future<void> configureStorage() async {
    calls.add('configureStorage');
  }

  @override
  Future<void> connectStorageEmulator(String host, int port) async {
    calls.add('connectStorageEmulator:$host:$port');
  }

  @override
  Future<void> initializeApp(FirebaseOptions options) async {
    calls.add('initializeApp:${options.projectId}');
    initializedOptions = options;
  }

  @override
  FirebaseServices services() {
    calls.add('services');
    return const FirebaseServices.disabled();
  }
}

void main() {
  test(
    'emulator target initializes app and attaches emulators in order',
    () async {
      final adapter = FakeFirebaseAdapter();
      final initializer = FirebaseInitializer(adapter: adapter);
      final config = AppConfig.forEnvironment(AppEnvironment.dev).firebase;

      final result = await initializer.initialize(config);

      expect(result.initialized, isTrue);
      expect(adapter.calls, [
        'initializeApp:demo-samecharge-mobile',
        'connectAuthEmulator:10.0.2.2:9099',
        'configureDatabase',
        'connectDatabaseEmulator:10.0.2.2:9000',
        'configureFunctions:europe-west1',
        'connectFunctionsEmulator:10.0.2.2:5001',
        'configureStorage',
        'connectStorageEmulator:10.0.2.2:9199',
        'activateDebugAppCheck',
        'services',
      ]);
    },
  );

  test(
    'dev cloud uses generated options and skips emulator attachment',
    () async {
      final adapter = FakeFirebaseAdapter();
      final initializer = FirebaseInitializer(adapter: adapter);
      final config = AppConfig.forEnvironment(
        AppEnvironment.dev,
        firebaseTarget: 'dev-cloud',
        devCloudOptions: DefaultFirebaseOptions.android,
      ).firebase;

      final result = await initializer.initialize(config);

      expect(result.initialized, isTrue);
      expect(
        adapter.initializedOptions?.projectId,
        'samecharge-dev-freddie336',
      );
      expect(adapter.calls, [
        'initializeApp:samecharge-dev-freddie336',
        'activateDebugAppCheck',
        'configureDatabase',
        'configureFunctions:europe-west1',
        'configureStorage',
        'services',
      ]);
    },
  );

  test('prod disabled target performs no Firebase calls', () async {
    final adapter = FakeFirebaseAdapter();
    final initializer = FirebaseInitializer(adapter: adapter);
    final config = AppConfig.forEnvironment(AppEnvironment.prod).firebase;

    final result = await initializer.initialize(config);

    expect(result.initialized, isFalse);
    expect(adapter.calls, isEmpty);
  });
}
