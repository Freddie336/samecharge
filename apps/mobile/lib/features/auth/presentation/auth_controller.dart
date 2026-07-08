import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/errors/app_failure.dart';
import '../data/firebase_auth_repository.dart';
import '../domain/auth_repository.dart';
import '../domain/auth_user.dart';

final authStateProvider = StreamProvider<AuthUser?>((ref) {
  return ref.watch(authRepositoryProvider).authStateChanges();
});

final authControllerProvider = NotifierProvider<AuthController, AuthUiState>(
  AuthController.new,
);

class AuthUiState {
  const AuthUiState({this.loading = false, this.errorMessage});

  final bool loading;
  final String? errorMessage;
}

class AuthController extends Notifier<AuthUiState> {
  late final AuthRepository _repository;

  @override
  AuthUiState build() {
    _repository = ref.watch(authRepositoryProvider);
    return const AuthUiState();
  }

  Future<void> signIn(String email, String password) {
    return _run(() => _repository.signIn(email: email, password: password));
  }

  Future<void> register(String email, String password) {
    return _run(() => _repository.register(email: email, password: password));
  }

  Future<void> signOut() => _repository.signOut();

  Future<void> _run(Future<void> Function() action) async {
    state = const AuthUiState(loading: true);

    try {
      await action();
    } on AppFailure catch (error) {
      state = AuthUiState(errorMessage: error.message);
      return;
    } finally {
      if (state.loading) {
        state = const AuthUiState();
      }
    }
  }
}
