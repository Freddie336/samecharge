import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:samecharge/features/discovery/data/callable_discovery_repository.dart';
import 'package:samecharge/features/discovery/domain/discovery_candidate.dart';
import 'package:samecharge/features/discovery/domain/discovery_repository.dart';
import 'package:samecharge/features/discovery/presentation/discovery_screen.dart';

class FakeDiscoveryRepository implements DiscoveryRepository {
  FakeDiscoveryRepository({
    required this.batch,
    List<DiscoveryDecisionResult>? results,
    this.startCompleter,
    this.submitCompleter,
  }) : results = QueueList(results ?? const [DiscoveryLiked()]);

  final DiscoveryBatch batch;
  final QueueList<DiscoveryDecisionResult> results;
  final Completer<void>? startCompleter;
  final Completer<void>? submitCompleter;
  int submitCalls = 0;

  @override
  Future<DiscoveryBatch> startDiscovery({
    int requestedRange = 3,
    int pageSize = 10,
  }) async {
    if (startCompleter != null) {
      await startCompleter!.future;
    }

    return batch;
  }

  @override
  Future<DiscoveryDecisionResult> submitDecision({
    required String candidateToken,
    required DiscoveryDecision decision,
  }) async {
    submitCalls += 1;
    if (submitCompleter != null) {
      await submitCompleter!.future;
    }

    return results.removeFirst();
  }
}

