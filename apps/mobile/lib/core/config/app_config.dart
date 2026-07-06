import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app_environment.dart';

class AppConfig {
  const AppConfig({
    required this.environment,
    required this.displayName,
    required this.isFirebaseConfigured,
  });

  factory AppConfig.forEnvironment(AppEnvironment environment) {
    return switch (environment) {
      AppEnvironment.dev => const AppConfig(
        environment: AppEnvironment.dev,
        displayName: 'SameCharge Dev',
        isFirebaseConfigured: false,
      ),
      AppEnvironment.prod => const AppConfig(
        environment: AppEnvironment.prod,
        displayName: 'SameCharge',
        isFirebaseConfigured: false,
      ),
    };
  }

  final AppEnvironment environment;
  final String displayName;
  final bool isFirebaseConfigured;

  bool get isDevelopment => environment.isDevelopment;
}

final appConfigProvider = Provider<AppConfig>((ref) {
  throw StateError('AppConfig must be provided at bootstrap.');
});
