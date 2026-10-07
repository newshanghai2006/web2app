# Web2App Studio

[简体中文](README.zh-CN.md) | English

Web2App Studio turns an HTTP or HTTPS website into a lightweight Tauri 2 application project for macOS, Windows, Linux, and Android. It provides a visual builder, optional AI-assisted configuration, custom app icons, project ZIP export, and direct APK download when the server has a complete Android build toolchain.

## Features

- AI-assisted and fully manual configuration modes
- macOS, Windows, Linux, and Android targets
- Window size, behavior, shortcut, and theme configuration
- PNG, JPG, or WebP icon upload, normalized to a 512 x 512 PNG
- Browser-generated Tauri source ZIP
- Optional server-side APK build and download
- Reusable Codex Skill and deterministic project scaffolder

## Repository layout

```text
web2app/
|-- src/                         React builder UI
|-- server.mjs                  AI and Android build endpoints
|-- scripts/visual-test.mjs     Browser integration test
|-- skills/web-to-app/          Reusable Codex Skill
|-- .env.example                Server configuration template
|-- README.md                   English documentation
`-- README.zh-CN.md             Chinese documentation
```

## Quick start

### Requirements

- Node.js 22 LTS or later recommended
- npm 10 or later
- Google Chrome at its standard Windows path only if running `npm run test:visual`

### Start the development server

```bash
npm install
npm run dev
```

Open <http://localhost:4173>.

Manual mode and the built-in local command parser work without credentials. To use the OpenAI-backed structured configuration assistant:

```powershell
Copy-Item .env.example .env
```

Then set `OPENAI_API_KEY` in `.env`. Never expose this key in frontend code or commit `.env`.

### Production build

```bash
npm run build
npm start
```

The production server serves `dist/` and listens on `PORT`, which defaults to `4173`.

## Install the Tauri desktop toolchain

Tauri uses the operating system WebView and a Rust backend. Node.js alone is enough to run this website, but Rust and platform build tools are required to compile exported applications.

### 1. Install Rust

Windows PowerShell:

```powershell
winget install --id Rustlang.Rustup
rustup default stable-msvc
```

macOS or Linux:

```bash
curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh
```

Restart the terminal, then verify:

```bash
rustc --version
cargo --version
rustup show
```

### 2. Install platform dependencies

#### Windows

1. Install [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/).
2. Select the **Desktop development with C++** workload.
3. Ensure [Microsoft Edge WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/) is installed. It is normally included with current Windows 10 and Windows 11 systems.
4. Enable the Windows **VBSCRIPT** optional feature if MSI creation fails with `failed to run light.exe`.

#### macOS

For desktop-only builds:

```bash
xcode-select --install
```

Install and launch the full Xcode application when Apple mobile targets are also required.

#### Debian or Ubuntu

```bash
sudo apt update
sudo apt install -y \
  libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libxdo-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev
```

Other Linux distributions require equivalent WebKitGTK 4.1, OpenSSL, indicator, SVG, and native compiler packages. See the official Tauri prerequisites linked below.

### 3. Build an exported desktop project

Extract the ZIP downloaded from Web2App Studio, enter its directory, and run:

```bash
npm install
npm run tauri -- build
```

Build desktop installers on their native operating systems. A Windows host should build Windows artifacts, macOS should build `.app` or `.dmg`, and Linux should build its Linux packages. Use a CI matrix with native runners for multi-platform releases.

Generated artifacts are normally under:

```text
src-tauri/target/release/bundle/
```

## Install the Android APK toolchain

Android builds require all desktop-independent Tauri prerequisites plus Java, Android SDK, Android NDK, and Rust Android compilation targets.

### 1. Install Android Studio components

Install [Android Studio](https://developer.android.com/studio). In **SDK Manager**, install:

- Android SDK Platform
- Android SDK Platform-Tools
- Android SDK Build-Tools
- Android SDK Command-line Tools
- NDK (Side by side)

Use current stable versions unless the project explicitly requires an older version. Accept licenses from Android Studio or run `sdkmanager --licenses` after the command-line tools are available.

### 2. Configure environment variables

#### Windows PowerShell

```powershell
[System.Environment]::SetEnvironmentVariable(
  "JAVA_HOME",
  "C:\Program Files\Android\Android Studio\jbr",
  "User"
)

