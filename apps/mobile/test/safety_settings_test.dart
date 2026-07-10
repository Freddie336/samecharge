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
}

Widget _harness(FakeSafetyRepository repo) {
  return ProviderScope(
    overrides: [safetyRepositoryProvider.overrideWithValue(repo)],
    child: const MaterialApp(home: Scaffold(body: SafetySettingsScreen())),
  );
}
