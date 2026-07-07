import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/errors/app_failure.dart';
import '../../../core/firebase/firebase_services.dart';
import '../domain/bootstrap_repository.dart';
import '../domain/bootstrap_state.dart';

const getAppBootstrapCallableName = 'getAppBootstrap';

final bootstrapRepositoryProvider = Provider<BootstrapRepository>((ref) {
  final functions = ref.watch(firebaseServicesProvider).functions;
  if (functions == null) {
    return const DisabledBootstrapRepository();
  }

  return CallableBootstrapRepository(functions);
});

class DisabledBootstrapRepository implements BootstrapRepository {
  const DisabledBootstrapRepository();

  @override
  Future<BootstrapState> getAppBootstrap() {
    throw const AppFailure('Firebase bağlantısı kapalı.');
  }
}

class CallableBootstrapRepository implements BootstrapRepository {
  const CallableBootstrapRepository(this._functions);

  final FirebaseFunctions _functions;

  @override
  Future<BootstrapState> getAppBootstrap() async {
    try {
      final result = await _functions
          .httpsCallable(getAppBootstrapCallableName)
          .call<Map<Object?, Object?>>();
      return _parseBootstrap(Map<String, dynamic>.from(result.data));
    } on FirebaseFunctionsException catch (error) {
      throw AppFailure(_callableMessage(error));
    }
  }
}

BootstrapState _parseBootstrap(Map<String, dynamic> data) {
  return BootstrapState(
    onboardingStatus: _onboardingStatus(data['onboardingStatus'] as String?),
    accountStatus: _accountStatus(data['accountStatus'] as String?),
    profileStatus: _profileStatus(data['profileStatus'] as String?),
    discoveryEligible: data['discoveryEligible'] == true,
    moderationActionRequired: data['moderationActionRequired'] == true,
  );
}

OnboardingStatus _onboardingStatus(String? value) {
  return switch (value) {
    'in_progress' => OnboardingStatus.inProgress,
    'completed' => OnboardingStatus.completed,
    _ => OnboardingStatus.notStarted,
  };
}

PublicAccountStatus _accountStatus(String? value) {
  return switch (value) {
    'suspended' => PublicAccountStatus.suspended,
    'deletion_pending' => PublicAccountStatus.deletionPending,
    _ => PublicAccountStatus.active,
  };
}

ProfileStatus _profileStatus(String? value) {
  return switch (value) {
    'pending' => ProfileStatus.pending,
    'approved' => ProfileStatus.approved,
    'rejected' => ProfileStatus.rejected,
    'needs_review' => ProfileStatus.needsReview,
    _ => ProfileStatus.draft,
  };
}

String _callableMessage(FirebaseFunctionsException error) {
  final details = error.details;
  if (details is Map && details['code'] == 'input_invalid') {
    return 'Gönderilen bilgiler geçerli değil.';
  }

  return 'Sunucu isteği tamamlanamadı.';
}
