import 'package:flutter_test/flutter_test.dart';
import 'package:samecharge/bootstrap_failure_app.dart';

void main() {
  testWidgets('bootstrap failure screen hides raw initialization errors', (
    tester,
  ) async {
    await tester.pumpWidget(BootstrapFailureApp(onRetry: () {}));

    expect(find.text('Başlatma tamamlanamadı'), findsOneWidget);
    expect(find.text('Lütfen tekrar deneyin.'), findsOneWidget);
    expect(find.text('Tekrar dene'), findsOneWidget);
    expect(find.textContaining('PlatformException'), findsNothing);
    expect(find.textContaining('samecharge-dev-freddie336'), findsNothing);
    expect(find.textContaining('1:990331240438'), findsNothing);
  });
}
