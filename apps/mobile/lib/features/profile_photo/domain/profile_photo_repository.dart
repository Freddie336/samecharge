import 'profile_photo.dart';

abstract class ProfilePhotoRepository {
  Future<ProfilePhoto?> pickUploadAndFinalize();
}
