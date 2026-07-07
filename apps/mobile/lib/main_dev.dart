import 'bootstrap.dart';
import 'core/config/app_environment.dart';
import 'core/firebase/firebase_options_dev.dart';

Future<void> main() {
  return bootstrap(
    AppEnvironment.dev,
    devCloudOptions: DefaultFirebaseOptions.android,
  );
}
