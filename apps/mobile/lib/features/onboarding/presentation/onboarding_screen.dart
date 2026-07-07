import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../bootstrap/presentation/bootstrap_providers.dart';
import '../domain/onboarding_draft.dart';
import 'onboarding_controller.dart';

class OnboardingScreen extends ConsumerWidget {
  const OnboardingScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(onboardingControllerProvider);
    final controller = ref.read(onboardingControllerProvider.notifier);
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: Text('Onboarding ${state.step + 1}/8')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            LinearProgressIndicator(value: (state.step + 1) / 8),
            const SizedBox(height: 24),
            Text(_title(state.step), style: theme.textTheme.headlineSmall),
            const SizedBox(height: 16),
            _StepBody(state: state, controller: controller),
            if (state.errorMessage != null) ...[
              const SizedBox(height: 16),
              Text(
                state.errorMessage!,
                style: TextStyle(color: theme.colorScheme.error),
              ),
            ],
            const SizedBox(height: 24),
            Row(
              children: [
                if (state.step > 0)
                  Expanded(
                    child: OutlinedButton(
                      onPressed: state.loading ? null : controller.back,
                      child: const Text('Geri'),
                    ),
                  ),
                if (state.step > 0) const SizedBox(width: 12),
                Expanded(
                  child: FilledButton(
                    onPressed: state.loading
                        ? null
                        : () async {
                            if (state.step == 7) {
                              final done = await controller.submit();
                              if (done) {
                                ref.invalidate(bootstrapStateProvider);
                              }
                              return;
                            }

                            controller.next();
                          },
                    child: state.loading
                        ? const SizedBox.square(
                            dimension: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : Text(state.step == 7 ? 'Tamamla' : 'Devam'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _StepBody extends StatelessWidget {
  const _StepBody({required this.state, required this.controller});

  final OnboardingUiState state;
  final OnboardingController controller;

  @override
  Widget build(BuildContext context) {
    return switch (state.step) {
      0 => _TextInput(
        label: 'Birth date',
        initialValue: state.draft.birthDate,
        keyboardType: TextInputType.datetime,
        onChanged: (value) =>
            controller.update(state.draft.copyWith(birthDate: value)),
      ),
      1 => _TextInput(
        label: 'Display name',
        initialValue: state.draft.displayName,
        onChanged: (value) =>
            controller.update(state.draft.copyWith(displayName: value)),
      ),
      2 => _IntentInput(state: state, controller: controller),
      3 => _GenderInput(state: state, controller: controller),
      4 => _PhotoInput(state: state, controller: controller),
      5 => _ProfileTextInput(state: state, controller: controller),
      6 => _ConsentInput(state: state, controller: controller),
      _ => _Review(state: state),
    };
  }
}

class _TextInput extends StatefulWidget {
  const _TextInput({
    required this.label,
    required this.initialValue,
    required this.onChanged,
    this.keyboardType,
  });

  final String label;
  final String initialValue;
  final ValueChanged<String> onChanged;
  final TextInputType? keyboardType;

  @override
  State<_TextInput> createState() => _TextInputState();
}

class _TextInputState extends State<_TextInput> {
  late final TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.initialValue);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: _controller,
      keyboardType: widget.keyboardType,
      decoration: InputDecoration(labelText: widget.label),
      onChanged: widget.onChanged,
    );
  }
}

class _IntentInput extends StatelessWidget {
  const _IntentInput({required this.state, required this.controller});

  final OnboardingUiState state;
  final OnboardingController controller;

  @override
  Widget build(BuildContext context) {
    return SegmentedButton<OnboardingIntent>(
      segments: const [
        ButtonSegment(value: OnboardingIntent.dating, label: Text('Dating')),
        ButtonSegment(
          value: OnboardingIntent.friendship,
          label: Text('Friend'),
        ),
        ButtonSegment(value: OnboardingIntent.chat, label: Text('Chat')),
      ],
      selected: {state.draft.intent},
      onSelectionChanged: (value) =>
          controller.update(state.draft.copyWith(intent: value.first)),
    );
  }
}

class _GenderInput extends StatelessWidget {
  const _GenderInput({required this.state, required this.controller});

  final OnboardingUiState state;
  final OnboardingController controller;

  @override
  Widget build(BuildContext context) {
    return SegmentedButton<OnboardingGender>(
      segments: OnboardingGender.values
          .map(
            (gender) =>
                ButtonSegment(value: gender, label: Text(_genderLabel(gender))),
          )
          .toList(),
      selected: {state.draft.selfGender},
      onSelectionChanged: (value) =>
          controller.update(state.draft.copyWith(selfGender: value.first)),
    );
  }
}

class _PhotoInput extends StatelessWidget {
  const _PhotoInput({required this.state, required this.controller});

  final OnboardingUiState state;
  final OnboardingController controller;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        FilledButton.icon(
          onPressed: state.loading ? null : controller.addPhoto,
          icon: const Icon(Icons.add_a_photo_outlined),
          label: const Text('Select and upload photo'),
        ),
        const SizedBox(height: 12),
        for (final photo in state.draft.photos)
          ListTile(
            leading: const Icon(Icons.photo_outlined),
            title: Text('Photo ${state.draft.photos.indexOf(photo) + 1}'),
            subtitle: Text(profilePhotoStatusLabel(photo)),
          ),
      ],
    );
  }
}

class _ProfileTextInput extends StatelessWidget {
  const _ProfileTextInput({required this.state, required this.controller});

