<div align="center">

<img src="docs/media/app-icon.png" width="128" alt="Blue bird on a dark glass background">

# Glass X

A liquid-glass timeline for X, on Android and desktop.

[Download APK](https://github.com/jiaowh/GlassTwitter/releases/download/v0.1.5/GlassX.apk) · [Watch demos](#demos)

</div>

Glass X extends the colors of each post’s media into a dark glass surface around
that post. Images stay sharp, reflections stay inside their own tweet, and the
feed keeps X’s native interactions.

This repository includes an **Android app** and a **Chrome Manifest V3 extension**.
The Android app wraps X’s website in a WebView; it is not a standalone X API client.

## Demos

### Demo 1

https://github.com/user-attachments/assets/38c6580c-b773-4a02-bfb0-01553ea4f2a5

### Demo 2

https://github.com/user-attachments/assets/cda582f6-b204-44f1-ba5e-05edc7ca26a4

[Download demo 1](docs/media/demo-1.mp4) · [Download demo 2](docs/media/demo-2.mp4)

The recordings show the app at the time they were captured; later builds may
look slightly different.

## Features

- Media-derived glass backgrounds with a light **1px reflection blur**.
- Natural proportions for single photos; native video and gallery controls.
- Bright action icons and counts, with pink likes and green reposts.
- One native timeline: no copied posts or two-column reordering.
- Android bottom dock: **For you · 𝕏 · Following**. Tap 𝕏 to refresh.
- Android filtering for labelled ads, promoted posts and paid partnerships.
- Android suppression of the floating “posted” notification.
- Blue bird launcher icon on a glass-style background.

Ad filtering is based on visible disclosure labels and DOM markers. It cannot
reliably identify undisclosed sponsorships or algorithmic boosts. Ordinary reposts
are retained. Filtering is bundled with the Android app, not the desktop extension.

## Android

**[Download APK](https://github.com/jiaowh/GlassTwitter/releases/download/v0.1.5/GlassX.apk)**

Open the downloaded file on your Android phone and allow installation when prompted.
Requires Android 8 or newer. This is an experimental debug build.

For developers: [build from source](android/README.md#build-on-windows).

## Desktop: load the extension

1. Download or clone this repository.
2. Open `chrome://extensions` in desktop Chrome or Brave.
3. Enable **Developer mode**, then choose **Load unpacked**.
4. Select the repository root containing `manifest.json`.
5. Open or refresh `https://x.com/home`.

No npm packages or build step are needed for the extension. It also matches
`https://twitter.com/*`. The visual redesign is scoped to Home; profiles, search
and other routes retain their native styling. Desktop sidebars can be restored
with **Show navigation**. The Android app uses its own minimal bottom dock.

## Customize the glass

Edit the variables near the top of [`styles.css`](styles.css):

| Variable | Controls |
| --- | --- |
| `--gx-media-bleed-blur` | Reflection blur; currently `1px` |
| `--gx-media-bleed-opacity` | Reflection strength |
| `--gx-media-bleed-saturation` | Reflected color saturation |
| `--gx-glass-opacity` | Charcoal material opacity |
| `--gx-border-alpha` / `--gx-highlight-alpha` | Edge and light reflections |
| `--gx-media-radius` | Media corners |
| `--gx-action` | Unselected action color |
| `--gx-action-liked` / `--gx-action-reposted` | Selected action colors |

Reload the extension and page after editing. The Android build script copies
`styles.css` and `content.js` into app assets automatically.

## Project layout

```text
manifest.json                Desktop extension configuration
styles.css                   Shared liquid-glass visual system
content.js                   Home-route and media/layout adapters
android/                     Native Android wrapper and build scripts
  app/src/main/assets/       Bundled styling, mobile UI and ad filtering
  app/src/main/java/          WebView activity and bottom dock
docs/media/                  App icon preview and demo recordings
```

Selectors use semantic elements and test IDs such as `primaryColumn`, `cellInnerDiv`,
`tweet`, `tweetPhoto` and `videoPlayer`, rather than generated X class names.
X can change these structures, so adapters may need maintenance.

## Current limits

- X controls login, feed delivery and website behavior. Embedded-browser login,
  especially external Google/Apple sign-in, may fail; browser cookies are separate.
- Camera/microphone capture, push notifications and native downloads are not implemented.
- The app keeps its X session locally. Clear Android app storage to remove it.
- Ad hiding is a display filter; it does not stop ad network requests.
- Builds, Android lint and targeted DOM checks have passed. Device-specific behavior
  and future X changes still need testing.

## Project status

Experimental, unofficial software. Not affiliated with or endorsed by X/Twitter.
The Twitter bird and X names belong to their respective owners. Demo post content
belongs to its creators.
