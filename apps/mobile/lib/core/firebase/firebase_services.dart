import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_database/firebase_database.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class FirebaseServices {
  const FirebaseServices({this.functions, this.database, this.storage});

  const FirebaseServices.disabled()
    : functions = null,
      database = null,
      storage = null;

  final FirebaseFunctions? functions;
  final FirebaseDatabase? database;
  final FirebaseStorage? storage;
}

final firebaseServicesProvider = Provider<FirebaseServices>((ref) {
  return const FirebaseServices.disabled();
});
