import 'package:firebase_auth/firebase_auth.dart' as firebase_auth;
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/errors/app_failure.dart';
import '../domain/auth_repository.dart';
import '../domain/auth_user.dart';

final authRepositoryProvider = Provider<AuthRepository>(
  (ref) => FirebaseAuthRepository(firebase_auth.FirebaseAuth.instance),
);

class FirebaseAuthRepository implements AuthRepository {
  const FirebaseAuthRepository(this._auth);

  final firebase_auth.FirebaseAuth _auth;

  @override
  Stream<AuthUser?> authStateChanges() {
    return _auth.authStateChanges().map(_toUser);
  }

  @override
  AuthUser? currentUser() => _toUser(_auth.currentUser);

  @override
  Future<void> register({
    required String email,
    required String password,
  }) async {
    try {
      await _auth.createUserWithEmailAndPassword(
        email: email.trim(),
        password: password,
      );
    } on firebase_auth.FirebaseAuthException catch (error) {
      throw AppFailure(_authMessage(error));
    }
  }

  @override
  Future<void> signIn({required String email, required String password}) async {
    try {
      await _auth.signInWithEmailAndPassword(
        email: email.trim(),
        password: password,
      );
    } on firebase_auth.FirebaseAuthException catch (error) {
      throw AppFailure(_authMessage(error));
    }
  }

  @override
  Future<void> signOut() => _auth.signOut();

  static AuthUser? _toUser(firebase_auth.User? user) {
    if (user == null) {
      return null;
    }

    return AuthUser(uid: user.uid, email: user.email);
  }
}

String _authMessage(firebase_auth.FirebaseAuthException error) {
  return switch (error.code) {
    'invalid-email' => 'E-posta adresi geçersiz.',
    'weak-password' => 'Şifre en az 6 karakter olmalı.',
    'email-already-in-use' => 'Bu e-posta zaten kayıtlı.',
    'user-not-found' ||
    'wrong-password' ||
    'invalid-credential' => 'E-posta veya şifre hatalı.',
    _ => 'Kimlik doğrulama tamamlanamadı.',
  };
}
