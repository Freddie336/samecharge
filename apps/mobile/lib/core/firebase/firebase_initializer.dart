import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_app_check/firebase_app_check.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';

import 'firebase_runtime_config.dart';
import 'firebase_runtime_target.dart';
import 'firebase_services.dart';

abstract class FirebaseBootstrapAdapter {
  Future<void> initializeApp(FirebaseOptions options);
  Future<void> connectAuthEmulator(String host, int port);
  Future<void> configureFunctions(String region);
  Future<void> connectFunctionsEmulator(String host, int port);
  Future<void> activateDebugAppCheck();
  FirebaseServices services();
}

class FirebaseSdkBootstrapAdapter implements FirebaseBootstrapAdapter {
  static bool _appInitialized = false;
  static bool _authEmulatorConnected = false;
  static bool _functionsEmulatorConnected = false;
  static bool _appCheckActivated = false;

  FirebaseFunctions? _functions;

  @override
  Future<void> initializeApp(FirebaseOptions options) async {
    if (_appInitialized || Firebase.apps.isNotEmpty) {
      _appInitialized = true;
      return;
    }

    await Firebase.initializeApp(options: options);
    _appInitialized = true;
  }

  @override
  Future<void> connectAuthEmulator(String host, int port) async {
    if (_authEmulatorConnected) {
      return;
    }

    await FirebaseAuth.instance.useAuthEmulator(host, port);
    _authEmulatorConnected = true;
  }

  @override
  Future<void> configureFunctions(String region) async {
    _functions ??= FirebaseFunctions.instanceFor(region: region);
  }

  @override
  Future<void> connectFunctionsEmulator(String host, int port) async {
    if (_functionsEmulatorConnected) {
      return;
    }

    final functions = _functions;
    if (functions == null) {
      throw StateError('Functions must be configured before emulator attach.');
    }

    functions.useFunctionsEmulator(host, port);
    _functionsEmulatorConnected = true;
  }

  @override
  Future<void> activateDebugAppCheck() async {
    if (_appCheckActivated) {
      return;
    }

    await FirebaseAppCheck.instance.activate(
      providerAndroid: const AndroidDebugProvider(),
    );
    _appCheckActivated = true;
  }

  @override
  FirebaseServices services() {
    return FirebaseServices(functions: _functions);
  }
}

class FirebaseInitializationResult {
  const FirebaseInitializationResult({
    required this.services,
    required this.initialized,
  });

  final FirebaseServices services;
  final bool initialized;
}

class FirebaseInitializer {
  const FirebaseInitializer({required this.adapter});

  final FirebaseBootstrapAdapter adapter;

  Future<FirebaseInitializationResult> initialize(
    FirebaseRuntimeConfig config,
  ) async {
    switch (config.target) {
      case FirebaseRuntimeTarget.disabled:
        return const FirebaseInitializationResult(
          services: FirebaseServices.disabled(),
          initialized: false,
        );
      case FirebaseRuntimeTarget.emulator:
        await adapter.initializeApp(config.demoOptions);
        await adapter.connectAuthEmulator(config.emulatorHost, config.authPort);
        await adapter.configureFunctions(config.functionsRegion);
        await adapter.connectFunctionsEmulator(
          config.emulatorHost,
          config.functionsPort,
        );
        await adapter.activateDebugAppCheck();
        return FirebaseInitializationResult(
          services: adapter.services(),
          initialized: true,
        );
      case FirebaseRuntimeTarget.devCloud:
        final options = config.options;
        if (options == null) {
          throw StateError('Dev Firebase options are required.');
        }

        await adapter.initializeApp(options);
        await adapter.activateDebugAppCheck();
        await adapter.configureFunctions(config.functionsRegion);
        return FirebaseInitializationResult(
          services: adapter.services(),
          initialized: true,
        );
    }
  }
}
