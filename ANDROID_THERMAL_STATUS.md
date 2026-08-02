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

## Initial printer scope

Initial production target:

1. Android Bluetooth Classic printers that expose the common ESC/POS serial
   profile.
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

- Physical testing of the first printer checkpoint found that paired-device-only
  listing and a connect-per-print socket did not match normal POS pairing UX;
  the app could report bytes written even though the printer produced no paper.
- The remediation adds nearby-device discovery, Android 12+ `BLUETOOTH_SCAN`
  permission (and legacy location permission through Android 11), Android system
  pairing/PIN flow, explicit connect/disconnect controls, and a persistent SPP
  socket. Test print is disabled until the selected address is connected.
- Print success now means bytes were written through the active socket; the UI
  explicitly asks the cashier to verify the paper instead of claiming physical
  output that Android cannot observe.
- The Android build script now fails on unsuccessful npm/Gradle child processes,
  runs debug unit tests, and only copies an APK after a successful build. This
  prevents a stale APK from being mistaken for the latest checkpoint.
- Install the updated APK on a physical Android device and test nearby discovery,
  system PIN pairing, connect, print, disconnect/reconnect, Bluetooth-off, and
  printer-off handling.
- Verify physical output for long menu names, discounts, cash change,
  void/reprint labels, and both 58 mm and 80 mm paper profiles.
- Validate the final paper output on physical printers before declaring thermal
  printing production-ready.

## Preview parity and online build checkpoint

Implemented after the first successful physical Bluetooth print:

- The Android build now receives the same public Supabase project URL and
  publishable key as Vercel through a git-ignored `.env.local`; credentials are
  embedded only in the local APK build and are not committed to the repository.
- A local production preview confirms that the configured build opens the Cafe
  POS login screen instead of the previous local/demo fallback.
- The Santara receipt logo background was removed from the original pixels and
  saved as a transparent PNG, preserving the exact brand contours.
- Web Print Preview uses the transparent logo and selects business-specific
  branding for Santara Coffee versus Parama Cafe.
- Android ESC/POS printing converts the same transparent logo into a centered
  monochrome raster image for 58 mm or 80 mm paper.
- Thermal text now mirrors the preview content more closely: item table header,
  quantity/unit-price/total columns, item separators, discount breakdown and
  total discount, cash dividers, WiFi block, thank-you message, and footer dots.
- Installing the next APK over the existing app is required to preserve its
  local WebView data and queued operations before logging in and syncing.
