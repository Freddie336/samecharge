import '../../../core/config/legal_document_versions.dart';
import '../../profile_photo/domain/profile_photo.dart';

enum OnboardingIntent { dating, friendship, chat }

enum OnboardingGender { male, female, nonbinary, unspecified }

class OnboardingDraft {
  const OnboardingDraft({
    this.displayName = '',
    this.birthDate = '',
    this.cityId = 'istanbul',
    this.bio = '',
    this.interests = const [],
    this.intent = OnboardingIntent.dating,
    this.selfGender = OnboardingGender.unspecified,
    this.shownGenderPreferences = const [OnboardingGender.unspecified],
    this.acceptedTerms = false,
    this.acceptedPrivacy = false,
    this.acceptedExplicitData = false,
    this.analyticsConsent = false,
    this.marketingConsent = false,
    this.photos = const [],
  });

  final String displayName;
  final String birthDate;
  final String cityId;
  final String bio;
  final List<String> interests;
  final OnboardingIntent intent;
  final OnboardingGender selfGender;
  final List<OnboardingGender> shownGenderPreferences;
  final bool acceptedTerms;
  final bool acceptedPrivacy;
  final bool acceptedExplicitData;
  final bool analyticsConsent;
  final bool marketingConsent;
  final List<ProfilePhoto> photos;

  bool get hasFinalizedPhoto =>
      photos.any((photo) => photo.countsForOnboarding);
  bool get hasRequiredConsents =>
      acceptedTerms && acceptedPrivacy && acceptedExplicitData;

  OnboardingDraft copyWith({
    String? displayName,
    String? birthDate,
    String? cityId,
    String? bio,
    List<String>? interests,
    OnboardingIntent? intent,
    OnboardingGender? selfGender,
    List<OnboardingGender>? shownGenderPreferences,
    bool? acceptedTerms,
    bool? acceptedPrivacy,
    bool? acceptedExplicitData,
    bool? analyticsConsent,
    bool? marketingConsent,
    List<ProfilePhoto>? photos,
  }) {
    return OnboardingDraft(
      displayName: displayName ?? this.displayName,
      birthDate: birthDate ?? this.birthDate,
      cityId: cityId ?? this.cityId,
      bio: bio ?? this.bio,
      interests: interests ?? this.interests,
      intent: intent ?? this.intent,
      selfGender: selfGender ?? this.selfGender,
      shownGenderPreferences:
          shownGenderPreferences ?? this.shownGenderPreferences,
      acceptedTerms: acceptedTerms ?? this.acceptedTerms,
      acceptedPrivacy: acceptedPrivacy ?? this.acceptedPrivacy,
      acceptedExplicitData: acceptedExplicitData ?? this.acceptedExplicitData,
      analyticsConsent: analyticsConsent ?? this.analyticsConsent,
      marketingConsent: marketingConsent ?? this.marketingConsent,
      photos: photos ?? this.photos,
    );
  }

  Map<String, Object?> toCallablePayload() {
    return {
      'displayName': displayName,
      'birthDate': birthDate,
      'cityId': cityId,
      'bio': bio,
      'interests': interests,
      'intent': intent.wireName,
      'selfGender': selfGender.wireName,
      'shownGenderPreferences': shownGenderPreferences
          .map((gender) => gender.wireName)
          .toList(),
      'consentRecords': [
        {
          'type': 'terms',
          'version': LegalDocumentVersions.terms,
          'granted': acceptedTerms,
        },
        {
          'type': 'privacy',
          'version': LegalDocumentVersions.privacy,
          'granted': acceptedPrivacy,
        },
        {
          'type': 'explicit_data',
          'version': LegalDocumentVersions.explicitData,
          'granted': acceptedExplicitData,
        },
        if (analyticsConsent)
          {
            'type': 'analytics',
            'version': LegalDocumentVersions.analytics,
            'granted': true,
          },
        if (marketingConsent)
          {
            'type': 'marketing',
            'version': LegalDocumentVersions.marketing,
            'granted': true,
          },
      ],
    };
  }
}

extension OnboardingIntentWire on OnboardingIntent {
  String get wireName => switch (this) {
    OnboardingIntent.dating => 'dating',
    OnboardingIntent.friendship => 'friendship',
    OnboardingIntent.chat => 'chat',
  };
}

extension OnboardingGenderWire on OnboardingGender {
  String get wireName => switch (this) {
    OnboardingGender.male => 'male',
    OnboardingGender.female => 'female',
    OnboardingGender.nonbinary => 'nonbinary',
    OnboardingGender.unspecified => 'unspecified',
  };
}
