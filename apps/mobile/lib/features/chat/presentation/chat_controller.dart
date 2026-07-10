import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/errors/app_failure.dart';
import '../../safety/data/callable_safety_repository.dart';
import '../../safety/domain/safety_repository.dart';
import '../data/firestore_chat_repository.dart';
import '../domain/chat_models.dart';
import '../domain/chat_repository.dart';

final chatControllerProvider = NotifierProvider<ChatController, ChatUiState>(
  ChatController.new,
);

class ChatUiState {
  const ChatUiState({
    this.matches = const [],
    this.messages = const [],
    this.loadingMatches = false,
    this.loadingMessages = false,
    this.sending = false,
    this.errorMessage,
    this.activeMatch,
    this.pendingClientMessageId,
  });

  final List<ChatMatchSummary> matches;
  final List<ChatMessage> messages;
  final bool loadingMatches;
  final bool loadingMessages;
  final bool sending;
  final String? errorMessage;
  final ChatMatchSummary? activeMatch;
  final String? pendingClientMessageId;

  bool get matchListEmpty => !loadingMatches && matches.isEmpty;

  bool get canSend => activeMatch?.canSend == true && !sending;

  ChatUiState copyWith({
    List<ChatMatchSummary>? matches,
    List<ChatMessage>? messages,
    bool? loadingMatches,
    bool? loadingMessages,
    bool? sending,
    String? errorMessage,
    bool clearError = false,
    ChatMatchSummary? activeMatch,
    bool clearActiveMatch = false,
    String? pendingClientMessageId,
    bool clearPendingClientMessageId = false,
  }) {
    return ChatUiState(
      matches: matches ?? this.matches,
      messages: messages ?? this.messages,
      loadingMatches: loadingMatches ?? this.loadingMatches,
      loadingMessages: loadingMessages ?? this.loadingMessages,
      sending: sending ?? this.sending,
      errorMessage: clearError ? null : errorMessage ?? this.errorMessage,
      activeMatch: clearActiveMatch ? null : activeMatch ?? this.activeMatch,
      pendingClientMessageId: clearPendingClientMessageId
          ? null
          : pendingClientMessageId ?? this.pendingClientMessageId,
    );
  }
}

class ChatController extends Notifier<ChatUiState> {
  late final ChatRepository _repository;
  late final SafetyRepository _safetyRepository;
  int _clientMessageCounter = 0;

  @override
  ChatUiState build() {
    _repository = ref.watch(chatRepositoryProvider);
    _safetyRepository = ref.watch(safetyRepositoryProvider);
    return const ChatUiState();
  }

  Future<void> loadMatches() async {
    if (state.loadingMatches) {
      return;
    }

    state = state.copyWith(loadingMatches: true, clearError: true);
    try {
      final matches = await _repository.loadMatches();
      state = state.copyWith(
        matches: matches,
        loadingMatches: false,
        clearError: true,
      );
    } on AppFailure catch (error) {
      state = state.copyWith(
        loadingMatches: false,
        errorMessage: error.message,
      );
    }
  }

  Future<void> openMatch(ChatMatchSummary match) async {
    state = state.copyWith(
      activeMatch: match,
      loadingMessages: true,
      messages: const [],
      clearError: true,
    );

    try {
      await _repository.markMatchRead(match.matchId);
      final messages = await _repository.loadMessages(match.matchId);
      final updatedMatches = state.matches
          .map((item) {
            if (item.matchId != match.matchId) {
              return item;
            }

            return ChatMatchSummary(
              matchId: item.matchId,
              counterpartUserId: item.counterpartUserId,
              status: item.status,
              messagingEnabled: item.messagingEnabled,
              blocked: item.blocked,
              counterpartDisplayName: item.counterpartDisplayName,
              counterpartAge: item.counterpartAge,
              photoRefs: item.photoRefs,
              unreadCount: 0,
              muted: item.muted,
              lastMessagePreview: item.lastMessagePreview,
              lastMessageAt: item.lastMessageAt,
            );
          })
          .toList(growable: false);
      state = state.copyWith(
        matches: updatedMatches,
        messages: messages,
        loadingMessages: false,
        clearError: true,
      );
    } on AppFailure catch (error) {
      state = state.copyWith(
        loadingMessages: false,
        errorMessage: error.message,
      );
    }
  }

  void closeMatch() {
    state = state.copyWith(
      messages: const [],
      clearActiveMatch: true,
      clearError: true,
    );
  }

