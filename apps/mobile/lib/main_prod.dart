import 'bootstrap.dart';
import 'core/config/app_environment.dart';

Future<void> main() {
  return bootstrap(AppEnvironment.prod);
}
