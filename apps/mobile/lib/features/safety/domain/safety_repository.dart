abstract class SafetyRepository {
  Future<void> reportContent({
    required String reportToken,
    required String targetType,
    required String targetId,
    String? matchId,
    required String category,
    String? description,
  });

  Future<void> blockUser({
    required String targetUserId,
    required String matchId,
    String? reason,
  });

  Future<void> unmatchUser(String matchId);

  Future<void> requestAccountDeletion({
    required String confirmation,
    String? reauthenticationToken,
  });
}
