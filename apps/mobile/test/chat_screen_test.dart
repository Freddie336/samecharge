import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:samecharge/features/chat/data/firestore_chat_repository.dart';
import 'package:samecharge/features/chat/domain/chat_models.dart';
import 'package:samecharge/features/chat/domain/chat_repository.dart';
import 'package:samecharge/features/chat/presentation/chat_home_screen.dart';
import 'package:samecharge/features/safety/data/callable_safety_repository.dart';
import 'package:samecharge/features/safety/domain/safety_repository.dart';

class FakeChatRepository implements ChatRepository {
  FakeChatRepository({
    this.matches = const [],
    this.messages = const [],
    this.loadError,
    this.sendCompleter,
  });

  final List<ChatMatchSummary> matches;
  final List<ChatMessage> messages;
  final String? loadError;
  final Completer<void>? sendCompleter;
  int loadMatchesCalls = 0;
  int markReadCalls = 0;
  int sendCalls = 0;
  int muteCalls = 0;

  @override
  Future<List<ChatMatchSummary>> loadMatches() async {
    loadMatchesCalls += 1;
    if (loadError != null) {
      throw TestFailure(loadError!);
    }

    return matches;
  }

  @override
  Future<List<ChatMessage>> loadMessages(String matchId) async {
    return messages;
  }

  @override
  Future<void> markMatchRead(String matchId) async {
    markReadCalls += 1;
  }

  @override
  Future<SendChatMessageResult> sendMessage({
    required String matchId,
    required String clientMessageId,
    required String text,
  }) async {
    sendCalls += 1;
    if (sendCompleter != null) {
      await sendCompleter!.future;
    }

    return SendChatMessageResult(
      messageId: 'message-$sendCalls',
      createdAt: DateTime.utc(2026, 7, 10, 10, sendCalls),
      text: text.trim(),
    );
  }

  @override
  Future<void> setMatchMuted({
    required String matchId,
    required bool muted,
  }) async {
    muteCalls += 1;
  }
}

class TestFailure implements Exception {
  const TestFailure(this.message);

  final String message;
}

class FakeSafetyRepository implements SafetyRepository {
  int reportCalls = 0;
  int blockCalls = 0;
  int unmatchCalls = 0;
  int deletionCalls = 0;
  String? lastReportDescription;

  @override
  Future<void> blockUser({
    required String targetUserId,
    required String matchId,
    String? reason,
  }) async {
    blockCalls += 1;
  }

  @override
  Future<void> reportContent({
    required String reportToken,
    required String targetType,
    required String targetId,
    String? matchId,
    required String category,
    String? description,
  }) async {
    reportCalls += 1;
    lastReportDescription = description;
  }

  @override
  Future<void> requestAccountDeletion({
    required String confirmation,
    String? reauthenticationToken,
  }) async {
    deletionCalls += 1;
  }

  @override
  Future<void> unmatchUser(String matchId) async {
    unmatchCalls += 1;
  }
}

