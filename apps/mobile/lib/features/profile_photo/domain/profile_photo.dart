enum ProfilePhotoStatus { pending, approved, needsReview }

class ProfilePhoto {
  const ProfilePhoto({required this.photoId, required this.status});

  final String photoId;
  final ProfilePhotoStatus status;

  bool get countsForOnboarding => true;
}
