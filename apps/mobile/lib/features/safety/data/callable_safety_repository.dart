import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/errors/app_failure.dart';
import '../../../core/firebase/firebase_services.dart';
import '../domain/safety_repository.dart';

const reportContentCallableName = 'reportContent';
const blockUserCallableName = 'blockUser';
const unmatchUserCallableName = 'unmatchUser';
const requestAccountDeletionCallableName = 'requestAccountDeletion';

final safetyRepositoryProvider = Provider<SafetyRepository>((ref) {
  final functions = ref.watch(firebaseServicesProvider).functions;
  if (functions == null) {
    return const DisabledSafetyRepository();
  }

  return CallableSafetyRepository(functions);
});

class DisabledSafetyRepository implements SafetyRepository {
  const DisabledSafetyRepository();

  @override
  Future<void> blockUser({
    required String targetUserId,
    required String matchId,
    String? reason,
  }) {
    throw const AppFailure('Safety controls are unavailable.');
  }

  @override
  Future<void> reportContent({
    required String reportToken,
    required String targetType,
    required String targetId,
    String? matchId,
    required String category,
    String? description,
  }) {
    throw const AppFailure('Safety controls are unavailable.');
  }

  @override
  Future<void> requestAccountDeletion({
    required String confirmation,
    String? reauthenticationToken,
  }) {
    throw const AppFailure('Safety controls are unavailable.');
  }

  @override
  Future<void> unmatchUser(String matchId) {
    throw const AppFailure('Safety controls are unavailable.');
  }
}

class CallableSafetyRepository implements SafetyRepository {
  const CallableSafetyRepository(this._functions);

  final FirebaseFunctions _functions;

  @override
  Future<void> reportContent({
    required String reportToken,
    required String targetType,
    required String targetId,
    String? matchId,
    required String category,
    String? description,
  }) async {
    final payload = <String, Object?>{
      'reportToken': reportToken,
      'targetType': targetType,
      'targetId': targetId,
      'category': category,
    };
    if (matchId != null) {
      payload['matchId'] = matchId;
    }
    final trimmed = description?.trim();
    if (trimmed != null && trimmed.isNotEmpty) {
      payload['description'] = trimmed;
    }

    try {
      await _functions.httpsCallable(reportContentCallableName).call(payload);
    } on FirebaseFunctionsException catch (error) {
      throw AppFailure(_safetyErrorText(error));
    }
  }

  @override
  Future<void> blockUser({
    required String targetUserId,
    required String matchId,
    String? reason,
  }) async {
    try {
      await _functions.httpsCallable(blockUserCallableName).call({
        'targetUserId': targetUserId,
        'matchId': matchId,
        'reason': ?reason,
      });
    } on FirebaseFunctionsException catch (error) {
      throw AppFailure(_safetyErrorText(error));
    }
  }

  @override
  Future<void> unmatchUser(String matchId) async {
    try {
      await _functions.httpsCallable(unmatchUserCallableName).call({
        'matchId': matchId,
      });
    } on FirebaseFunctionsException catch (error) {
      throw AppFailure(_safetyErrorText(error));
    }
  }

  @override
  Future<void> requestAccountDeletion({
    required String confirmation,
    String? reauthenticationToken,
  }) async {
    try {
      await _functions.httpsCallable(requestAccountDeletionCallableName).call({
        'confirmation': confirmation,
        'reauthenticationToken': ?reauthenticationToken,
      });
    } on FirebaseFunctionsException catch (error) {
      throw AppFailure(_safetyErrorText(error));
    }
  }
}

String reportTokenForMatch(String matchId) => 'match:$matchId';

String reportTokenForMessage(String matchId, String messageId) {
  return 'message:$matchId:$messageId';
}

String _safetyErrorText(FirebaseFunctionsException error) {
  final details = error.details;
  final code = details is Map ? details['code'] : null;

  return switch (code) {
    'reauthentication_required' =>
      'Please sign in again before deleting your account.',
    'rate_limited' => 'Please wait before sending another safety request.',
    'permission_denied' => 'This safety action is not available.',
    'report_token_invalid' => 'This report can no longer be sent.',
    'input_invalid' => 'Check the details and try again.',
    _ => 'Safety request could not be completed.',
  };
}