void main() {
  testWidgets('match list renders empty state', (tester) async {
    await tester.pumpWidget(_harness(FakeChatRepository()));
    await tester.pump();
    await tester.pump();

    expect(find.byKey(const Key('empty-matches-title')), findsOneWidget);
  });

  testWidgets('match card renders sanitized data, unread and muted state', (
    tester,
  ) async {
    await tester.pumpWidget(
      _harness(
        FakeChatRepository(matches: [_match(unreadCount: 3, muted: true)]),
      ),
    );
    await tester.pump();
    await tester.pump();

    expect(find.text('Bob, 28'), findsOneWidget);
    expect(find.text('Merhaba'), findsOneWidget);
    expect(find.text('3'), findsOneWidget);
    expect(find.byIcon(Icons.notifications_off), findsOneWidget);
    expect(find.textContaining('bob@example.invalid'), findsNothing);
    expect(find.textContaining('birthDate'), findsNothing);
  });

  testWidgets('chat screen renders messages and marks read on open', (
    tester,
  ) async {
    final repo = FakeChatRepository(
      matches: [_match(unreadCount: 2)],
      messages: [
        _message(text: 'Hi'),
        _message(text: 'Hello', mine: true),
      ],
    );

    await tester.pumpWidget(_harness(repo));
    await tester.pump();
    await tester.pump();
    await tester.tap(find.byKey(const Key('match-match-1')));
    await tester.pump();
    await tester.pump();

    expect(repo.markReadCalls, 1);
    expect(find.text('Hi'), findsOneWidget);
    expect(find.text('Hello'), findsOneWidget);
  });

  testWidgets('empty conversation state is safe and non-technical', (
    tester,
  ) async {
    await tester.pumpWidget(_harness(FakeChatRepository(matches: [_match()])));
    await tester.pump();
    await tester.pump();
    await tester.tap(find.byKey(const Key('match-match-1')));
    await tester.pump();
    await tester.pump();

    expect(find.byKey(const Key('empty-conversation-title')), findsOneWidget);
    expect(find.textContaining('Firestore'), findsNothing);
  });

  testWidgets('send button is disabled for empty text', (tester) async {
    await tester.pumpWidget(_harness(FakeChatRepository(matches: [_match()])));
    await tester.pump();
    await tester.pump();
    await tester.tap(find.byKey(const Key('match-match-1')));
    await tester.pump();
    await tester.pump();

    final button = tester.widget<IconButton>(
      find.byKey(const Key('send-message-button')),
    );
    expect(button.onPressed, isNull);
  });

  testWidgets('send loading prevents double submit', (tester) async {
    final completer = Completer<void>();
    final repo = FakeChatRepository(
      matches: [_match()],
      sendCompleter: completer,
    );

    await tester.pumpWidget(_harness(repo));
    await tester.pump();
    await tester.pump();
    await tester.tap(find.byKey(const Key('match-match-1')));
    await tester.pump();
    await tester.enterText(find.byKey(const Key('message-composer')), 'Hello');
    await tester.pump();
    await tester.tap(find.byKey(const Key('send-message-button')));
    await tester.pump();
    await tester.tap(find.byKey(const Key('send-message-button')));
    await tester.pump();

    expect(repo.sendCalls, 1);
    completer.complete();
    await tester.pumpAndSettle();
  });

  testWidgets('successful send clears composer and shows message', (
    tester,
  ) async {
    await tester.pumpWidget(_harness(FakeChatRepository(matches: [_match()])));
    await tester.pump();
    await tester.pump();
    await tester.tap(find.byKey(const Key('match-match-1')));
    await tester.pump();
    await tester.enterText(find.byKey(const Key('message-composer')), 'Hello');
    await tester.pump();
    await tester.tap(find.byKey(const Key('send-message-button')));
    await tester.pumpAndSettle();

    expect(find.text('Hello'), findsOneWidget);
    expect(
      tester
          .widget<TextField>(find.byKey(const Key('message-composer')))
          .controller
          ?.text,
      '',
    );
  });

  testWidgets('messaging disabled state disables input', (tester) async {
    await tester.pumpWidget(
      _harness(FakeChatRepository(matches: [_match(messagingEnabled: false)])),
    );
    await tester.pump();
    await tester.pump();
    await tester.tap(find.byKey(const Key('match-match-1')));
    await tester.pump();
    await tester.pump();

    expect(find.text('Messaging is disabled for this match.'), findsWidgets);
    expect(
      tester
          .widget<TextField>(find.byKey(const Key('message-composer')))
          .enabled,
      isFalse,
    );
  });

  testWidgets('report dialog sends safe description', (tester) async {
    final safety = FakeSafetyRepository();
    await tester.pumpWidget(
      _harness(FakeChatRepository(matches: [_match()]), safety: safety),
    );
    await tester.pump();
    await tester.pump();
    await tester.tap(find.byKey(const Key('match-match-1')));
    await tester.pump();
    await tester.pump();
    await tester.tap(find.byKey(const Key('chat-safety-menu-button')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('report-user-menu-item')));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byKey(const Key('report-description-field')),
      'Please review',
    );
    await tester.tap(find.byKey(const Key('submit-report-button')));
    await tester.pumpAndSettle();

    expect(safety.reportCalls, 1);
    expect(safety.lastReportDescription, 'Please review');
  });

  testWidgets('report dialog remains usable on small screens with large text', (
    tester,
  ) async {
    await _setSmallScreen(tester);
    await tester.pumpWidget(
      _harness(FakeChatRepository(matches: [_match()]), textScale: 1.8),
    );
    await tester.pump();
    await tester.pump();
    await tester.tap(find.byKey(const Key('match-match-1')));
    await tester.pump();
    await tester.pump();
    await tester.tap(find.byKey(const Key('chat-safety-menu-button')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('report-user-menu-item')));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('report-description-field')), findsOneWidget);
    expect(find.byKey(const Key('submit-report-button')), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('block confirmation disables input after success', (
    tester,
  ) async {
    final safety = FakeSafetyRepository();
    await tester.pumpWidget(
      _harness(FakeChatRepository(matches: [_match()]), safety: safety),
    );
    await tester.pump();
    await tester.pump();
    await tester.tap(find.byKey(const Key('match-match-1')));
    await tester.pump();
    await tester.pump();
    await tester.tap(find.byKey(const Key('chat-safety-menu-button')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('block-user-menu-item')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('confirm-block-button')));
    await tester.pumpAndSettle();

    expect(safety.blockCalls, 1);
    expect(find.text('This match is no longer active.'), findsWidgets);
    expect(
      tester
          .widget<TextField>(find.byKey(const Key('message-composer')))
          .enabled,
      isFalse,
    );
  });

  testWidgets('unmatch confirmation disables input without blocking', (
    tester,
  ) async {
    final safety = FakeSafetyRepository();
    await tester.pumpWidget(
      _harness(FakeChatRepository(matches: [_match()]), safety: safety),
    );
    await tester.pump();
    await tester.pump();
    await tester.tap(find.byKey(const Key('match-match-1')));
    await tester.pump();
    await tester.pump();
    await tester.tap(find.byKey(const Key('chat-safety-menu-button')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('unmatch-user-menu-item')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('confirm-unmatch-button')));
    await tester.pumpAndSettle();

    expect(safety.unmatchCalls, 1);
    expect(safety.blockCalls, 0);
    expect(
      tester
          .widget<TextField>(find.byKey(const Key('message-composer')))
          .enabled,
      isFalse,
    );
  });
}

