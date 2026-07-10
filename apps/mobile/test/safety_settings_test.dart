import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:samecharge/core/errors/app_failure.dart';
import 'package:samecharge/features/safety/data/callable_safety_repository.dart';
import 'package:samecharge/features/safety/domain/safety_repository.dart';
import 'package:samecharge/features/safety/presentation/safety_settings_screen.dart';

class FakeSafetyRepository implements SafetyRepository {
  FakeSafetyRepository({this.deletionError});

  final String? deletionError;
  int deletionCalls = 0;

  @override
  Future<void> blockUser({
    required String targetUserId,
    required String matchId,
    String? reason,
  }) async {}

  @override
  Future<void> reportContent({
    required String reportToken,
    required String targetType,
    required String targetId,
    String? matchId,
    required String category,
    String? description,
  }) async {}

  @override
  Future<void> requestAccountDeletion({
    required String confirmation,
    String? reauthenticationToken,
  }) async {
    deletionCalls += 1;
    if (deletionError != null) {
      throw AppFailure(deletionError!);
    }
  }

  @override
  Future<void> unmatchUser(String matchId) async {}
}

void main() {
  testWidgets('account deletion confirmation validates exact text', (
    tester,
  ) async {
    final repo = FakeSafetyRepository();
    await tester.pumpWidget(_harness(repo));
    await tester.tap(find.text('Request account deletion'));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byKey(const Key('delete-confirmation-field')),
      'DELETE',
    );
    await tester.tap(find.byKey(const Key('confirm-delete-account-button')));
    await tester.pumpAndSettle();

    expect(repo.deletionCalls, 0);
    expect(find.text('Type the confirmation exactly.'), findsOneWidget);
  });

  testWidgets('account deletion success shows safe pending state', (
    tester,
  ) async {
    final repo = FakeSafetyRepository();
    await tester.pumpWidget(_harness(repo));
    await tester.tap(find.text('Request account deletion'));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byKey(const Key('delete-confirmation-field')),
      'DELETE_MY_ACCOUNT',
    );
    await tester.tap(find.byKey(const Key('confirm-delete-account-button')));
    await tester.pumpAndSettle();

    expect(repo.deletionCalls, 1);
    expect(find.byKey(const Key('safety-success')), findsOneWidget);
  });

  testWidgets('reauthentication required state is safe and actionable', (
    tester,
  ) async {
    final repo = FakeSafetyRepository(
      deletionError: 'Please sign in again before deleting your account.',
    );
    await tester.pumpWidget(_harness(repo));
    await tester.tap(find.text('Request account deletion'));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byKey(const Key('delete-confirmation-field')),
      'DELETE_MY_ACCOUNT',
    );
    await tester.tap(find.byKey(const Key('confirm-delete-account-button')));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('safety-error')), findsOneWidget);
    expect(find.byKey(const Key('reauthentication-help')), findsOneWidget);
    expect(find.textContaining('erased'), findsNothing);
  });

  testWidgets(
    'account deletion dialog is safe on small screens with large text',
    (tester) async {
      await _setSmallScreen(tester);
      await tester.pumpWidget(_harness(FakeSafetyRepository(), textScale: 1.8));
      await tester.tap(find.text('Request account deletion'));
      await tester.pumpAndSettle();

      expect(
        find.byKey(const Key('delete-confirmation-field')),
        findsOneWidget,
      );
      expect(
        find.byKey(const Key('confirm-delete-account-button')),
        findsOneWidget,
      );
      expect(find.textContaining('device/cache'), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );
}

Widget _harness(FakeSafetyRepository repo, {double textScale = 1}) {
  return ProviderScope(
    overrides: [safetyRepositoryProvider.overrideWithValue(repo)],
    child: MaterialApp(
      builder: (context, child) => MediaQuery(
        data: MediaQuery.of(
          context,
        ).copyWith(textScaler: TextScaler.linear(textScale)),
        child: child!,
      ),
      home: const Scaffold(body: SafetySettingsScreen()),
    ),
  );
}

Future<void> _setSmallScreen(WidgetTester tester) async {
  tester.view.physicalSize = const Size(320, 568);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
}
