import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/firebase/firebase_services.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../auth/presentation/auth_screen.dart';
import '../../bootstrap/domain/bootstrap_state.dart';
import '../../bootstrap/presentation/bootstrap_providers.dart';
import '../../chat/presentation/chat_home_screen.dart';
import '../../home/presentation/status_screens.dart';
import '../../onboarding/presentation/onboarding_screen.dart';
import '../../presence/presentation/presence_lifecycle_listener.dart';
import '../../splash/presentation/splash_screen.dart';

class RootGateScreen extends ConsumerWidget {
  const RootGateScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final services = ref.watch(firebaseServicesProvider);
    if (services.firestore == null ||
        services.functions == null ||
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
            title: 'Connection failed',
            message: '$error',
            action: FilledButton(
              onPressed: () => ref.invalidate(bootstrapStateProvider),
              child: const Text('Try again'),
            ),
          ),
          data: (state) => PresenceLifecycleListener(
            user: user,
            bootstrap: state,
            child: _screenForState(state),
          ),
        );
      },
    );
  }
}

Widget _screenForState(BootstrapState state) {
  if (state.accountStatus == PublicAccountStatus.suspended) {
    return const StatusScreen(
      title: 'Account suspended',
      message: 'This account is not available right now.',
    );
  }

  if (state.accountStatus == PublicAccountStatus.deletionPending) {
    return const StatusScreen(
      title: 'Deletion pending',
      message: 'Account deletion is still in progress.',
    );
  }

  if (state.needsOnboarding) {
    return const OnboardingScreen();
  }

  return switch (state.profileStatus) {
    ProfileStatus.approved => const ChatHomeScreen(),
    ProfileStatus.rejected => const StatusScreen(
      title: 'Profile rejected',
      message: 'You will need to update your profile information.',
    ),
    ProfileStatus.needsReview => const StatusScreen(
      title: 'Extra review',
      message: 'Your profile is waiting for another review.',
    ),
    _ => const StatusScreen(
      title: 'Profile in review',
      message: 'Your photo and profile approval is pending.',
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
