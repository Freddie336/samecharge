class CandidatePhotoRef {
  const CandidatePhotoRef({required this.photoId});

  final String photoId;
}

class DiscoveryCandidate {
  const DiscoveryCandidate({
    required this.candidateToken,
    required this.displayName,
    required this.age,
    required this.cityLabel,
    required this.bio,
    required this.interests,
    required this.photoRefs,
    required this.batteryLabel,
    required this.batteryDifference,
    required this.expiresAt,
  });

  final String candidateToken;
  final String displayName;
  final int age;
  final String cityLabel;
  final String bio;
  final List<String> interests;
  final List<CandidatePhotoRef> photoRefs;
  final String batteryLabel;
  final int batteryDifference;
  final DateTime expiresAt;

  bool isExpired(DateTime now) => !expiresAt.isAfter(now.toUtc());
}

class DiscoveryBatch {
  const DiscoveryBatch({required this.candidates, required this.expiresAt});

  final List<DiscoveryCandidate> candidates;
  final DateTime expiresAt;
}

enum DiscoveryDecision { like, pass }

sealed class DiscoveryDecisionResult {
  const DiscoveryDecisionResult();
}

class DiscoveryPassed extends DiscoveryDecisionResult {
  const DiscoveryPassed();
}

class DiscoveryLiked extends DiscoveryDecisionResult {
  const DiscoveryLiked();
}

class DiscoveryMatched extends DiscoveryDecisionResult {
  const DiscoveryMatched({
    required this.matchId,
    required this.matchedAt,
    required this.match,
  });

  final String matchId;
  final DateTime matchedAt;
  final MatchPreview match;
}

class MatchPreview {
  const MatchPreview({
    required this.displayName,
    required this.age,
    required this.photoRefs,
  });

  final String displayName;
  final int age;
  final List<CandidatePhotoRef> photoRefs;
}
