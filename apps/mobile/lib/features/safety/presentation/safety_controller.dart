import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/errors/app_failure.dart';
import '../../bootstrap/presentation/bootstrap_providers.dart';
import '../data/callable_safety_repository.dart';
import '../domain/safety_repository.dart';

final safetyControllerProvider =
    NotifierProvider<SafetyController, SafetyUiState>(SafetyController.new);

class SafetyUiState {
  const SafetyUiState({
    this.submitting = false,
    this.errorMessage,
    this.successMessage,
    this.reauthenticationRequired = false,
  });

  final bool submitting;
  final String? errorMessage;
  final String? successMessage;
  final bool reauthenticationRequired;

  SafetyUiState copyWith({
    bool? submitting,
    String? errorMessage,
    String? successMessage,
    bool? reauthenticationRequired,
    bool clearMessages = false,
  }) {
    return SafetyUiState(
      submitting: submitting ?? this.submitting,
      errorMessage: clearMessages ? null : errorMessage ?? this.errorMessage,
      successMessage: clearMessages
          ? null
          : successMessage ?? this.successMessage,
      reauthenticationRequired:
          reauthenticationRequired ?? this.reauthenticationRequired,
    );
  }
}

class SafetyController extends Notifier<SafetyUiState> {
  late final SafetyRepository _repository;

  @override
  SafetyUiState build() {
    _repository = ref.watch(safetyRepositoryProvider);
    return const SafetyUiState();
  }

  Future<void> requestDeletion(String confirmation) async {
    if (state.submitting) {
      return;
    }
    if (confirmation != 'DELETE_MY_ACCOUNT') {
      state = state.copyWith(errorMessage: 'Type the confirmation exactly.');
      return;
    }

    state = state.copyWith(
      submitting: true,
      clearMessages: true,
      reauthenticationRequired: false,
    );
    try {
      await _repository.requestAccountDeletion(confirmation: confirmation);
      state = state.copyWith(
        submitting: false,
        successMessage: 'Account deletion request received.',
      );
      ref.invalidate(bootstrapStateProvider);
    } on AppFailure catch (error) {
      state = state.copyWith(
        submitting: false,
        errorMessage: error.message,
        reauthenticationRequired: error.message.contains('sign in again'),
      );
    }
  }
}
