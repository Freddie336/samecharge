import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../firebase/firebase_runtime_config.dart';
import 'app_environment.dart';

class AppConfig {
  const AppConfig({
    required this.environment,
    required this.displayName,
    required this.firebase,
  });

  factory AppConfig.forEnvironment(
    AppEnvironment environment, {
    String firebaseTarget = const String.fromEnvironment(
      'SAMECHARGE_FIREBASE_TARGET',
    ),
    String emulatorHost = const String.fromEnvironment(
      'SAMECHARGE_FIREBASE_EMULATOR_HOST',
    ),
    FirebaseOptions? devCloudOptions,
  }) {
    return switch (environment) {
      AppEnvironment.dev => AppConfig(
        environment: AppEnvironment.dev,
        displayName: 'SameCharge Dev',
        firebase: FirebaseRuntimeConfig.forEnvironment(
          environment,
          firebaseTarget: firebaseTarget,
          emulatorHost: emulatorHost,
          devCloudOptions: devCloudOptions,
        ),
      ),
      AppEnvironment.prod => AppConfig(
        environment: AppEnvironment.prod,
        displayName: 'SameCharge',
        firebase: FirebaseRuntimeConfig.forEnvironment(
          environment,
          firebaseTarget: firebaseTarget,
          emulatorHost: emulatorHost,
          devCloudOptions: devCloudOptions,
        ),
      ),
    };
  }

  final AppEnvironment environment;
  final String displayName;
  final FirebaseRuntimeConfig firebase;

  bool get isDevelopment => environment.isDevelopment;

  bool get isFirebaseConfigured => firebase.target.isEnabled;
}

final appConfigProvider = Provider<AppConfig>((ref) {
  throw StateError('AppConfig must be provided at bootstrap.');
});
