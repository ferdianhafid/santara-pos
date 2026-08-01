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

## Printer implementation checkpoint

Implemented after the Android shell checkpoint:

- Native Capacitor `ThermalPrinter` bridge registered in the Android activity.
- Runtime Nearby Devices permission handling through `BLUETOOTH_CONNECT` on
  Android 12+ plus legacy Bluetooth manifest permissions through Android 11.
- Paired Bluetooth Classic/dual-mode device listing without background scanning
  or location access.
- RFCOMM Serial Port Profile connection and chunked ESC/POS byte transmission.
- Business-scoped, device-local printer settings for device address, 58/80 mm
  paper profile, and optional cutter command.
- Android-only Settings panel for permission, paired-printer selection, saved
  width, connection feedback, and test print. The web renders an informational
  `Web Print` fallback and does not show Bluetooth controls.
- Direct Android print from the latest-receipt and receipt-history reprint
  buttons; browser builds keep using `window.print()`.
- Receipt text encoder with 32-column (58 mm) and 48-column (80 mm) profiles,
  long-name wrapping, item/transaction discounts, cash received/change,
  reprint/void labels, feed, and optional partial cut.
- Three automated encoder tests pass for width constraints and ESC/POS framing.
- Android debug compilation succeeds with the native bridge, and the updated APK
  is copied to `artifacts/android/cafe-pos-debug.apk`.
- Local browser regression passed for the cashier flow, completed receipt,
  enabled web print button, Settings printer panel, and hidden Bluetooth controls.

## Remaining validation

- Install the APK on a physical Android device and test permission, paired-device
  listing, connect, print, reconnect, Bluetooth-off, and printer-off handling.
- Verify physical output for long menu names, discounts, cash change,
  void/reprint labels, and both 58 mm and 80 mm paper profiles.
- Validate the final paper output on physical printers before declaring thermal
  printing production-ready.