[System.Environment]::SetEnvironmentVariable(
  "ANDROID_HOME",
  "$env:LOCALAPPDATA\Android\Sdk",
  "User"
)

$ndkVersion = Get-ChildItem -Name "$env:LOCALAPPDATA\Android\Sdk\ndk" |
  Sort-Object |
  Select-Object -Last 1

[System.Environment]::SetEnvironmentVariable(
  "NDK_HOME",
  "$env:LOCALAPPDATA\Android\Sdk\ndk\$ndkVersion",
  "User"
)
```

Restart the terminal and IDE. Ensure `%JAVA_HOME%\bin`, `%ANDROID_HOME%\platform-tools`, and `%ANDROID_HOME%\cmdline-tools\latest\bin` are available through `PATH`.

#### macOS

Add to `~/.zshrc`:

```bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export NDK_HOME="$ANDROID_HOME/ndk/$(ls -1 "$ANDROID_HOME/ndk" | sort | tail -1)"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
```

Reload the shell with `source ~/.zshrc`.

#### Linux

Adjust the Android Studio path for the installation method, then add to `~/.bashrc` or `~/.zshrc`:

```bash
export JAVA_HOME="/opt/android-studio/jbr"
export ANDROID_HOME="$HOME/Android/Sdk"
export NDK_HOME="$ANDROID_HOME/ndk/$(ls -1 "$ANDROID_HOME/ndk" | sort | tail -1)"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
```

### 3. Add Rust Android targets

```bash
rustup target add \
  aarch64-linux-android \
  armv7-linux-androideabi \
  i686-linux-android \
  x86_64-linux-android
```

Verify the environment:

```bash
node --version
npm --version
rustc --version
cargo --version
java -version
adb --version
rustup target list --installed
```

Also confirm that `ANDROID_HOME` and `NDK_HOME` point to existing directories.

## Build an APK from an exported ZIP

Extract the project ZIP, then run:

```bash
npm install
npm run tauri -- android init
npm run tauri -- android build --apk
```

The first build downloads Rust crates and Gradle dependencies and can take several minutes. APK files are written below:

```text
src-tauri/gen/android/app/build/outputs/apk/
```

To run the project on a connected device or emulator during development:

```bash
adb devices
npm run tauri -- android dev
```

If `adb devices` does not show the device, enable USB debugging, approve the computer on the device, or start an Android emulator.

## Enable direct APK download in Web2App Studio

Direct APK building is deliberately disabled by default. The server checks the local toolchain before enabling the UI button and serializes build requests to limit resource usage.

1. Complete the Android setup above.
2. Copy `.env.example` to `.env`.
3. Configure at least:

```dotenv
ENABLE_ANDROID_BUILDS=true
ANDROID_HOME=C:\Users\YOUR_NAME\AppData\Local\Android\Sdk
NDK_HOME=C:\Users\YOUR_NAME\AppData\Local\Android\Sdk\ndk\YOUR_NDK_VERSION
JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
```

Use platform-appropriate paths on macOS and Linux. Rust, Cargo, npm, and Java must be executable by the account running the server.

4. Restart the production server:

```bash
npm run build
npm start
```

5. Check the capability endpoint:

```bash
curl http://localhost:4173/api/capabilities
```

Expected result when configured correctly:

```json
{"android":{"available":true,"reason":"Android 构建器已就绪"}}
```

Select Android in the UI, generate the project, and choose **Download APK**. The server creates an isolated temporary project, initializes Tauri Android, builds the APK, streams it to the browser, and removes the temporary files.

## Sign a release APK

Unsigned or debug APKs are useful for local testing. Distribution through the Play Store or other release channels requires a private signing key.

### 1. Create an upload keystore

Windows PowerShell:

```powershell
keytool -genkey -v `
  -keystore "$env:USERPROFILE\upload-keystore.jks" `
  -storetype JKS `
  -keyalg RSA `
  -keysize 2048 `
  -validity 10000 `
  -alias upload
```

macOS or Linux:

```bash
keytool -genkey -v \
  -keystore ~/upload-keystore.jks \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -alias upload
