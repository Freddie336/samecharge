enum AppEnvironment {
  dev,
  prod;

  String get label => switch (this) {
    AppEnvironment.dev => 'DEV',
    AppEnvironment.prod => 'PROD',
  };

  bool get isDevelopment => this == AppEnvironment.dev;
}
