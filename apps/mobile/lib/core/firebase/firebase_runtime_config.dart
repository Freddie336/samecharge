import 'package:firebase_core/firebase_core.dart';

import '../config/app_environment.dart';
import 'firebase_runtime_target.dart';

class FirebaseRuntimeConfig {
  const FirebaseRuntimeConfig({
    required this.target,
    required this.emulatorProjectId,
    required this.emulatorHost,
    required this.authPort,
    required this.databasePort,
    required this.functionsPort,
    required this.storagePort,
    required this.functionsRegion,
    this.options,
  });

  factory FirebaseRuntimeConfig.forEnvironment(
    AppEnvironment environment, {
    required String firebaseTarget,
    required String emulatorHost,
    FirebaseOptions? devCloudOptions,
  }) {
    final target = _targetFor(environment, firebaseTarget);
    final host = _hostFor(target, emulatorHost);

    return FirebaseRuntimeConfig(
      target: target,
      emulatorProjectId: emulatorProjectIdValue,
      emulatorHost: host,
      authPort: authPortValue,
      databasePort: databasePortValue,
      functionsPort: functionsPortValue,
      storagePort: storagePortValue,
      functionsRegion: functionsRegionValue,
      options: target == FirebaseRuntimeTarget.devCloud
          ? _requireDevCloudOptions(devCloudOptions)
          : null,
    );
  }

  static const emulatorProjectIdValue = 'demo-samecharge-mobile';
  static const defaultEmulatorHostValue = '10.0.2.2';
  static const authPortValue = 9099;
  static const databasePortValue = 9000;
  static const functionsPortValue = 5001;
  static const storagePortValue = 9199;
  static const functionsRegionValue = 'europe-west1';

  final FirebaseRuntimeTarget target;
  final String emulatorProjectId;
  final String emulatorHost;
  final int authPort;
  final int databasePort;
  final int functionsPort;
  final int storagePort;
  final String functionsRegion;
  final FirebaseOptions? options;

  FirebaseOptions get demoOptions {
    return FirebaseOptions(
      apiKey: 'demo-api-key',
      appId: '1:000000000000:android:demo',
      messagingSenderId: '000000000000',
      projectId: emulatorProjectId,
    );
  }

  String get statusLabel => target.statusLabel;
}

FirebaseOptions _requireDevCloudOptions(FirebaseOptions? options) {
  if (options == null) {
    throw StateError('Dev Firebase options are required.');
  }

  return options;
}

FirebaseRuntimeTarget _targetFor(
  AppEnvironment environment,
  String firebaseTarget,
) {
  if (environment == AppEnvironment.prod) {
    if (firebaseTarget.isEmpty || firebaseTarget == 'disabled') {
      return FirebaseRuntimeTarget.disabled;
    }

    throw StateError('Firebase is disabled for production.');
  }

  final value = firebaseTarget.isEmpty ? 'emulator' : firebaseTarget;

  return switch (value) {
    'emulator' => FirebaseRuntimeTarget.emulator,
    'dev-cloud' => FirebaseRuntimeTarget.devCloud,
    _ => throw StateError('Unsupported Firebase runtime target.'),
  };
}

String _hostFor(FirebaseRuntimeTarget target, String emulatorHost) {
  if (target != FirebaseRuntimeTarget.emulator) {
    if (emulatorHost.isNotEmpty) {
      throw StateError(
        'Firebase emulator host is only valid for emulator target.',
      );
    }

    return FirebaseRuntimeConfig.defaultEmulatorHostValue;
  }

  final host = emulatorHost.isEmpty
      ? FirebaseRuntimeConfig.defaultEmulatorHostValue
      : emulatorHost;

  if (!_isValidHost(host)) {
    throw StateError('Unsupported Firebase emulator host.');
  }

  return host;
}

bool _isValidHost(String host) {
  if (host.trim() != host || host.isEmpty) {
    return false;
  }

  if (host.contains('://') ||
      host.contains('/') ||
      host.contains('?') ||
      host.contains('#') ||
      host.contains(':')) {
    return false;
  }

  return RegExp(r'^[A-Za-z0-9.-]+$').hasMatch(host);
}
