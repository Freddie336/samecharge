import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class FirebaseServices {
  const FirebaseServices({this.functions});

  const FirebaseServices.disabled() : functions = null;

  final FirebaseFunctions? functions;
}

final firebaseServicesProvider = Provider<FirebaseServices>((ref) {
  return const FirebaseServices.disabled();
});
