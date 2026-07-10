import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'safety_controller.dart';

class SafetySettingsScreen extends ConsumerWidget {
  const SafetySettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(safetyControllerProvider);
    final controller = ref.read(safetyControllerProvider.notifier);

    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text('Account', style: Theme.of(context).textTheme.headlineMedium),
          const SizedBox(height: 16),
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Request account deletion'),
            subtitle: const Text(
              'Your profile and discovery access will be disabled while the request is processed.',
            ),
            trailing: const Icon(Icons.chevron_right),
            onTap: state.submitting
                ? null
                : () => _showDeletionDialog(context, controller),
          ),
          if (state.errorMessage != null) ...[
            const SizedBox(height: 16),
            Text(
              state.errorMessage!,
              key: const Key('safety-error'),
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          ],
          if (state.successMessage != null) ...[
            const SizedBox(height: 16),
            Text(state.successMessage!, key: const Key('safety-success')),
          ],
          if (state.reauthenticationRequired) ...[
            const SizedBox(height: 12),
            const Text(
              'Sign out and sign in again, then return here to continue.',
              key: Key('reauthentication-help'),
            ),
          ],
        ],
      ),
    );
  }
}

Future<void> _showDeletionDialog(
  BuildContext context,
  SafetyController controller,
) async {
  final confirmation = await showDialog<String>(
    context: context,
    builder: (context) => const _DeletionDialog(),
  );

  if (confirmation != null) {
    await controller.requestDeletion(confirmation);
  }
}

class _DeletionDialog extends StatefulWidget {
  const _DeletionDialog();

  @override
  State<_DeletionDialog> createState() => _DeletionDialogState();
}

class _DeletionDialogState extends State<_DeletionDialog> {
  final _confirmation = TextEditingController();

  @override
  void dispose() {
    _confirmation.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Request deletion'),
      content: TextField(
        key: const Key('delete-confirmation-field'),
        controller: _confirmation,
        decoration: const InputDecoration(labelText: 'Type DELETE_MY_ACCOUNT'),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        FilledButton(
          key: const Key('confirm-delete-account-button'),
          onPressed: () => Navigator.of(context).pop(_confirmation.text),
          child: const Text('Continue'),
        ),
      ],
    );
  }
}