  Future<bool> sendText(String text) async {
    final match = state.activeMatch;
    final trimmed = text.trim();
    if (match == null || trimmed.isEmpty || !state.canSend) {
      return false;
    }

    final clientMessageId =
        state.pendingClientMessageId ?? _nextClientMessageId();
    state = state.copyWith(
      sending: true,
      pendingClientMessageId: clientMessageId,
      clearError: true,
    );

    try {
      final result = await _repository.sendMessage(
        matchId: match.matchId,
        clientMessageId: clientMessageId,
        text: text,
      );
      final confirmed = ChatMessage(
        messageId: result.messageId,
        senderId: 'me',
        text: result.text,
        createdAt: result.createdAt,
        isMine: true,
        pending: false,
      );
      final updatedMatch = ChatMatchSummary(
        matchId: match.matchId,
        counterpartUserId: match.counterpartUserId,
        status: match.status,
        messagingEnabled: match.messagingEnabled,
        blocked: match.blocked,
        counterpartDisplayName: match.counterpartDisplayName,
        counterpartAge: match.counterpartAge,
        photoRefs: match.photoRefs,
        unreadCount: match.unreadCount,
        muted: match.muted,
        lastMessagePreview: result.text,
        lastMessageAt: result.createdAt,
      );

      state = state.copyWith(
        activeMatch: updatedMatch,
        messages: [...state.messages, confirmed],
        sending: false,
        clearPendingClientMessageId: true,
        clearError: true,
      );
      await loadMatches();
      return true;
    } on AppFailure catch (error) {
      state = state.copyWith(sending: false, errorMessage: error.message);
      return false;
    }
  }

  Future<void> toggleMute() async {
    final match = state.activeMatch;
    if (match == null) {
      return;
    }

    final muted = !match.muted;
    try {
      await _repository.setMatchMuted(matchId: match.matchId, muted: muted);
      final updated = ChatMatchSummary(
        matchId: match.matchId,
        counterpartUserId: match.counterpartUserId,
        status: match.status,
        messagingEnabled: match.messagingEnabled,
        blocked: match.blocked,
        counterpartDisplayName: match.counterpartDisplayName,
        counterpartAge: match.counterpartAge,
        photoRefs: match.photoRefs,
        unreadCount: match.unreadCount,
        muted: muted,
        lastMessagePreview: match.lastMessagePreview,
        lastMessageAt: match.lastMessageAt,
      );
      state = state.copyWith(activeMatch: updated, clearError: true);
    } on AppFailure catch (error) {
      state = state.copyWith(errorMessage: error.message);
    }
  }

  Future<void> reportActiveMatch({String? description}) async {
    final match = state.activeMatch;
    if (match == null) {
      return;
    }

    try {
      await _safetyRepository.reportContent(
        reportToken: reportTokenForMatch(match.matchId),
        targetType: 'user',
        targetId: match.counterpartUserId,
        matchId: match.matchId,
        category: 'harassment',
        description: description,
      );
      state = state.copyWith(clearError: true);
    } on AppFailure catch (error) {
      state = state.copyWith(errorMessage: error.message);
    }
  }

  Future<void> reportMessage(ChatMessage message) async {
    final match = state.activeMatch;
    if (match == null) {
      return;
    }

    try {
      await _safetyRepository.reportContent(
        reportToken: reportTokenForMessage(match.matchId, message.messageId),
        targetType: 'message',
        targetId: message.messageId,
        matchId: match.matchId,
        category: 'harassment',
      );
      state = state.copyWith(clearError: true);
    } on AppFailure catch (error) {
      state = state.copyWith(errorMessage: error.message);
    }
  }

  Future<void> blockActiveMatch() async {
    final match = state.activeMatch;
    if (match == null) {
      return;
    }

    try {
      await _safetyRepository.blockUser(
        targetUserId: match.counterpartUserId,
        matchId: match.matchId,
        reason: 'safety',
      );
      _replaceActiveMatch(_closedMatch(match, status: 'blocked'));
      await loadMatches();
    } on AppFailure catch (error) {
      state = state.copyWith(errorMessage: error.message);
    }
  }

  Future<void> unmatchActiveMatch() async {
    final match = state.activeMatch;
    if (match == null) {
      return;
    }

    try {
      await _safetyRepository.unmatchUser(match.matchId);
      _replaceActiveMatch(_closedMatch(match, status: 'unmatched'));
      await loadMatches();
    } on AppFailure catch (error) {
      state = state.copyWith(errorMessage: error.message);
    }
  }

  String _nextClientMessageId() {
    _clientMessageCounter += 1;
    return 'msg-${DateTime.now().microsecondsSinceEpoch}-$_clientMessageCounter';
  }

  void _replaceActiveMatch(ChatMatchSummary updated) {
    state = state.copyWith(
      activeMatch: updated,
      matches: state.matches
          .map((match) => match.matchId == updated.matchId ? updated : match)
          .toList(growable: false),
      clearError: true,
    );
  }

  ChatMatchSummary _closedMatch(
    ChatMatchSummary match, {
    required String status,
  }) {
    return ChatMatchSummary(
      matchId: match.matchId,
      counterpartUserId: match.counterpartUserId,
      status: status,
      messagingEnabled: false,
      blocked: status == 'blocked' || match.blocked,
      counterpartDisplayName: match.counterpartDisplayName,
      counterpartAge: match.counterpartAge,
      photoRefs: match.photoRefs,
      unreadCount: match.unreadCount,
      muted: match.muted,
      lastMessagePreview: match.lastMessagePreview,
      lastMessageAt: match.lastMessageAt,
    );
  }
}
