---
name: web-to-app
description: Package an HTTP or HTTPS website as a lightweight Tauri desktop application for macOS, Windows, or Linux. Use when a user asks to turn a URL, web tool, admin console, or documentation site into an installable desktop app; not for rebuilding the site as a native UI.
---

# Web To App

Turn a user-provided URL into a maintainable Tauri 2 project, then build it when the current environment supports the requested target.

## Gather The Configuration

Infer sensible defaults and ask only for information that materially changes the result. Required input is the URL. Optional inputs are:

- Product name and bundle identifier
- Target platforms
- Window width, height, resizability, title, and always-on-top behavior
- Application icon
- Keyboard shortcuts or tray behavior
- Authentication, deep-linking, downloads, notifications, or other native capabilities

Normalize missing schemes to `https://` only when that intent is unambiguous. Reject schemes other than HTTP and HTTPS. Do not request, store, or embed website passwords, session cookies, or API keys.

## Choose The Delivery

- If the user wants a project, run `node scripts/scaffold.mjs` and return the generated source directory.
- If the user wants an installer, generate the source first and build on the target operating system. Read [references/platform-builds.md](references/platform-builds.md) before building or configuring CI.
- If the user requests multiple platforms from one machine, explain that native installers should be produced with a CI matrix or native runners. Do not imply that one local build produces all formats.

Use the platform WebView supplied by Tauri. Do not introduce a bundled browser engine unless a demonstrated compatibility requirement justifies the size increase.

## Implement Safely

Generate a Tauri 2 project with a remote window URL and the narrowest required capability set. Keep the Rust entrypoint minimal. Add plugins only for user-requested native behavior.

Before generation:

1. Confirm the final URL is syntactically valid and reachable when network access is available.
2. Derive a filesystem-safe slug and a reverse-domain-style bundle identifier.
3. Preserve the user's exact app name separately from the slug.
4. Use an explicit window configuration and minimum dimensions.

After generation, inspect the config and run available format or validation checks. If Rust and Tauri prerequisites are installed, run `cargo check` or the appropriate Tauri build command. Otherwise report the missing prerequisite without installing system software unless asked.

Remote sites may block embedded browsers, third-party cookies, popups, downloads, or OAuth redirects. Surface these constraints when detected. Do not weaken TLS validation or inject credentials to work around them.

## Size And Output Claims

Describe Tauri output as lightweight, but never promise a fixed package size. Installer size varies by operating system, enabled plugins, icons, and runtime dependencies. Report measured artifact sizes after a successful build.

Return the project path, target platforms, commands to build, and any unverified platform-specific behavior.

## Scaffold Command

```bash
node scripts/scaffold.mjs --url https://example.com --name "Example" --platforms macos,windows --width 1280 --height 820 --out ./output
```

Run `node scripts/scaffold.mjs --help` for all flags.
