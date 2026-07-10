import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/errors/app_failure.dart';
import '../../../core/firebase/firebase_services.dart';
import '../domain/discovery_candidate.dart';
import '../domain/discovery_repository.dart';

const startDiscoveryCallableName = 'startDiscovery';
const submitDiscoveryDecisionCallableName = 'submitDiscoveryDecision';

final discoveryRepositoryProvider = Provider<DiscoveryRepository>((ref) {
  final functions = ref.watch(firebaseServicesProvider).functions;
  if (functions == null) {
    return const DisabledDiscoveryRepository();
  }

  return CallableDiscoveryRepository(functions);
});

class DisabledDiscoveryRepository implements DiscoveryRepository {
  const DisabledDiscoveryRepository();

  @override
  Future<DiscoveryBatch> startDiscovery({
    int requestedRange = 3,
    int pageSize = 10,
  }) {
    throw const AppFailure('Discovery connection is unavailable.');
  }

  @override
  Future<DiscoveryDecisionResult> submitDecision({
    required String candidateToken,
    required DiscoveryDecision decision,
  }) {
    throw const AppFailure('Discovery connection is unavailable.');
  }
}

class CallableDiscoveryRepository implements DiscoveryRepository {
  const CallableDiscoveryRepository(this._functions);

  final FirebaseFunctions _functions;

  @override
  Future<DiscoveryBatch> startDiscovery({
    int requestedRange = 3,
    int pageSize = 10,
  }) async {
    try {
      final result = await _functions
          .httpsCallable(startDiscoveryCallableName)
          .call<Map<Object?, Object?>>({
            'requestedRange': requestedRange,
            'pageSize': pageSize,
          });
      return _parseBatch(Map<String, dynamic>.from(result.data));
    } on FirebaseFunctionsException catch (error) {
      throw AppFailure(_discoveryMessage(error));
    }
  }

  @override
  Future<DiscoveryDecisionResult> submitDecision({
    required String candidateToken,
    required DiscoveryDecision decision,
  }) async {
    try {
      final result = await _functions
          .httpsCallable(submitDiscoveryDecisionCallableName)
          .call<Map<Object?, Object?>>({
            'candidateToken': candidateToken,
            'decision': decision == DiscoveryDecision.like ? 'like' : 'pass',
          });
      return _parseDecisionResult(Map<String, dynamic>.from(result.data));
    } on FirebaseFunctionsException catch (error) {
      throw AppFailure(_decisionMessage(error));
    }
  }
}

DiscoveryBatch _parseBatch(Map<String, dynamic> data) {
  final candidates = (data['candidates'] as List? ?? const [])
      .whereType<Map>()
      .map((candidate) => _parseCandidate(Map<String, dynamic>.from(candidate)))
      .toList(growable: false);

  return DiscoveryBatch(
    candidates: candidates,
    expiresAt: DateTime.parse(data['expiresAt'] as String).toUtc(),
  );
}

DiscoveryCandidate _parseCandidate(Map<String, dynamic> data) {
  return DiscoveryCandidate(
    candidateToken: data['candidateToken'] as String,
    displayName: data['displayName'] as String,
    age: data['age'] as int,
    cityLabel: data['cityLabel'] as String,
    bio: data['bio'] as String,
    interests: (data['interests'] as List? ?? const [])
        .whereType<String>()
        .toList(growable: false),
    photoRefs: _parsePhotoRefs(data['photoRefs']),
    batteryLabel: data['batteryLabel'] as String,
    batteryDifference: data['batteryDifference'] as int,
    expiresAt: DateTime.parse(data['expiresAt'] as String).toUtc(),
  );
}

DiscoveryDecisionResult _parseDecisionResult(Map<String, dynamic> data) {
  return switch (data['status']) {
    'passed' => const DiscoveryPassed(),
    'liked' => const DiscoveryLiked(),
    'matched' => DiscoveryMatched(
      matchId: data['matchId'] as String,
      matchedAt: DateTime.parse(data['matchedAt'] as String).toUtc(),
      match: _parseMatchPreview(
        Map<String, dynamic>.from(data['match'] as Map),
      ),
    ),
    _ => throw const AppFailure('Discovery response was not understood.'),
  };
}

MatchPreview _parseMatchPreview(Map<String, dynamic> data) {
  return MatchPreview(
    displayName: data['displayName'] as String,
    age: data['age'] as int,
    photoRefs: _parsePhotoRefs(data['photoRefs']),
  );
}

List<CandidatePhotoRef> _parsePhotoRefs(Object? value) {
  return (value as List? ?? const [])
      .whereType<Map>()
      .map((photo) {
        final data = Map<String, dynamic>.from(photo);
        return CandidatePhotoRef(photoId: data['photoId'] as String);
      })
      .toList(growable: false);
}

String _discoveryMessage(FirebaseFunctionsException error) {
  final details = error.details;
  if (details is Map && details['code'] == 'profile_not_eligible') {
    return 'Discovery is available after your approved profile is ready.';
  }

  return 'Discovery could not be refreshed.';
}

String _decisionMessage(FirebaseFunctionsException error) {
  final details = error.details;
  final code = details is Map ? details['code'] : null;

  return switch (code) {
    'candidate_token_expired' => 'This candidate expired. Refresh discovery.',
    'candidate_token_used' => 'This candidate was already handled.',
    'candidate_token_invalid' => 'This candidate is no longer available.',
    'profile_not_eligible' => 'This candidate is no longer available.',
    _ => 'Decision could not be submitted.',
  };
}
