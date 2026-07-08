import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/callable_bootstrap_repository.dart';
import '../domain/bootstrap_state.dart';

final bootstrapStateProvider = FutureProvider.autoDispose<BootstrapState>((
  ref,
) {
  return ref.watch(bootstrapRepositoryProvider).getAppBootstrap();
});
