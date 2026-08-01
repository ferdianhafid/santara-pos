# Android and Thermal Printer Status

## Safe baseline

The production website remains on the existing dual-cafe behavior and can stay
online during Android development. Native-only functionality must remain behind
Capacitor platform checks so browser printing continues to work as before.

Android checkpoint created on 2026-08-01:

- Capacitor `8.5.0` added to the existing Vite/React application.
- Android application ID: `com.ferdian.cafepos`.
- Android display name: `Cafe POS`.
- Minimum Android SDK: 24 (generated Capacitor default).
- Target/compile Android SDK: 36 (generated Capacitor default).
- `npm run android:build:debug` builds the web bundle, syncs Capacitor, builds a
  debug APK, and copies it to `artifacts/android/cafe-pos-debug.apk`.
- The first debug APK was built successfully before printer integration.
- Production dependency audit (`npm audit --omit=dev`) reports zero known
  vulnerabilities at this checkpoint.

The workspace path contains non-ASCII characters. The Android build script maps
the repository to a temporary ASCII drive and keeps Gradle caches/build output
under `%LOCALAPPDATA%\SantaraPOS\gradle`; this avoids Gradle/AAPT path failures
without moving the repository.

## Planned printer scope

Initial production target:

1. Android Bluetooth Classic printers that expose the common ESC/POS serial
   profile and are already paired in Android settings.
2. Paper profiles for 58 mm and 80 mm.
3. Printer selection, saved paper width, test print, connection feedback, and
   direct receipt print from checkout/reprint.
4. Browser fallback through the existing `window.print()` flow.
5. Pure receipt encoding tests plus Android debug build and web regression.

## Remaining validation

- Implement and compile the native Bluetooth ESC/POS bridge.
- Add runtime `BLUETOOTH_CONNECT` permission handling for Android 12+ and legacy
  Bluetooth permissions for older supported devices.
- Test paired-device listing, connect, print, reconnect, and error handling.
- Verify long menu names, discounts, cash change, void/reprint labels, and both
  58 mm and 80 mm output profiles.
- Install the APK on a physical Android device and approve Nearby Devices.
- Validate the final paper output on physical printers before declaring thermal
  printing production-ready.
