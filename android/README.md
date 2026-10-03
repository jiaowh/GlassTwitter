# Glass X for Android

An unofficial Android WebView wrapper around X with a liquid-glass Home feed.
Current app version: **0.1.5**. Android Studio is optional.

## Build on Windows

From this folder, run:

```powershell
# First read https://developer.android.com/studio/terms
.\setup-tools.ps1 -AcceptAndroidSdkLicense
.\build.ps1
```

The setup script downloads a verified portable JDK 17 and Android SDK command-line
tools into `%LOCALAPPDATA%/GlassXBuild`. It does not change your system PATH.
The included Gradle wrapper downloads the build dependencies. `build.ps1` copies
the shared assets, builds the debug APK and runs Android lint.

Output: `app/build/outputs/apk/debug/app-debug.apk`.

## Install

Transfer the APK to an Android 8+ phone, open it using Files, and allow installation
from that source. Keep Android System WebView updated for modern CSS support.

For USB installation, enable USB debugging, authorize the computer on your phone,
connect one device, then run:

```powershell
.\install.ps1
```

Install updates over the existing app to preserve its local session. Updates must
use the same signing key. These scripts produce debug builds for personal testing;
release signing and store publication are not configured. Do not commit signing keys.

## Interface

- A single Home feed with 1px image-reflection blur.
- A bottom dock outside the WebView: **For you · 𝕏 · Following**.
- Tap 𝕏 to refresh from the top; the other buttons activate X's native feed tabs.
- The old header, floating compose shortcut and blue new-posts pill are hidden on Home.
- Glass layers are clipped to each tweet without clipping native tweet controls.
- Android system Back navigates history and exits fullscreen video.
- Tap an inline loading-error message to retry.

## Filtering

`app/src/main/assets/ad-filter.js` hides posts carrying supported ad test IDs or
explicit promotional disclosures outside the post text, author identity and quotes.
It supports English and several Japanese/Chinese labels. Ordinary reposts remain.
It cannot identify all undisclosed paid content or algorithmically boosted posts.
It filters rendered content rather than preventing ad requests. X DOM changes
can affect both detection and feed remeasurement.

## Maintenance

Shared source lives in the repository root (`styles.css` and `content.js`).
`build.ps1` runs `sync-assets.ps1` to copy those files into the Android assets.
Edit `app.css`, `app.js` and `ad-filter.js` directly for Android-specific behavior.
The app icon uses Android vector/adaptive resources; no raster generation is
required for a build.

## Session and compatibility

The app uses X's own login flow and keeps cookies in its local WebView storage.
There is no native JavaScript bridge and no native credential collection.
Clear the app's Android storage to erase the session. HTTPS certificate failures
are cancelled. Backup/device transfer rules exclude app data.

X may restrict embedded-browser login. External Google/Apple sign-in opens in the
browser, whose cookies do not transfer back to the app. Camera/microphone capture,
push notifications, native downloads and OAuth integration are not implemented.
Uploads use the Android file picker; videos can use fullscreen mode.

## Validation

The command-line build, Android lint and APK signature verification passed for
0.1.5. Targeted browser fixtures checked reflection boundaries, action colors,
ad disclosures, header suppression and tab handlers. These do not replace testing
against X on a real phone. Verify login/2FA, scrolling, likes/reposts, uploads,
fullscreen playback, keyboard insets and orientation changes on your device.
