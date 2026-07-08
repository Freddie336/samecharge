import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/firebase/firebase_services.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../auth/presentation/auth_screen.dart';
import '../../bootstrap/domain/bootstrap_state.dart';
import '../../bootstrap/presentation/bootstrap_providers.dart';
import '../../home/presentation/status_screens.dart';
import '../../onboarding/presentation/onboarding_screen.dart';
import '../../presence/presentation/presence_lifecycle_listener.dart';
import '../../splash/presentation/splash_screen.dart';

class RootGateScreen extends ConsumerWidget {
  const RootGateScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final services = ref.watch(firebaseServicesProvider);
    if (services.functions == null ||
        services.database == null ||
        services.storage == null) {
      return const SplashScreen();
    }

    final auth = ref.watch(authStateProvider);
    return auth.when(
      loading: () => const _LoadingScreen(),
      error: (_, _) => const AuthScreen(),
      data: (user) {
        if (user == null) {
          return const AuthScreen();
        }

        final bootstrap = ref.watch(bootstrapStateProvider);
        return bootstrap.when(
          loading: () => const _LoadingScreen(),
          error: (error, _) => StatusScreen(
            title: 'Bağlantı kurulamadı',
            message: '$error',
            action: FilledButton(
              onPressed: () => ref.invalidate(bootstrapStateProvider),
              child: const Text('Tekrar dene'),
            ),
          ),
          data: (state) => PresenceLifecycleListener(
            user: user,
            bootstrap: state,
            child: _screenForState(context, ref, state),
          ),
        );
      },
    );
  }
}

Widget _screenForState(
  BuildContext context,
  WidgetRef ref,
  BootstrapState state,
) {
  if (state.accountStatus == PublicAccountStatus.suspended) {
    return const StatusScreen(
      title: 'Hesap askıda',
      message: 'Bu hesap şu anda kullanılamıyor.',
    );
  }

  if (state.accountStatus == PublicAccountStatus.deletionPending) {
    return const StatusScreen(
      title: 'Silme işlemi bekliyor',
      message: 'Hesap silme süreci devam ediyor.',
    );
  }

  if (state.needsOnboarding) {
    return const OnboardingScreen();
  }

  return switch (state.profileStatus) {
    ProfileStatus.approved => const StatusScreen(
      title: 'SameCharge',
      message: 'Profilin hazır.',
    ),
    ProfileStatus.rejected => const StatusScreen(
      title: 'Profil reddedildi',
      message: 'Profil bilgilerini güncellemen gerekecek.',
    ),
    ProfileStatus.needsReview => const StatusScreen(
      title: 'Tekrar inceleme',
      message: 'Profilin ek inceleme bekliyor.',
    ),
    _ => const StatusScreen(
      title: 'Profil incelemede',
      message: 'Fotoğraf ve profil onayı bekleniyor.',
    ),
  };
}

class _LoadingScreen extends StatelessWidget {
  const _LoadingScreen();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: SafeArea(child: Center(child: CircularProgressIndicator())),
    );
  }
}
