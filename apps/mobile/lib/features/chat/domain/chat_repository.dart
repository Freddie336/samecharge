import 'chat_models.dart';

abstract class ChatRepository {
  Future<List<ChatMatchSummary>> loadMatches();

  Future<List<ChatMessage>> loadMessages(String matchId);

  Future<SendChatMessageResult> sendMessage({
    required String matchId,
    required String clientMessageId,
    required String text,
  });

  Future<void> markMatchRead(String matchId);

  Future<void> setMatchMuted({required String matchId, required bool muted});
}
