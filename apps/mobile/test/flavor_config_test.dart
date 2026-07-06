import 'package:flutter_test/flutter_test.dart';
import 'package:samecharge/core/config/app_config.dart';
import 'package:samecharge/core/config/app_environment.dart';

void main() {
  test('flavor entrypoint configurations stay separate', () {
    final dev = AppConfig.forEnvironment(AppEnvironment.dev);
    final prod = AppConfig.forEnvironment(AppEnvironment.prod);

    expect(dev.environment, isNot(prod.environment));
    expect(dev.displayName, 'SameCharge Dev');
    expect(prod.displayName, 'SameCharge');
  });
}
