import 'package:flutter_test/flutter_test.dart';
import 'package:samecharge/core/config/app_config.dart';
import 'package:samecharge/core/config/app_environment.dart';
import 'package:samecharge/core/firebase/firebase_options_dev.dart';
import 'package:samecharge/core/firebase/firebase_runtime_config.dart';
import 'package:samecharge/core/firebase/firebase_runtime_target.dart';

void main() {
  test('environment configuration maps dev and prod correctly', () {
    final dev = AppConfig.forEnvironment(AppEnvironment.dev);
    final prod = AppConfig.forEnvironment(AppEnvironment.prod);

    expect(dev.environment, AppEnvironment.dev);
    expect(dev.isDevelopment, isTrue);
    expect(dev.displayName, 'SameCharge Dev');
    expect(dev.isFirebaseConfigured, isTrue);
    expect(dev.firebase.target, FirebaseRuntimeTarget.emulator);

    expect(prod.environment, AppEnvironment.prod);
    expect(prod.isDevelopment, isFalse);
    expect(prod.displayName, 'SameCharge');
    expect(prod.isFirebaseConfigured, isFalse);
    expect(prod.firebase.target, FirebaseRuntimeTarget.disabled);
  });

  test('runtime target parsing is explicit and fail closed', () {
    expect(
      AppConfig.forEnvironment(AppEnvironment.dev).firebase.target,
      FirebaseRuntimeTarget.emulator,
    );
    expect(
      AppConfig.forEnvironment(
        AppEnvironment.dev,
        firebaseTarget: 'emulator',
      ).firebase.target,
      FirebaseRuntimeTarget.emulator,
    );
    expect(
      AppConfig.forEnvironment(
        AppEnvironment.dev,
        firebaseTarget: 'dev-cloud',
        devCloudOptions: DefaultFirebaseOptions.android,
      ).firebase.target,
      FirebaseRuntimeTarget.devCloud,
    );
    expect(
      () => AppConfig.forEnvironment(AppEnvironment.dev, firebaseTarget: 'bad'),
      throwsStateError,
    );
    expect(
      AppConfig.forEnvironment(AppEnvironment.prod).firebase.target,
      FirebaseRuntimeTarget.disabled,
    );
    expect(
      () => AppConfig.forEnvironment(
        AppEnvironment.prod,
        firebaseTarget: 'emulator',
      ),
      throwsStateError,
    );
    expect(
      () => AppConfig.forEnvironment(
        AppEnvironment.prod,
        firebaseTarget: 'dev-cloud',
      ),
      throwsStateError,
    );
  });

  test('emulator configuration uses safe fixed endpoints', () {
    final config = AppConfig.forEnvironment(AppEnvironment.dev).firebase;

    expect(config.emulatorHost, '10.0.2.2');
    expect(config.authPort, 9099);
    expect(config.firestorePort, 8080);
    expect(config.functionsPort, 5001);
    expect(config.functionsRegion, 'europe-west1');
    expect(config.emulatorProjectId, startsWith('demo-'));
    expect(config.emulatorProjectId, 'demo-samecharge-mobile');
  });

  test('emulator host override accepts host-only values', () {
    expect(
      AppConfig.forEnvironment(
        AppEnvironment.dev,
        emulatorHost: 'localhost',
      ).firebase.emulatorHost,
      'localhost',
    );
    expect(
      AppConfig.forEnvironment(
        AppEnvironment.dev,
        emulatorHost: '192.168.1.10',
      ).firebase.emulatorHost,
      '192.168.1.10',
    );
  });

  test('emulator host override rejects URLs and malformed values', () {
    for (final host in [
      'http://10.0.2.2',
      'https://10.0.2.2',
      '10.0.2.2/path',
      '10.0.2.2?x=1',
      ' 10.0.2.2',
      '10.0.2.2 ',
      '10.0.2.2:5001',
    ]) {
      expect(
        () => AppConfig.forEnvironment(AppEnvironment.dev, emulatorHost: host),
        throwsStateError,
      );
    }

    expect(
      () => AppConfig.forEnvironment(
        AppEnvironment.dev,
        firebaseTarget: 'dev-cloud',
        emulatorHost: 'localhost',
      ),
      throwsStateError,
    );
  });

  test('dev cloud selects generated dev options only for explicit target', () {
    final config = AppConfig.forEnvironment(
      AppEnvironment.dev,
      firebaseTarget: 'dev-cloud',
      devCloudOptions: DefaultFirebaseOptions.android,
    ).firebase;

    expect(config.target, FirebaseRuntimeTarget.devCloud);
    expect(config.options?.projectId, 'samecharge-dev-freddie336');
    expect(config.options?.appId, contains(':android:'));
  });

  test('dev cloud requires dev entrypoint Firebase options', () {
    expect(
      () => AppConfig.forEnvironment(
        AppEnvironment.dev,
        firebaseTarget: 'dev-cloud',
      ),
      throwsStateError,
    );
  });

  test('demo options stay isolated from real Firebase projects', () {
    final config = FirebaseRuntimeConfig.forEnvironment(
      AppEnvironment.dev,
      firebaseTarget: '',
      emulatorHost: '',
    );

    expect(config.demoOptions.projectId, 'demo-samecharge-mobile');
    expect(config.demoOptions.apiKey, 'demo-api-key');
  });
}
