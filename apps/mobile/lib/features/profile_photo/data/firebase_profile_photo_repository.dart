import 'dart:convert';
import 'dart:math';
import 'dart:typed_data';

import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image/image.dart' as img;
import 'package:image_picker/image_picker.dart';

import '../../../core/errors/app_failure.dart';
import '../../../core/firebase/firebase_services.dart';
import '../domain/profile_photo.dart';
import '../domain/profile_photo_repository.dart';

const finalizeProfilePhotoCallableName = 'finalizeProfilePhoto';
const profilePhotoTempContentType = 'image/jpeg';
const maxProfilePhotoUploadBytes = 5 * 1024 * 1024;

final profilePhotoRepositoryProvider = Provider<ProfilePhotoRepository>((ref) {
  final services = ref.watch(firebaseServicesProvider);
  final functions = services.functions;
  final storage = services.storage;
  if (functions == null || storage == null) {
    return const DisabledProfilePhotoRepository();
  }

  return FirebaseProfilePhotoRepository(
    auth: FirebaseAuth.instance,
    functions: functions,
    storage: storage,
    picker: ImagePicker(),
  );
});

class DisabledProfilePhotoRepository implements ProfilePhotoRepository {
  const DisabledProfilePhotoRepository();

  @override
  Future<ProfilePhoto?> pickUploadAndFinalize() {
    throw const AppFailure('Fotoğraf yükleme bağlantısı kapalı.');
  }
}

class FirebaseProfilePhotoRepository implements ProfilePhotoRepository {
  FirebaseProfilePhotoRepository({
    required this.auth,
    required this.functions,
    required this.storage,
    required this.picker,
    Random? random,
  }) : _random = random ?? Random.secure();

  final FirebaseAuth auth;
  final FirebaseFunctions functions;
  final FirebaseStorage storage;
  final ImagePicker picker;
  final Random _random;

  @override
  Future<ProfilePhoto?> pickUploadAndFinalize() async {
    final user = auth.currentUser;
    if (user == null) {
      throw const AppFailure('Oturum gerekli.');
    }

    final picked = await picker.pickImage(source: ImageSource.gallery);
    if (picked == null) {
      return null;
    }

    final bytes = await picked.readAsBytes();
    final encoded = _prepareUploadBytes(bytes);
    final uploadId = _newUploadId(_random);
    final tempPath = 'temp_uploads/${user.uid}/$uploadId';

    await storage
        .ref(tempPath)
        .putData(
          encoded,
          SettableMetadata(contentType: profilePhotoTempContentType),
        );

    try {
      final result = await functions
          .httpsCallable(finalizeProfilePhotoCallableName)
          .call<Map<Object?, Object?>>({'tempFilePath': tempPath});
      final data = Map<String, dynamic>.from(result.data);

      return ProfilePhoto(
        photoId: data['photoId'] as String,
        status: _status(data['status'] as String?),
      );
    } on FirebaseFunctionsException catch (error) {
      throw AppFailure(_photoMessage(error));
    }
  }
}

Uint8List _prepareUploadBytes(Uint8List source) {
  if (source.isEmpty || source.lengthInBytes > maxProfilePhotoUploadBytes) {
    throw const AppFailure('Fotoğraf 5 MB sınırını aşmamalı.');
  }

  final decoded = img.decodeImage(source);
  if (decoded == null) {
    throw const AppFailure('Geçerli bir fotoğraf seç.');
  }

  final resized = decoded.width > 1600 || decoded.height > 1600
      ? img.copyResize(
          decoded,
          width: decoded.width >= decoded.height ? 1600 : null,
          height: decoded.height > decoded.width ? 1600 : null,
        )
      : decoded;
  final encoded = Uint8List.fromList(img.encodeJpg(resized, quality: 85));

  if (encoded.lengthInBytes > maxProfilePhotoUploadBytes) {
    throw const AppFailure('Fotoğraf 5 MB sınırını aşmamalı.');
  }

  return encoded;
}

String _newUploadId(Random random) {
  final bytes = List<int>.generate(18, (_) => random.nextInt(256));
  return base64UrlEncode(bytes).replaceAll('=', '');
}

ProfilePhotoStatus _status(String? value) {
  return switch (value) {
    'approved' => ProfilePhotoStatus.approved,
    'needs_review' => ProfilePhotoStatus.needsReview,
    _ => ProfilePhotoStatus.pending,
  };
}

String _photoMessage(FirebaseFunctionsException error) {
  final details = error.details;
  if (details is Map && details['code'] == 'content_rejected') {
    return 'Fotoğraf kabul edilmedi. Başka bir fotoğraf dene.';
  }

  return 'Fotoğraf yükleme tamamlanamadı.';
}