void main() {
  testWidgets('loading state uses safe beta copy', (tester) async {
    final completer = Completer<void>();
    final repo = FakeDiscoveryRepository(
      batch: _batch([]),
      startCompleter: completer,
    );

    await tester.pumpWidget(_harness(repo));
    await tester.pump();

    expect(find.byKey(const Key('discovery-loading-copy')), findsOneWidget);
    expect(find.textContaining('PlatformException'), findsNothing);
    completer.complete();
    await tester.pumpAndSettle();
  });

  testWidgets('candidate card renders sanitized DTO fields', (tester) async {
    final repo = FakeDiscoveryRepository(batch: _batch([_candidate()]));

    await tester.pumpWidget(_harness(repo));
    await tester.pump();
    await tester.pump();

    expect(find.text('Bob, 28'), findsOneWidget);
    expect(find.text('Istanbul'), findsOneWidget);
    expect(find.text('Safe Bob bio'), findsOneWidget);
    expect(find.text('music'), findsOneWidget);
    expect(find.text('Battery: 77% discharging'), findsOneWidget);
    expect(find.text('Difference: 0%'), findsOneWidget);
    expect(find.text('1 approved photo'), findsOneWidget);
    expect(find.textContaining('bob@example.invalid'), findsNothing);
    expect(find.textContaining('birthDate'), findsNothing);
  });

  testWidgets('like and pass buttons disable while decision submits', (
    tester,
  ) async {
    final completer = Completer<void>();
    final repo = FakeDiscoveryRepository(
      batch: _batch([_candidate()]),
      submitCompleter: completer,
    );

    await tester.pumpWidget(_harness(repo));
    await tester.pump();
    await tester.pump();
    await tester.tap(find.byKey(const Key('like-button')));
    await tester.pump();

    expect(repo.submitCalls, 1);
    expect(find.text('Sending'), findsOneWidget);
    expect(
      tester
          .widget<FilledButton>(find.byKey(const Key('like-button')))
          .onPressed,
      isNull,
    );
    expect(
      tester
          .widget<OutlinedButton>(find.byKey(const Key('pass-button')))
          .onPressed,
      isNull,
    );

    completer.complete();
    await tester.pumpAndSettle();
  });

  testWidgets('pass success advances to the next candidate', (tester) async {
    final repo = FakeDiscoveryRepository(
      batch: _batch([_candidate(), _candidate(displayName: 'Carol')]),
      results: const [DiscoveryPassed()],
    );

    await tester.pumpWidget(_harness(repo));
    await tester.pump();
    await tester.pump();
    await tester.tap(find.byKey(const Key('pass-button')));
    await tester.pumpAndSettle();

    expect(find.text('Carol, 28'), findsOneWidget);
    expect(repo.submitCalls, 1);
  });

  testWidgets('like success without match advances to empty state', (
    tester,
  ) async {
    final repo = FakeDiscoveryRepository(batch: _batch([_candidate()]));

    await tester.pumpWidget(_harness(repo));
    await tester.pump();
    await tester.pump();
    await tester.tap(find.byKey(const Key('like-button')));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('empty-discovery-title')), findsOneWidget);
  });

  testWidgets('match success shows safe match UI', (tester) async {
    final repo = FakeDiscoveryRepository(
      batch: _batch([_candidate()]),
      results: [
        DiscoveryMatched(
          matchId: 'pair-key',
          matchedAt: DateTime.utc(2026, 7, 10),
          match: const MatchPreview(
            displayName: 'Bob',
            age: 28,
            photoRefs: [CandidatePhotoRef(photoId: 'photo-bob')],
          ),
        ),
      ],
    );

    await tester.pumpWidget(_harness(repo));
    await tester.pump();
    await tester.pump();
    await tester.tap(find.byKey(const Key('like-button')));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('match-title')), findsOneWidget);
    expect(find.text('Bob, 28'), findsOneWidget);
    expect(find.textContaining('bob@example.invalid'), findsNothing);
  });

  testWidgets('expired token shows refresh state without submitting', (
    tester,
  ) async {
    final repo = FakeDiscoveryRepository(
      batch: _batch([
        _candidate(
          expiresAt: DateTime.now().toUtc().subtract(
            const Duration(seconds: 1),
          ),
        ),
      ]),
    );

    await tester.pumpWidget(_harness(repo));
    await tester.pump();
    await tester.pump();
    await tester.tap(find.byKey(const Key('like-button')));
    await tester.pump();

    expect(repo.submitCalls, 0);
    expect(find.byKey(const Key('refresh-discovery-button')), findsOneWidget);
    expect(find.byKey(const Key('discovery-error')), findsOneWidget);
  });

  testWidgets('controller does not submit twice while loading', (tester) async {
    final completer = Completer<void>();
    final repo = FakeDiscoveryRepository(
      batch: _batch([_candidate()]),
      submitCompleter: completer,
    );

    await tester.pumpWidget(_harness(repo));
    await tester.pump();
    await tester.pump();
    await tester.tap(find.byKey(const Key('like-button')));
    await tester.tap(find.byKey(const Key('like-button')));
    await tester.pump();

    expect(repo.submitCalls, 1);
    completer.complete();
    await tester.pumpAndSettle();
  });

  testWidgets('empty discovery is safe on small screens with large text', (
    tester,
  ) async {
    await _setSmallScreen(tester);
    final repo = FakeDiscoveryRepository(batch: _batch([]));

    await tester.pumpWidget(_harness(repo, textScale: 1.8));
    await tester.pump();
    await tester.pump();

    expect(find.byKey(const Key('empty-discovery-title')), findsOneWidget);
    expect(find.text('Search again'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}

Widget _harness(FakeDiscoveryRepository repo, {double textScale = 1}) {
  return ProviderScope(
    overrides: [discoveryRepositoryProvider.overrideWithValue(repo)],
    child: MaterialApp(
      builder: (context, child) => MediaQuery(
        data: MediaQuery.of(
          context,
        ).copyWith(textScaler: TextScaler.linear(textScale)),
        child: child!,
      ),
      home: const DiscoveryScreen(),
    ),
  );
}

DiscoveryBatch _batch(List<DiscoveryCandidate> candidates) {
  return DiscoveryBatch(
    candidates: candidates,
    expiresAt: DateTime.now().toUtc().add(const Duration(minutes: 5)),
  );
}

DiscoveryCandidate _candidate({
  String displayName = 'Bob',
  DateTime? expiresAt,
}) {
  return DiscoveryCandidate(
    candidateToken: 'token-${displayName.toLowerCase()}',
    displayName: displayName,
    age: 28,
    cityLabel: 'Istanbul',
    bio: 'Safe Bob bio',
    interests: const ['music', 'coffee'],
    photoRefs: const [CandidatePhotoRef(photoId: 'photo-bob')],
    batteryLabel: '77% discharging',
    batteryDifference: 0,
    expiresAt:
        expiresAt ?? DateTime.now().toUtc().add(const Duration(minutes: 5)),
  );
}

class QueueList<T> {
  QueueList(Iterable<T> values) : _values = List<T>.of(values);

  final List<T> _values;

  T removeFirst() => _values.removeAt(0);
}

Future<void> _setSmallScreen(WidgetTester tester) async {
  tester.view.physicalSize = const Size(320, 568);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
}
