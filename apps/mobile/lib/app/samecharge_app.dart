import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/config/app_config.dart';
import '../core/theme/app_theme.dart';
import 'app_router.dart';

class SameChargeApp extends ConsumerWidget {
  const SameChargeApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final config = ref.watch(appConfigProvider);
    final router = ref.watch(appRouterProvider);

    return MaterialApp.router(
      title: config.displayName,
      theme: AppTheme.light,
      routerConfig: router,
      debugShowCheckedModeBanner: config.isDevelopment,
    );
  }
}
