import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../domain/discovery_candidate.dart';
import 'discovery_controller.dart';

class DiscoveryScreen extends ConsumerStatefulWidget {
  const DiscoveryScreen({super.key});

  @override
  ConsumerState<DiscoveryScreen> createState() => _DiscoveryScreenState();
}

class _DiscoveryScreenState extends ConsumerState<DiscoveryScreen> {
  bool _loaded = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_loaded) {
      _loaded = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        ref.read(discoveryControllerProvider.notifier).refresh();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(discoveryControllerProvider);
    final controller = ref.read(discoveryControllerProvider.notifier);
    final candidate = state.currentCandidate;

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      'SameCharge',
                      style: Theme.of(context).textTheme.headlineMedium,
                    ),
                  ),
                  IconButton(
                    tooltip: 'Refresh',
                    onPressed: state.loading || state.submitting
                        ? null
                        : controller.refresh,
                    icon: const Icon(Icons.refresh),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              if (state.loading)
                const Expanded(
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (state.match != null)
                Expanded(
                  child: _MatchView(
                    match: state.match!,
                    onContinue: controller.dismissMatch,
                  ),
                )
              else if (candidate != null)
                Expanded(
                  child: _CandidateCard(
                    candidate: candidate,
                    submitting: state.submitting,
                    errorMessage: state.errorMessage,
                    tokenExpired: state.tokenExpired,
                    onLike: controller.like,
                    onPass: controller.pass,
                    onRefresh: controller.refresh,
                  ),
                )
              else
                Expanded(
                  child: _EmptyDiscovery(
                    errorMessage: state.errorMessage,
                    onRefresh: controller.refresh,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CandidateCard extends StatelessWidget {
  const _CandidateCard({
    required this.candidate,
    required this.submitting,
    required this.onLike,
    required this.onPass,
    required this.onRefresh,
    this.errorMessage,
    this.tokenExpired = false,
  });

  final DiscoveryCandidate candidate;
  final bool submitting;
  final String? errorMessage;
  final bool tokenExpired;
  final VoidCallback onLike;
  final VoidCallback onPass;
  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Expanded(
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border.all(color: const Color(0xFFE2E8F0)),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _PhotoPreview(photoCount: candidate.photoRefs.length),
                    const SizedBox(height: 16),
                    Text(
                      '${candidate.displayName}, ${candidate.age}',
                      style: theme.textTheme.headlineMedium,
                    ),
                    const SizedBox(height: 4),
                    Text(candidate.cityLabel),
                    const SizedBox(height: 16),
                    Text(candidate.bio, style: theme.textTheme.bodyLarge),
                    const SizedBox(height: 16),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        for (final interest in candidate.interests)
                          Chip(label: Text(interest)),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Text('Battery: ${candidate.batteryLabel}'),
                    Text('Difference: ${candidate.batteryDifference}%'),
                  ],
                ),
              ),
            ),
          ),
        ),
        if (errorMessage != null) ...[
          const SizedBox(height: 12),
          Text(
            errorMessage!,
            key: const Key('discovery-error'),
            textAlign: TextAlign.center,
            style: TextStyle(color: theme.colorScheme.error),
          ),
        ],
        const SizedBox(height: 16),
        if (tokenExpired)
          FilledButton.icon(
            key: const Key('refresh-discovery-button'),
            onPressed: submitting ? null : onRefresh,
            icon: const Icon(Icons.refresh),
            label: const Text('Refresh discovery'),
          )
        else
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  key: const Key('pass-button'),
                  onPressed: submitting ? null : onPass,
                  icon: const Icon(Icons.close),
                  label: const Text('Pass'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: FilledButton.icon(
                  key: const Key('like-button'),
                  onPressed: submitting ? null : onLike,
                  icon: const Icon(Icons.favorite),
                  label: Text(submitting ? 'Sending' : 'Like'),
                ),
              ),
            ],
          ),
      ],
    );
  }
}

class _PhotoPreview extends StatelessWidget {
  const _PhotoPreview({required this.photoCount});

  final int photoCount;

  @override
  Widget build(BuildContext context) {
    return AspectRatio(
      aspectRatio: 4 / 3,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: const Color(0xFFEFF6FF),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.photo_camera, size: 40),
              const SizedBox(height: 8),
              Text('$photoCount approved photo${photoCount == 1 ? '' : 's'}'),
            ],
          ),
        ),
      ),
    );
  }
}

class _MatchView extends StatelessWidget {
  const _MatchView({required this.match, required this.onContinue});

  final DiscoveryMatched match;
  final VoidCallback onContinue;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Icon(Icons.favorite, size: 56, color: Color(0xFFE11D48)),
        const SizedBox(height: 16),
        Text(
          "It's a match",
          key: const Key('match-title'),
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.headlineMedium,
        ),
        const SizedBox(height: 8),
        Text(
          '${match.match.displayName}, ${match.match.age}',
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 24),
        FilledButton(
          key: const Key('continue-discovery-button'),
          onPressed: onContinue,
          child: const Text('Continue discovery'),
        ),
      ],
    );
  }
}

class _EmptyDiscovery extends StatelessWidget {
  const _EmptyDiscovery({required this.onRefresh, this.errorMessage});

  final String? errorMessage;
  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'No candidates right now',
          key: const Key('empty-discovery-title'),
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.headlineMedium,
        ),
        const SizedBox(height: 8),
        Text(
          errorMessage ?? 'Try again soon when fresh presence changes.',
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 24),
        FilledButton.icon(
          onPressed: onRefresh,
          icon: const Icon(Icons.refresh),
          label: const Text('Search again'),
        ),
      ],
    );
  }
}