```

Back up the keystore and password securely. Losing them may prevent future updates to a published application. Never commit the keystore or passwords.

### 2. Configure the generated Android project

Create `src-tauri/gen/android/keystore.properties`:

```properties
password=YOUR_KEY_PASSWORD
keyAlias=upload
storeFile=C:\\Users\\YOUR_NAME\\upload-keystore.jks
```

On macOS or Linux, use an absolute Unix path for `storeFile`.

Edit `src-tauri/gen/android/app/build.gradle.kts`:

1. Add this import at the beginning:

```kotlin
import java.io.FileInputStream
```

2. Add a release signing configuration before `buildTypes`:

```kotlin
signingConfigs {
    create("release") {
        val keystorePropertiesFile = rootProject.file("keystore.properties")
        val keystoreProperties = Properties()
        if (keystorePropertiesFile.exists()) {
            keystoreProperties.load(FileInputStream(keystorePropertiesFile))
        }

        keyAlias = keystoreProperties["keyAlias"] as String
        keyPassword = keystoreProperties["password"] as String
        storeFile = file(keystoreProperties["storeFile"] as String)
        storePassword = keystoreProperties["password"] as String
    }
}
```

3. Apply it to the release build type:

```kotlin
buildTypes {
    getByName("release") {
        signingConfig = signingConfigs.getByName("release")
    }
}
```

Build again with `npm run tauri -- android build --apk`.

For a public build service, do not accept permanent signing credentials from browser requests. Inject encrypted secrets on the trusted builder or CI runner instead.

## Validation

Run the project checks:

```bash
npm run lint
npm run build
npm run test:visual
```

`npm run test:visual` requires the server to be running on port `4173`. It verifies desktop and mobile layouts, manual mode, AI fallback, Android selection, icon conversion, and ZIP contents.

Validate the Skill separately:

```powershell
python "$env:CODEX_HOME\skills\.system\skill-creator\scripts\quick_validate.py" `
  ".\skills\web-to-app"
```

## Troubleshooting

### `rustc` or `cargo` is not recognized

Restart the terminal after installing Rust. On Windows, confirm that `%USERPROFILE%\.cargo\bin` is in `PATH` and that `stable-msvc` is the default toolchain.

### Android builder remains unavailable

- Confirm `ENABLE_ANDROID_BUILDS=true` in `.env`.
- Restart the Web2App server after changing `.env`.
- Confirm `JAVA_HOME`, `ANDROID_HOME`, and `NDK_HOME` exist.
- Confirm `java`, `rustc`, `cargo`, and `npm` run under the same user account as the server.
- Call `/api/capabilities` to see the first missing prerequisite.

### Android target or linker errors

Run `rustup target list --installed` and add the four Android targets listed above. Confirm `NDK_HOME` points to an installed **NDK (Side by side)** version.

### Gradle cannot download dependencies

The first Android build requires network access to npm, crates.io, Google Maven, and Maven Central. Check proxy, DNS, certificate, and firewall settings. Retry after connectivity is restored rather than deleting the whole project.

### Remote website authentication fails in the app

OAuth redirects, third-party cookies, popups, downloads, and embedded WebView restrictions can behave differently from a browser tab. The site may need an allowlisted callback URL or additional Tauri plugins. Do not disable TLS validation or embed user credentials as a workaround.

## Codex Skill

The reusable Skill is in `skills/web-to-app`. Generate a project directly with:

```bash
node skills/web-to-app/scripts/scaffold.mjs \
  --url https://example.com \
  --name "Example" \
  --platforms macos,windows,android \
  --icon ./icon.png \
  --out ./output
```

Run `node skills/web-to-app/scripts/scaffold.mjs --help` for all flags.

## Security and release notes

- Only `http://` and `https://` application URLs are accepted.
- Do not embed passwords, cookies, OpenAI keys, signing keys, or other secrets in generated projects.
- Keep `.env`, `keystore.properties`, and keystore files out of source control.
- A package size near 5 MB is not guaranteed. Size depends on the operating system, plugins, icons, and packaging format.
- Test authentication, downloads, uploads, notifications, deep links, and permissions on every target platform before release.

## Official references

- [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)
- [Tauri Android code signing](https://v2.tauri.app/distribute/sign/android/)
- [Android Studio](https://developer.android.com/studio)
- [Android app signing](https://developer.android.com/studio/publish/app-signing)
