import 'onboarding_draft.dart';

abstract class OnboardingRepository {
  Future<void> completeOnboarding(OnboardingDraft draft);
}
