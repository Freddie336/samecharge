import 'package:flutter_test/flutter_test.dart';
import 'package:samecharge/features/onboarding/domain/onboarding_draft.dart';
import 'package:samecharge/features/profile_photo/domain/profile_photo.dart';

void main() {
  test('onboarding payload uses locked wire names and consent versions', () {
    const draft = OnboardingDraft(
      displayName: 'Deniz',
      birthDate: '1999-04-12',
      bio: 'Coffee and walks',
      interests: ['coffee', 'walking'],
      intent: OnboardingIntent.friendship,
      selfGender: OnboardingGender.nonbinary,
      shownGenderPreferences: [OnboardingGender.unspecified],
      acceptedTerms: true,
      acceptedPrivacy: true,
      acceptedExplicitData: true,
      analyticsConsent: true,
      photos: [
        ProfilePhoto(photoId: 'photo-1', status: ProfilePhotoStatus.pending),
      ],
    );

    final payload = draft.toCallablePayload();

    expect(payload['cityId'], 'istanbul');
    expect(payload['intent'], 'friendship');
    expect(payload['selfGender'], 'nonbinary');
    expect(payload['shownGenderPreferences'], ['unspecified']);
    expect(draft.hasFinalizedPhoto, isTrue);

    final consentRecords = payload['consentRecords'] as List<Object?>;
    expect(consentRecords, hasLength(4));
    expect(_hasConsent(consentRecords, 'terms'), isTrue);
    expect(_hasConsent(consentRecords, 'privacy'), isTrue);
    expect(_hasConsent(consentRecords, 'explicit_data'), isTrue);
    expect(_hasConsent(consentRecords, 'analytics'), isTrue);
  });

  test('empty draft cannot satisfy required photo or consent gate', () {
    const draft = OnboardingDraft();

    expect(draft.hasFinalizedPhoto, isFalse);
    expect(draft.hasRequiredConsents, isFalse);
  });
}

bool _hasConsent(List<Object?> records, String type) {
  return records.whereType<Map<Object?, Object?>>().any((record) {
    return record['type'] == type &&
        record['version'] == 'v1' &&
        record['granted'] == true;
  });
}
