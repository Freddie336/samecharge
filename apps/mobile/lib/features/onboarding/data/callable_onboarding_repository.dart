import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/errors/app_failure.dart';
import '../../../core/firebase/firebase_services.dart';
import '../domain/onboarding_draft.dart';
import '../domain/onboarding_repository.dart';

const completeOnboardingCallableName = 'completeOnboarding';

final onboardingRepositoryProvider = Provider<OnboardingRepository>((ref) {
  final functions = ref.watch(firebaseServicesProvider).functions;
  if (functions == null) {
    return const DisabledOnboardingRepository();
  }

  return CallableOnboardingRepository(functions);
});

class DisabledOnboardingRepository implements OnboardingRepository {
  const DisabledOnboardingRepository();

  @override
  Future<void> completeOnboarding(OnboardingDraft draft) {
    throw const AppFailure('Onboarding bağlantısı kapalı.');
  }
}

class CallableOnboardingRepository implements OnboardingRepository {
  const CallableOnboardingRepository(this._functions);

  final FirebaseFunctions _functions;

  @override
  Future<void> completeOnboarding(OnboardingDraft draft) async {
    try {
      await _functions
          .httpsCallable(completeOnboardingCallableName)
          .call<Map<Object?, Object?>>(draft.toCallablePayload());
    } on FirebaseFunctionsException catch (error) {
      throw AppFailure(_onboardingMessage(error));
    }
  }
}

String _onboardingMessage(FirebaseFunctionsException error) {
  final details = error.details;
  if (details is Map && details['code'] == 'input_invalid') {
    return 'Bilgileri kontrol et. En az bir fotoğraf gerekli.';
  }

  if (details is Map && details['code'] == 'already_exists') {
    return 'Onboarding daha önce tamamlandı.';
  }

  return 'Onboarding tamamlanamadı.';
}
