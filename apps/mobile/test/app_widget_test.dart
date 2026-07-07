import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:samecharge/app/samecharge_app.dart';
import 'package:samecharge/core/config/app_config.dart';
import 'package:samecharge/core/config/app_environment.dart';

void main() {
  testWidgets('dev app renders the emulator infrastructure splash', (
    tester,
  ) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          appConfigProvider.overrideWithValue(
            AppConfig.forEnvironment(AppEnvironment.dev),
          ),
        ],
        child: const SameChargeApp(),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('Infrastructure ready'), findsOneWidget);
    expect(find.text('Environment: DEV'), findsOneWidget);
    expect(find.text('Firebase emulator configured'), findsOneWidget);
  });

  testWidgets('prod app renders Firebase disabled splash', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          appConfigProvider.overrideWithValue(
            AppConfig.forEnvironment(AppEnvironment.prod),
          ),
        ],
        child: const SameChargeApp(),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('Infrastructure ready'), findsOneWidget);
    expect(find.text('Environment: PROD'), findsOneWidget);
    expect(find.text('Firebase disabled'), findsOneWidget);
  });
}
