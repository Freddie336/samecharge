import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/errors/app_failure.dart';
import '../../../core/firebase/firebase_services.dart';
import '../../auth/data/firebase_auth_repository.dart';
import '../domain/chat_models.dart';
import '../domain/chat_repository.dart';

const sendMessageCallableName = 'sendMessage';
const markMatchReadCallableName = 'markMatchRead';
const setMatchMutedCallableName = 'setMatchMuted';

final chatRepositoryProvider = Provider<ChatRepository>((ref) {
  final services = ref.watch(firebaseServicesProvider);
  final firestore = services.firestore;
  final functions = services.functions;
  if (firestore == null || functions == null) {
    return const DisabledChatRepository();
  }

  return FirestoreChatRepository(
    firestore,
    functions,
    () => ref.read(authRepositoryProvider).currentUser()?.uid,
  );
});

class DisabledChatRepository implements ChatRepository {
  const DisabledChatRepository();

  @override
  Future<List<ChatMatchSummary>> loadMatches() {
    throw const AppFailure('Chat connection is unavailable.');
  }

  @override
  Future<List<ChatMessage>> loadMessages(String matchId) {
    throw const AppFailure('Chat connection is unavailable.');
  }

  @override
  Future<SendChatMessageResult> sendMessage({
    required String matchId,
    required String clientMessageId,
    required String text,
  }) {
    throw const AppFailure('Chat connection is unavailable.');
  }

  @override
  Future<void> markMatchRead(String matchId) {
    throw const AppFailure('Chat connection is unavailable.');
  }

  @override
  Future<void> setMatchMuted({required String matchId, required bool muted}) {
    throw const AppFailure('Chat connection is unavailable.');
  }
}

class FirestoreChatRepository implements ChatRepository {
  const FirestoreChatRepository(
    this._firestore,
    this._functions,
    this._currentUid,
  );

  final FirebaseFirestore _firestore;
  final FirebaseFunctions _functions;
  final String? Function() _currentUid;

  @override
  Future<List<ChatMatchSummary>> loadMatches() async {
    final uid = _requireUid();
    try {
      final snapshot = await _firestore
          .collection('matches')
          .where('memberIds', arrayContains: uid)
          .get();
      final matches = snapshot.docs.map((doc) => _parseMatch(doc, uid)).toList()
        ..sort((left, right) {
          final leftTime = left.lastMessageAt;
          final rightTime = right.lastMessageAt;
          if (leftTime == null && rightTime == null) {
            return left.counterpartDisplayName.compareTo(
              right.counterpartDisplayName,
            );
          }
          if (leftTime == null) {
            return 1;
          }
          if (rightTime == null) {
            return -1;
          }
          return rightTime.compareTo(leftTime);
        });

      return matches;
    } on FirebaseException {
      throw const AppFailure('Matches could not be loaded.');
    }
  }

  @override
  Future<List<ChatMessage>> loadMessages(String matchId) async {
    final uid = _requireUid();
    try {
      final snapshot = await _firestore
          .collection('matches')
          .doc(matchId)
          .collection('messages')
          .orderBy('createdAt')
          .get();

      return snapshot.docs.map((doc) => _parseMessage(doc, uid)).toList();
    } on FirebaseException {
      throw const AppFailure('Messages could not be loaded.');
    }
  }

  @override
  Future<SendChatMessageResult> sendMessage({
    required String matchId,
    required String clientMessageId,
    required String text,
  }) async {
    try {
      final result = await _functions
          .httpsCallable(sendMessageCallableName)
          .call<Map<Object?, Object?>>({
            'matchId': matchId,
            'clientMessageId': clientMessageId,
            'text': text,
          });
      final data = Map<String, dynamic>.from(result.data);
      return SendChatMessageResult(
        messageId: data['messageId'] as String,
        createdAt: DateTime.parse(data['createdAt'] as String).toUtc(),
        text: data['text'] as String,
      );
    } on FirebaseFunctionsException catch (error) {
      throw AppFailure(_sendMessageText(error));
    }
  }

