import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app/samecharge_app.dart';
import 'core/config/app_config.dart';
import 'core/config/app_environment.dart';

Future<void> bootstrap(AppEnvironment environment) async {
  WidgetsFlutterBinding.ensureInitialized();

  final config = AppConfig.forEnvironment(environment);

  runApp(
    ProviderScope(
      overrides: [appConfigProvider.overrideWithValue(config)],
      child: const SameChargeApp(),
    ),
  );
}
