# Platform Builds

Read this reference only when producing installers or configuring build automation.

## Native Targets

Build each installer on its native operating system:

| Target | Typical output | Runner |
| --- | --- | --- |
| macOS | `.app`, `.dmg` | macOS |
| Windows | `.msi`, NSIS `.exe` | Windows |
| Linux | `.deb`, `.rpm`, `.AppImage` | Linux |
| Android | `.apk`, `.aab` | Android SDK/NDK runner |

Use `npm run tauri build` on a configured native runner. For several platforms, prefer a CI matrix with one runner per operating system. Code signing and notarization require credentials owned by the user or their organization; never invent, expose, or commit them.

For Android, initialize once with `npm run tauri -- android init`, then produce an APK with `npm run tauri -- android build --apk`. A release intended for Google Play normally uses an Android App Bundle and a user-owned signing key.

## Prerequisites

Follow current Tauri 2 prerequisites for each operating system. At minimum, expect Node.js, Rust, the platform WebView dependencies, and native build tools. Check the installed toolchain before attempting a build.

## Remote Website Checks

Test these flows in the packaged application because they commonly differ from a normal browser:

- OAuth and SSO redirects
- Popups and links using `target=_blank`
- File downloads and uploads
- Camera, microphone, notification, and clipboard permissions
- Third-party cookies and storage
- Custom URL schemes and deep links

If the remote site disallows or breaks embedded WebViews, report the limitation. Do not bypass security headers, TLS, or authentication controls.

## Artifact Reporting

After a build, report the exact artifact path, file type, and measured size. Do not estimate a universal 5 MB output; bundle size varies by platform and enabled features.