  @override
  Future<void> markMatchRead(String matchId) async {
    try {
      await _functions
          .httpsCallable(markMatchReadCallableName)
          .call<Map<Object?, Object?>>({'matchId': matchId});
    } on FirebaseFunctionsException {
      throw const AppFailure('Read state could not be updated.');
    }
  }

  @override
  Future<void> setMatchMuted({
    required String matchId,
    required bool muted,
  }) async {
    try {
      await _functions
          .httpsCallable(setMatchMutedCallableName)
          .call<Map<Object?, Object?>>({'matchId': matchId, 'muted': muted});
    } on FirebaseFunctionsException {
      throw const AppFailure('Mute preference could not be updated.');
    }
  }

  String _requireUid() {
    final uid = _currentUid();
    if (uid == null) {
      throw const AppFailure('Chat requires sign-in.');
    }

    return uid;
  }
}

ChatMatchSummary _parseMatch(
  QueryDocumentSnapshot<Map<String, dynamic>> doc,
  String uid,
) {
  final data = doc.data();
  final memberIds = (data['memberIds'] as List? ?? const [])
      .whereType<String>()
      .toList(growable: false);
  final otherUid = memberIds.firstWhere(
    (memberId) => memberId != uid,
    orElse: () => '',
  );
  final previews = data['memberPreviews'] is Map
      ? Map<String, dynamic>.from(data['memberPreviews'] as Map)
      : const <String, dynamic>{};
  final preview = previews[otherUid] is Map
      ? Map<String, dynamic>.from(previews[otherUid] as Map)
      : const <String, dynamic>{};
  final unreadCounts = data['unreadCounts'] is Map
      ? Map<String, dynamic>.from(data['unreadCounts'] as Map)
      : const <String, dynamic>{};
  final mutedBy = data['mutedBy'] is Map
      ? Map<String, dynamic>.from(data['mutedBy'] as Map)
      : const <String, dynamic>{};

  return ChatMatchSummary(
    matchId: doc.id,
    counterpartUserId: otherUid,
    status: data['status'] as String? ?? 'inactive',
    messagingEnabled: data['messagingEnabled'] == true,
    blocked: data['blockedBy'] != null,
    counterpartDisplayName: preview['displayName'] as String? ?? 'Match',
    counterpartAge: preview['age'] is int ? preview['age'] as int : null,
    photoRefs: _parsePhotoRefs(preview['photoRefs']),
    lastMessagePreview: data['lastMessagePreview'] as String?,
    lastMessageAt: _dateTimeFrom(data['lastMessageAt']),
    unreadCount: unreadCounts[uid] is int ? unreadCounts[uid] as int : 0,
    muted: mutedBy[uid] == true,
  );
}

ChatMessage _parseMessage(
  QueryDocumentSnapshot<Map<String, dynamic>> doc,
  String uid,
) {
  final data = doc.data();
  final senderId = data['senderId'] as String? ?? '';

  return ChatMessage(
    messageId: doc.id,
    senderId: senderId,
    text: data['text'] as String? ?? '',
    createdAt:
        _dateTimeFrom(data['createdAt']) ??
        DateTime.fromMillisecondsSinceEpoch(0, isUtc: true),
    isMine: senderId == uid,
    pending: false,
  );
}

List<ChatPhotoRef> _parsePhotoRefs(Object? value) {
  return (value as List? ?? const [])
      .whereType<Map>()
      .map((photo) {
        final data = Map<String, dynamic>.from(photo);
        return ChatPhotoRef(photoId: data['photoId'] as String);
      })
      .toList(growable: false);
}

DateTime? _dateTimeFrom(Object? value) {
  if (value is Timestamp) {
    return value.toDate().toUtc();
  }
  if (value is String) {
    return DateTime.tryParse(value)?.toUtc();
  }

  return null;
}

String _sendMessageText(FirebaseFunctionsException error) {
  final details = error.details;
  final code = details is Map ? details['code'] : null;

  return switch (code) {
    'input_invalid' => 'Enter a shorter text message.',
    'messaging_disabled' => 'Messaging is disabled for this match.',
    'match_not_active' => 'This match is no longer active.',
    'permission_denied' => 'This match is not available.',
    'already_exists' => 'This message could not be retried safely.',
    _ => 'Message could not be sent.',
  };
}
