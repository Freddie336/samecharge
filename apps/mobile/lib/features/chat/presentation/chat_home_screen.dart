import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../discovery/presentation/discovery_screen.dart';
import '../domain/chat_models.dart';
import 'chat_controller.dart';

class ChatHomeScreen extends StatefulWidget {
  const ChatHomeScreen({super.key});

  @override
  State<ChatHomeScreen> createState() => _ChatHomeScreenState();
}

class _ChatHomeScreenState extends State<ChatHomeScreen> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _index == 0 ? const ChatScreen() : const DiscoveryScreen(),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (value) => setState(() => _index = value),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.chat_bubble_outline),
            selectedIcon: Icon(Icons.chat_bubble),
            label: 'Matches',
          ),
          NavigationDestination(
            icon: Icon(Icons.explore_outlined),
            selectedIcon: Icon(Icons.explore),
            label: 'Discover',
          ),
        ],
      ),
    );
  }
}

class ChatScreen extends ConsumerStatefulWidget {
  const ChatScreen({super.key});

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  final _composer = TextEditingController();
  bool _loaded = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_loaded) {
      _loaded = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        ref.read(chatControllerProvider.notifier).loadMatches();
      });
    }
  }

  @override
  void dispose() {
    _composer.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(chatControllerProvider);
    final controller = ref.read(chatControllerProvider.notifier);

    return SafeArea(
      child: state.activeMatch == null
          ? _MatchListView(state: state, controller: controller)
          : _ChatDetailView(
              state: state,
              controller: controller,
              composer: _composer,
            ),
    );
  }
}

class _MatchListView extends StatelessWidget {
  const _MatchListView({required this.state, required this.controller});

  final ChatUiState state;
  final ChatController controller;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Matches',
                  style: Theme.of(context).textTheme.headlineMedium,
                ),
              ),
              IconButton(
                tooltip: 'Refresh',
                onPressed: state.loadingMatches ? null : controller.loadMatches,
                icon: const Icon(Icons.refresh),
              ),
            ],
          ),
          if (state.errorMessage != null)
            _ErrorText(message: state.errorMessage!),
          const SizedBox(height: 12),
          if (state.loadingMatches)
            const Expanded(child: Center(child: CircularProgressIndicator()))
          else if (state.matchListEmpty)
            const Expanded(
              child: Center(
                child: Text(
                  'No matches yet',
                  key: Key('empty-matches-title'),
                  textAlign: TextAlign.center,
                ),
              ),
            )
          else
            Expanded(
              child: ListView.separated(
                itemBuilder: (context, index) {
                  final match = state.matches[index];
                  return _MatchTile(
                    match: match,
                    onTap: () => controller.openMatch(match),
                  );
                },
                separatorBuilder: (_, _) => const Divider(height: 1),
                itemCount: state.matches.length,
              ),
            ),
        ],
      ),
    );
  }
}

class _MatchTile extends StatelessWidget {
  const _MatchTile({required this.match, required this.onTap});

  final ChatMatchSummary match;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final subtitle = match.lastMessagePreview ?? 'Start the conversation';
    final age = match.counterpartAge == null ? '' : ', ${match.counterpartAge}';

    return ListTile(
      key: Key('match-${match.matchId}'),
      onTap: onTap,
      leading: CircleAvatar(child: Text('${match.photoRefs.length}')),
      title: Text('${match.counterpartDisplayName}$age'),
      subtitle: Text(subtitle, maxLines: 1, overflow: TextOverflow.ellipsis),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (match.muted) const Icon(Icons.notifications_off, size: 18),
          if (match.unreadCount > 0) Badge(label: Text('${match.unreadCount}')),
        ],
      ),
    );
  }
}

class _ChatDetailView extends StatelessWidget {
  const _ChatDetailView({
    required this.state,
    required this.controller,
    required this.composer,
  });

  final ChatUiState state;
  final ChatController controller;
  final TextEditingController composer;

  @override
  Widget build(BuildContext context) {
    final match = state.activeMatch!;
    final disabledReason = _disabledReason(match);

    return Column(
      children: [
        ListTile(
          leading: IconButton(
            key: const Key('chat-back-button'),
            tooltip: 'Back',
            onPressed: controller.closeMatch,
            icon: const Icon(Icons.arrow_back),
          ),
          title: Text(match.counterpartDisplayName),
          subtitle: disabledReason == null ? null : Text(disabledReason),
          trailing: IconButton(
            key: const Key('mute-button'),
            tooltip: match.muted ? 'Unmute' : 'Mute',
            onPressed: controller.toggleMute,
            icon: Icon(
              match.muted ? Icons.notifications_off : Icons.notifications,
            ),
          ),
        ),
        if (state.errorMessage != null)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: _ErrorText(message: state.errorMessage!),
          ),
        if (state.loadingMessages)
          const Expanded(child: Center(child: CircularProgressIndicator()))
        else
          Expanded(
            child: ListView.builder(
              key: const Key('message-list'),
              padding: const EdgeInsets.all(16),
              itemBuilder: (context, index) {
                final message = state.messages[index];
                return Align(
                  alignment: message.isMine
                      ? Alignment.centerRight
                      : Alignment.centerLeft,
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      color: message.isMine
                          ? Theme.of(context).colorScheme.primaryContainer
                          : const Color(0xFFE2E8F0),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(10),
                      child: Text(message.text),
                    ),
                  ),
                );
              },
              itemCount: state.messages.length,
            ),
          ),
        _Composer(
          controller: composer,
          enabled: state.canSend,
          sending: state.sending,
          disabledReason: disabledReason,
          onSend: () async {
            final text = composer.text;
            final sent = await controller.sendText(text);
            if (sent) {
              composer.clear();
            }
          },
        ),
      ],
    );
  }
}

class _Composer extends StatefulWidget {
  const _Composer({
    required this.controller,
    required this.enabled,
    required this.sending,
    required this.onSend,
    this.disabledReason,
  });

  final TextEditingController controller;
  final bool enabled;
  final bool sending;
  final String? disabledReason;
  final Future<void> Function() onSend;

  @override
  State<_Composer> createState() => _ComposerState();
}

class _ComposerState extends State<_Composer> {
  @override
  Widget build(BuildContext context) {
    final canTap =
        widget.enabled &&
        !widget.sending &&
        widget.controller.text.trim().isNotEmpty;

    return Padding(
      padding: const EdgeInsets.all(12),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              key: const Key('message-composer'),
              controller: widget.controller,
              enabled: widget.enabled,
              minLines: 1,
              maxLines: 4,
              maxLength: 1000,
              onChanged: (_) => setState(() {}),
              decoration: InputDecoration(
                hintText: widget.disabledReason ?? 'Message',
                counterText: '',
              ),
            ),
          ),
          const SizedBox(width: 8),
          IconButton.filled(
            key: const Key('send-message-button'),
            tooltip: 'Send',
            onPressed: canTap ? widget.onSend : null,
            icon: widget.sending
                ? const SizedBox.square(
                    dimension: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.send),
          ),
        ],
      ),
    );
  }
}

class _ErrorText extends StatelessWidget {
  const _ErrorText({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Text(
      message,
      key: const Key('chat-error'),
      textAlign: TextAlign.center,
      style: TextStyle(color: Theme.of(context).colorScheme.error),
    );
  }
}

String? _disabledReason(ChatMatchSummary match) {
  if (match.status != 'active' || match.blocked) {
    return 'This match is no longer active.';
  }
  if (!match.messagingEnabled) {
    return 'Messaging is disabled for this match.';
  }

  return null;
}
