import 'auth_user.dart';

abstract class AuthRepository {
  Stream<AuthUser?> authStateChanges();
  AuthUser? currentUser();
  Future<void> signIn({required String email, required String password});
  Future<void> register({required String email, required String password});
  Future<void> signOut();
}
