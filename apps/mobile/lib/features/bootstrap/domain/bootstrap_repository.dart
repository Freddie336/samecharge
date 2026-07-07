import 'bootstrap_state.dart';

abstract class BootstrapRepository {
  Future<BootstrapState> getAppBootstrap();
}
