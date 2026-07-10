import 'discovery_candidate.dart';

abstract class DiscoveryRepository {
  Future<DiscoveryBatch> startDiscovery({
    int requestedRange = 3,
    int pageSize = 10,
  });

  Future<DiscoveryDecisionResult> submitDecision({
    required String candidateToken,
    required DiscoveryDecision decision,
  });
}
