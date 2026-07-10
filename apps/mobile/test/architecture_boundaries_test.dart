import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

const firebaseImports = [
  'package:firebase_core/',
  'package:firebase_auth/',
  'package:cloud_functions/',
  'package:firebase_app_check/',
  'package:cloud_firestore/',
  'package:firebase_database/',
  'package:firebase_storage/',
];

void main() {
  test('presentation files do not import Firebase packages directly', () {
    final presentationFiles = Directory('lib')
        .listSync(recursive: true)
        .whereType<File>()
        .where((file) {
          final normalizedPath = file.path.replaceAll(
            '/',
            Platform.pathSeparator,
          );

          return normalizedPath.endsWith('.dart') &&
              (normalizedPath.contains(
                    '${Platform.pathSeparator}presentation'
                    '${Platform.pathSeparator}',
                  ) ||
                  normalizedPath.startsWith(
                    'lib${Platform.pathSeparator}app'
                    '${Platform.pathSeparator}',
                  ));
        });

    for (final file in presentationFiles) {
      final content = file.readAsStringSync();

      for (final firebaseImport in firebaseImports) {
        expect(
          content.contains(firebaseImport),
          isFalse,
          reason: '${file.path} imports $firebaseImport',
        );
      }
    }
  });

  test('presentation files do not hardcode callable names', () {
    final presentationFiles = Directory('lib')
        .listSync(recursive: true)
        .whereType<File>()
        .where((file) {
          final normalizedPath = file.path.replaceAll(
            '/',
            Platform.pathSeparator,
          );

          return normalizedPath.endsWith('.dart') &&
              normalizedPath.contains(
                '${Platform.pathSeparator}presentation'
                '${Platform.pathSeparator}',
              );
        });

    for (final file in presentationFiles) {
      final content = file.readAsStringSync();

      expect(content.contains("'getAppBootstrap'"), isFalse);
      expect(content.contains("'completeOnboarding'"), isFalse);
      expect(content.contains("'finalizeProfilePhoto'"), isFalse);
      expect(content.contains("'startDiscovery'"), isFalse);
      expect(content.contains("'submitDiscoveryDecision'"), isFalse);
      expect(content.contains("'sendMessage'"), isFalse);
      expect(content.contains("'markMatchRead'"), isFalse);
      expect(content.contains("'setMatchMuted'"), isFalse);
    }
  });

  test(
    'mobile source does not contain prod project or credential material',
    () {
      final sourceFiles = Directory('lib')
          .listSync(recursive: true)
          .whereType<File>()
          .where((file) => file.path.endsWith('.dart'));
      final allowedDevProjectFiles = {
        'lib${Platform.pathSeparator}core${Platform.pathSeparator}firebase'
            '${Platform.pathSeparator}firebase_options_dev.dart',
      };

      for (final file in sourceFiles) {
        final normalizedPath = file.path.replaceAll(
          '/',
          Platform.pathSeparator,
        );
        final content = file.readAsStringSync();

        expect(content.contains('samecharge-prod-freddie336'), isFalse);
        expect(content.contains('-----BEGIN PRIVATE KEY-----'), isFalse);
        expect(content.contains('private_key'), isFalse);
        expect(content.contains('app_check_debug_token'), isFalse);
        expect(content.contains('"client"'), isFalse);
        expect(content.contains('google-services.json'), isFalse);

        if (content.contains('samecharge-dev-freddie336')) {
          expect(allowedDevProjectFiles.contains(normalizedPath), isTrue);
        }
      }
    },
  );
}