  final OnboardingUiState state;
  final OnboardingController controller;

  @override
  Widget build(BuildContext context) {
    final interests = ['coffee', 'music', 'walking', 'books', 'tech'];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _TextInput(
          label: 'Bio',
          initialValue: state.draft.bio,
          onChanged: (value) =>
              controller.update(state.draft.copyWith(bio: value)),
        ),
        const SizedBox(height: 16),
        Wrap(
          spacing: 8,
          children: interests.map((interest) {
            final selected = state.draft.interests.contains(interest);
            return FilterChip(
              label: Text(interest),
              selected: selected,
              onSelected: (value) {
                final next = [...state.draft.interests];
                value ? next.add(interest) : next.remove(interest);
                controller.update(state.draft.copyWith(interests: next));
              },
            );
          }).toList(),
        ),
      ],
    );
  }
}

class _ConsentInput extends StatelessWidget {
  const _ConsentInput({required this.state, required this.controller});

  final OnboardingUiState state;
  final OnboardingController controller;

  @override
  Widget build(BuildContext context) {
    final draft = state.draft;

    return Column(
      children: [
        _ConsentTile(
          value: draft.acceptedTerms,
          title: 'I accept the terms',
          onChanged: (value) =>
              controller.update(draft.copyWith(acceptedTerms: value)),
        ),
        _ConsentTile(
          value: draft.acceptedPrivacy,
          title: 'I accept the privacy notice',
          onChanged: (value) =>
              controller.update(draft.copyWith(acceptedPrivacy: value)),
        ),
        _ConsentTile(
          value: draft.acceptedExplicitData,
          title: 'I consent to explicit data processing',
          onChanged: (value) =>
              controller.update(draft.copyWith(acceptedExplicitData: value)),
        ),
        _ConsentTile(
          value: draft.analyticsConsent,
          title: 'Allow analytics',
          onChanged: (value) =>
              controller.update(draft.copyWith(analyticsConsent: value)),
        ),
        _ConsentTile(
          value: draft.marketingConsent,
          title: 'Allow marketing notifications',
          onChanged: (value) =>
              controller.update(draft.copyWith(marketingConsent: value)),
        ),
      ],
    );
  }
}

class _ConsentTile extends StatelessWidget {
  const _ConsentTile({
    required this.value,
    required this.title,
    required this.onChanged,
  });

  final bool value;
  final String title;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return CheckboxListTile(
      value: value,
      title: Text(title),
      onChanged: (value) => onChanged(value ?? false),
    );
  }
}

class _Review extends StatelessWidget {
  const _Review({required this.state});

  final OnboardingUiState state;

  @override
  Widget build(BuildContext context) {
    final draft = state.draft;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Name: ${draft.displayName}'),
        const Text('City: Istanbul'),
        Text('Photos: ${draft.photos.length}'),
        Text('Interests: ${draft.interests.join(', ')}'),
      ],
    );
  }
}

String _title(int step) {
  return switch (step) {
    0 => 'Age check',
    1 => 'Display name',
    2 => 'Intent',
    3 => 'Gender',
    4 => 'Photos',
    5 => 'Profile details',
    6 => 'Consents',
    _ => 'Review',
  };
}

String _genderLabel(OnboardingGender gender) {
  return switch (gender) {
    OnboardingGender.male => 'Male',
    OnboardingGender.female => 'Female',
    OnboardingGender.nonbinary => 'Nonbinary',
    OnboardingGender.unspecified => 'Prefer not to say',
  };
}
