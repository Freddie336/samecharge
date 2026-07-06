import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:samecharge/app/samecharge_app.dart';
import 'package:samecharge/core/config/app_config.dart';
import 'package:samecharge/core/config/app_environment.dart';

void main() {
  testWidgets('router navigates from splash to walkthrough and back', (
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
    expect(find.text('SameCharge'), findsOneWidget);

    await tester.tap(find.text('Open walkthrough placeholder'));
    await tester.pumpAndSettle();

    expect(find.text('SameCharge walkthrough'), findsOneWidget);

    await tester.tap(find.text('Return to splash'));
    await tester.pumpAndSettle();

    expect(find.text('Infrastructure ready'), findsOneWidget);
  });
}
