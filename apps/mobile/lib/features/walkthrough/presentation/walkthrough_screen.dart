import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class WalkthroughScreen extends StatelessWidget {
  const WalkthroughScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'SameCharge walkthrough',
                  textAlign: TextAlign.center,
                  style: theme.textTheme.headlineMedium,
                ),
                const SizedBox(height: 16),
                Text(
                  'Final walkthrough copy is pending product validation.',
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodyLarge,
                ),
                const SizedBox(height: 32),
                OutlinedButton(
                  onPressed: () => context.go('/'),
                  child: const Text('Return to splash'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
