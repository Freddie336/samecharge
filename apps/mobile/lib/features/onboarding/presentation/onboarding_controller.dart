import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/errors/app_failure.dart';
import '../../profile_photo/data/firebase_profile_photo_repository.dart';
import '../../profile_photo/domain/profile_photo.dart';
import '../../profile_photo/domain/profile_photo_repository.dart';
import '../data/callable_onboarding_repository.dart';
import '../domain/onboarding_draft.dart';
import '../domain/onboarding_repository.dart';

final onboardingControllerProvider =
    NotifierProvider<OnboardingController, OnboardingUiState>(
      OnboardingController.new,
    );

class OnboardingUiState {
  const OnboardingUiState({
    this.draft = const OnboardingDraft(),
    this.step = 0,
    this.loading = false,
    this.errorMessage,
  });

  final OnboardingDraft draft;
  final int step;
  final bool loading;
  final String? errorMessage;

  bool get canContinue {
    return switch (step) {
      0 => _validBirthDate(draft.birthDate),
      1 => _validDisplayName(draft.displayName),
      4 => draft.hasFinalizedPhoto,
      6 => draft.hasRequiredConsents,
      _ => true,
    };
  }

  bool get canSubmit =>
      _validBirthDate(draft.birthDate) &&
      _validDisplayName(draft.displayName) &&
      draft.hasFinalizedPhoto &&
      draft.hasRequiredConsents;

  OnboardingUiState copyWith({
    OnboardingDraft? draft,
    int? step,
    bool? loading,
    String? errorMessage,
    bool clearError = false,
  }) {
    return OnboardingUiState(
      draft: draft ?? this.draft,
      step: step ?? this.step,
      loading: loading ?? this.loading,
      errorMessage: clearError ? null : errorMessage ?? this.errorMessage,
    );
  }
}

class OnboardingController extends Notifier<OnboardingUiState> {
  late final OnboardingRepository _onboardingRepository;
  late final ProfilePhotoRepository _photoRepository;

  @override
  OnboardingUiState build() {
    _onboardingRepository = ref.watch(onboardingRepositoryProvider);
    _photoRepository = ref.watch(profilePhotoRepositoryProvider);
    return const OnboardingUiState();
  }

  void update(OnboardingDraft next) {
    state = state.copyWith(draft: next, clearError: true);
  }

  void next() {
    if (!state.canContinue) {
      state = state.copyWith(errorMessage: _stepError());
      return;
    }

    if (state.step < 7) {
      state = state.copyWith(step: state.step + 1, clearError: true);
    }
  }

  void back() {
    if (state.step > 0) {
      state = state.copyWith(step: state.step - 1, clearError: true);
    }
  }

  Future<void> addPhoto() async {
    if (state.loading) {
      return;
    }

    if (state.draft.photos.length >= 4) {
      state = state.copyWith(
        errorMessage: 'En fazla 4 fotoğraf ekleyebilirsin.',
      );
      return;
    }

    await _run(() async {
      final photo = await _photoRepository.pickUploadAndFinalize();
      if (photo != null) {
        state = state.copyWith(
          draft: state.draft.copyWith(photos: [...state.draft.photos, photo]),
          clearError: true,
        );
      }
    });
  }

  Future<bool> submit() async {
    if (state.loading) {
      return false;
    }

    if (!state.canSubmit) {
      state = state.copyWith(
        errorMessage: 'Zorunlu alanları ve fotoğrafı tamamla.',
      );
      return false;
    }

    var completed = false;
    await _run(() async {
      await _onboardingRepository.completeOnboarding(state.draft);
      state = const OnboardingUiState();
      completed = true;
    });

    return completed;
  }

  Future<void> _run(Future<void> Function() action) async {
    state = state.copyWith(loading: true, clearError: true);

    try {
      await action();
    } on AppFailure catch (error) {
      state = state.copyWith(loading: false, errorMessage: error.message);
      return;
    } finally {
      if (state.loading) {
        state = state.copyWith(loading: false);
      }
    }
  }

  String _stepError() {
    return switch (state.step) {
      0 => '18+ ve YYYY-MM-DD biçiminde bir doğum tarihi gerekli.',
      1 => 'Görünen ad 2-30 karakter olmalı.',
      4 => 'Devam etmek için en az bir fotoğraf yükle.',
      6 => 'Zorunlu onayları kabul etmen gerekiyor.',
      _ => 'Bu adımı tamamla.',
    };
  }
}

String profilePhotoStatusLabel(ProfilePhoto photo) {
  return switch (photo.status) {
    ProfilePhotoStatus.pending => 'İncelemede',
    ProfilePhotoStatus.approved => 'Onaylandı',
    ProfilePhotoStatus.needsReview => 'Tekrar incelenecek',
  };
}

bool _validDisplayName(String value) {
  final trimmed = value.trim().replaceAll(RegExp(r'\s+'), ' ');
  final length = trimmed.runes.length;
  return length >= 2 && length <= 30;
}

bool _validBirthDate(String value) {
  final match = RegExp(r'^(\d{4})-(\d{2})-(\d{2})$').firstMatch(value);
  if (match == null) {
    return false;
  }

  final year = int.parse(match.group(1)!);
  final month = int.parse(match.group(2)!);
  final day = int.parse(match.group(3)!);
  final date = DateTime.tryParse(value);
  if (date == null ||
      date.year != year ||
      date.month != month ||
      date.day != day) {
    return false;
  }

  final now = DateTime.now().toUtc();
  var age = now.year - date.year;
  if (now.month < date.month ||
      (now.month == date.month && now.day < date.day)) {
    age -= 1;
  }

  return age >= 18;
}