Widget _harness(
  FakeChatRepository repo, {
  FakeSafetyRepository? safety,
  double textScale = 1,
}) {
  return ProviderScope(
    overrides: [
      chatRepositoryProvider.overrideWithValue(repo),
      safetyRepositoryProvider.overrideWithValue(
        safety ?? FakeSafetyRepository(),
      ),
    ],
    child: MaterialApp(
      builder: (context, child) => MediaQuery(
        data: MediaQuery.of(
          context,
        ).copyWith(textScaler: TextScaler.linear(textScale)),
        child: child!,
      ),
      home: const Scaffold(body: ChatScreen()),
    ),
  );
}

ChatMatchSummary _match({
  int unreadCount = 0,
  bool muted = false,
  bool messagingEnabled = true,
}) {
  return ChatMatchSummary(
    matchId: 'match-1',
    counterpartUserId: 'bob',
    status: 'active',
    messagingEnabled: messagingEnabled,
    blocked: false,
    counterpartDisplayName: 'Bob',
    counterpartAge: 28,
    photoRefs: const [ChatPhotoRef(photoId: 'photo-bob')],
    unreadCount: unreadCount,
    muted: muted,
    lastMessagePreview: 'Merhaba',
    lastMessageAt: DateTime.utc(2026, 7, 10),
  );
}

ChatMessage _message({required String text, bool mine = false}) {
  return ChatMessage(
    messageId: text,
    senderId: mine ? 'alice' : 'bob',
    text: text,
    createdAt: DateTime.utc(2026, 7, 10),
    isMine: mine,
    pending: false,
  );
}

Future<void> _setSmallScreen(WidgetTester tester) async {
  tester.view.physicalSize = const Size(320, 568);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
}
