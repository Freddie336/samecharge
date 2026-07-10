class ChatPhotoRef {
  const ChatPhotoRef({required this.photoId});

  final String photoId;
}

class ChatMatchSummary {
  const ChatMatchSummary({
    required this.matchId,
    required this.counterpartUserId,
    required this.status,
    required this.messagingEnabled,
    required this.blocked,
    required this.counterpartDisplayName,
    required this.counterpartAge,
    required this.photoRefs,
    required this.unreadCount,
    required this.muted,
    this.lastMessagePreview,
    this.lastMessageAt,
  });

  final String matchId;
  final String counterpartUserId;
  final String status;
  final bool messagingEnabled;
  final bool blocked;
  final String counterpartDisplayName;
  final int? counterpartAge;
  final List<ChatPhotoRef> photoRefs;
  final String? lastMessagePreview;
  final DateTime? lastMessageAt;
  final int unreadCount;
  final bool muted;

  bool get canSend =>
      status == 'active' && messagingEnabled && blocked == false;
}

class ChatMessage {
  const ChatMessage({
    required this.messageId,
    required this.senderId,
    required this.text,
    required this.createdAt,
    required this.isMine,
    required this.pending,
  });

  final String messageId;
  final String senderId;
  final String text;
  final DateTime createdAt;
  final bool isMine;
  final bool pending;
}

class SendChatMessageResult {
  const SendChatMessageResult({
    required this.messageId,
    required this.createdAt,
    required this.text,
  });

  final String messageId;
  final DateTime createdAt;
  final String text;
}
