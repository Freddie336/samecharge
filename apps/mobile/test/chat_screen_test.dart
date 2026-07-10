import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:samecharge/features/chat/data/firestore_chat_repository.dart';
import 'package:samecharge/features/chat/domain/chat_models.dart';
import 'package:samecharge/features/chat/domain/chat_repository.dart';
import 'package:samecharge/features/chat/presentation/chat_home_screen.dart';

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
}

Widget _harness(FakeChatRepository repo) {
  return ProviderScope(
    overrides: [chatRepositoryProvider.overrideWithValue(repo)],
    child: const MaterialApp(home: Scaffold(body: ChatScreen())),
  );
}

ChatMatchSummary _match({
  int unreadCount = 0,
  bool muted = false,
  bool messagingEnabled = true,
}) {
  return ChatMatchSummary(
    matchId: 'match-1',
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
