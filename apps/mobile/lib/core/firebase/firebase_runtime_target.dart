enum FirebaseRuntimeTarget {
  disabled,
  emulator,
  devCloud;

  bool get isEnabled => this != FirebaseRuntimeTarget.disabled;

  String get statusLabel {
    return switch (this) {
      FirebaseRuntimeTarget.disabled => 'Firebase disabled',
      FirebaseRuntimeTarget.emulator => 'Firebase emulator configured',
      FirebaseRuntimeTarget.devCloud => 'Firebase dev configured',
    };
  }
}
