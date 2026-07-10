import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/errors/app_failure.dart';
import '../data/callable_discovery_repository.dart';
import '../domain/discovery_candidate.dart';
import '../domain/discovery_repository.dart';

final discoveryControllerProvider =
    NotifierProvider<DiscoveryController, DiscoveryUiState>(
      DiscoveryController.new,
    );

class DiscoveryUiState {
  const DiscoveryUiState({
    this.candidates = const [],
    this.loading = false,
    this.submitting = false,
    this.errorMessage,
    this.tokenExpired = false,
    this.match,
  });

  final List<DiscoveryCandidate> candidates;
  final bool loading;
  final bool submitting;
  final String? errorMessage;
  final bool tokenExpired;
  final DiscoveryMatched? match;

  DiscoveryCandidate? get currentCandidate =>
      candidates.isEmpty ? null : candidates.first;

  bool get isEmpty => !loading && candidates.isEmpty && match == null;

  DiscoveryUiState copyWith({
    List<DiscoveryCandidate>? candidates,
    bool? loading,
    bool? submitting,
    String? errorMessage,
    bool clearError = false,
    bool? tokenExpired,
    DiscoveryMatched? match,
    bool clearMatch = false,
  }) {
    return DiscoveryUiState(
      candidates: candidates ?? this.candidates,
      loading: loading ?? this.loading,
      submitting: submitting ?? this.submitting,
      errorMessage: clearError ? null : errorMessage ?? this.errorMessage,
      tokenExpired: tokenExpired ?? this.tokenExpired,
      match: clearMatch ? null : match ?? this.match,
    );
  }
}

class DiscoveryController extends Notifier<DiscoveryUiState> {
  late final DiscoveryRepository _repository;

  @override
  DiscoveryUiState build() {
    _repository = ref.watch(discoveryRepositoryProvider);
    return const DiscoveryUiState();
  }

  Future<void> refresh() async {
    if (state.loading || state.submitting) {
      return;
    }

    state = state.copyWith(
      loading: true,
      clearError: true,
      tokenExpired: false,
      clearMatch: true,
    );

    try {
      final batch = await _repository.startDiscovery();
      state = state.copyWith(
        candidates: batch.candidates,
        loading: false,
        tokenExpired: false,
        clearError: true,
      );
    } on AppFailure catch (error) {
      state = state.copyWith(loading: false, errorMessage: error.message);
    }
  }

  Future<void> like() => _submit(DiscoveryDecision.like);

  Future<void> pass() => _submit(DiscoveryDecision.pass);

  void dismissMatch() {
    state = state.copyWith(clearMatch: true);
  }

  Future<void> _submit(DiscoveryDecision decision) async {
    if (state.submitting || state.loading) {
      return;
    }

    final candidate = state.currentCandidate;
    if (candidate == null) {
      return;
    }

    if (candidate.isExpired(DateTime.now().toUtc())) {
      state = state.copyWith(
        tokenExpired: true,
        errorMessage: 'This candidate expired. Refresh discovery.',
      );
      return;
    }

    state = state.copyWith(submitting: true, clearError: true);

    try {
      final result = await _repository.submitDecision(
        candidateToken: candidate.candidateToken,
        decision: decision,
      );
      final remaining = state.candidates.skip(1).toList(growable: false);

      state = switch (result) {
        DiscoveryMatched() => state.copyWith(
          candidates: remaining,
          submitting: false,
          match: result,
          clearError: true,
        ),
        _ => state.copyWith(
          candidates: remaining,
          submitting: false,
          clearError: true,
        ),
      };
    } on AppFailure catch (error) {
      final expired =
          error.message.contains('expired') ||
          error.message.contains('already') ||
          error.message.contains('no longer');
      state = state.copyWith(
        submitting: false,
        tokenExpired: expired,
        errorMessage: error.message,
      );
    }
  }
}
