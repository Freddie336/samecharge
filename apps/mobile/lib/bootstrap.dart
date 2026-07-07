import 'package:flutter/widgets.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'bootstrap_failure_app.dart';
import 'app/samecharge_app.dart';
import 'core/config/app_config.dart';
import 'core/config/app_environment.dart';
import 'core/firebase/firebase_initializer.dart';
import 'core/firebase/firebase_services.dart';

Future<void> bootstrap(
  AppEnvironment environment, {
  FirebaseOptions? devCloudOptions,
  FirebaseInitializer? firebaseInitializer,
}) async {
  WidgetsFlutterBinding.ensureInitialized();

  final config = AppConfig.forEnvironment(
    environment,
    devCloudOptions: devCloudOptions,
  );
  final initializer =
      firebaseInitializer ??
      FirebaseInitializer(adapter: FirebaseSdkBootstrapAdapter());

  try {
    final firebaseResult = await initializer.initialize(config.firebase);

    runApp(
      ProviderScope(
        overrides: [
          appConfigProvider.overrideWithValue(config),
          firebaseServicesProvider.overrideWithValue(firebaseResult.services),
        ],
        child: const SameChargeApp(),
      ),
    );
  } catch (_) {
    runApp(
      BootstrapFailureApp(
        onRetry: () => bootstrap(
          environment,
          devCloudOptions: devCloudOptions,
          firebaseInitializer: firebaseInitializer,
        ),
      ),
    );
  }
}
