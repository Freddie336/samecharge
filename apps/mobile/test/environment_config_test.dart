import 'package:flutter_test/flutter_test.dart';
import 'package:samecharge/core/config/app_config.dart';
import 'package:samecharge/core/config/app_environment.dart';

void main() {
  test('environment configuration maps dev and prod correctly', () {
    final dev = AppConfig.forEnvironment(AppEnvironment.dev);
    final prod = AppConfig.forEnvironment(AppEnvironment.prod);

    expect(dev.environment, AppEnvironment.dev);
    expect(dev.isDevelopment, isTrue);
    expect(dev.displayName, 'SameCharge Dev');
    expect(dev.isFirebaseConfigured, isFalse);

    expect(prod.environment, AppEnvironment.prod);
    expect(prod.isDevelopment, isFalse);
    expect(prod.displayName, 'SameCharge');
    expect(prod.isFirebaseConfigured, isFalse);
  });
}
