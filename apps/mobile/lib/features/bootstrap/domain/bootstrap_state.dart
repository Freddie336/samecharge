enum OnboardingStatus { notStarted, inProgress, completed }

enum PublicAccountStatus { active, suspended, deletionPending }

enum ProfileStatus { draft, pending, approved, rejected, needsReview }

class BootstrapState {
  const BootstrapState({
    required this.onboardingStatus,
    required this.accountStatus,
    required this.profileStatus,
    required this.discoveryEligible,
    required this.moderationActionRequired,
  });

  final OnboardingStatus onboardingStatus;
  final PublicAccountStatus accountStatus;
  final ProfileStatus profileStatus;
  final bool discoveryEligible;
  final bool moderationActionRequired;

  bool get needsOnboarding =>
      onboardingStatus == OnboardingStatus.notStarted ||
      onboardingStatus == OnboardingStatus.inProgress;
}
