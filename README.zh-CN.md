# Web2App Studio

简体中文 | [English](README.md)

Web2App Studio 可以把 HTTP 或 HTTPS 网站转换为轻量的 Tauri 2 应用项目，支持 macOS、Windows、Linux 和 Android。它提供可视化配置、可选的 AI 助手、自定义应用图标、项目 ZIP 导出，以及在服务器具备完整 Android 构建环境时直接构建并下载 APK。

## 功能

- AI 辅助和完全手动两种配置模式
- 支持 macOS、Windows、Linux、Android
- 可配置窗口尺寸、窗口行为、快捷键和主题
- 上传 PNG、JPG 或 WebP 图标，并统一处理成 512 x 512 PNG
- 在浏览器中生成 Tauri 源码 ZIP
- 可选的服务端 APK 构建与下载
- 可复用的 Codex Skill 和确定性项目脚手架

## 项目结构

```text
web2app/
|-- src/                         React 配置界面
|-- server.mjs                  AI 与 Android 构建接口
|-- scripts/visual-test.mjs     浏览器集成测试
|-- skills/web-to-app/          可复用的 Codex Skill
|-- .env.example                服务端配置模板
|-- README.md                   英文文档
`-- README.zh-CN.md             中文文档
```

## 快速启动

### 基础要求

- 推荐 Node.js 22 LTS 或更高版本
- npm 10 或更高版本
- 只有运行 `npm run test:visual` 时，才要求 Google Chrome 安装在 Windows 默认路径

### 启动开发服务器

```bash
npm install
npm run dev
```

访问 <http://localhost:4173>。

手动模式和内置的本地指令解析不需要任何密钥。需要启用 OpenAI 结构化配置助手时：

```powershell
Copy-Item .env.example .env
```

然后在 `.env` 中设置 `OPENAI_API_KEY`。不要把 Key 放入前端代码，也不要提交 `.env`。

### 生产构建

```bash
npm run build
npm start
```

生产服务器会提供 `dist/` 中的静态文件，并监听 `PORT`，默认端口为 `4173`。

## 安装 Tauri 桌面构建环境

Tauri 使用操作系统自带的 WebView 和 Rust 后端。只运行本网站时不需要 Rust；编译导出的应用项目时，必须安装 Rust 和对应平台的原生构建工具。

### 1. 安装 Rust

Windows PowerShell：

```powershell
winget install --id Rustlang.Rustup
rustup default stable-msvc
```

macOS 或 Linux：

```bash
curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh
```

重新打开终端后验证：

```bash
rustc --version
cargo --version
rustup show
```

### 2. 安装平台依赖

#### Windows

1. 安装 [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)。
2. 勾选 **Desktop development with C++（使用 C++ 的桌面开发）** 工作负载。
3. 确认已安装 [Microsoft Edge WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/)。目前的 Windows 10 和 Windows 11 通常已经自带。
4. 如果构建 MSI 时出现 `failed to run light.exe`，请在 Windows 可选功能中启用 **VBSCRIPT**。

#### macOS

只构建桌面应用时可执行：

```bash
xcode-select --install
```

还需要 Apple 移动端目标时，应安装并至少启动一次完整的 Xcode。

#### Debian 或 Ubuntu

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

其他 Linux 发行版需要安装对应的 WebKitGTK 4.1、OpenSSL、状态栏、SVG 和原生编译工具，具体可参考文末的 Tauri 官方文档。

### 3. 构建导出的桌面项目

解压从 Web2App Studio 下载的 ZIP，进入项目目录后执行：

```bash
npm install
npm run tauri -- build
```

桌面安装包应在对应的原生操作系统中构建：Windows 构建 Windows 安装包，macOS 构建 `.app` 或 `.dmg`，Linux 构建 Linux 安装包。多平台发布建议使用包含原生 Runner 的 CI Matrix。

生成结果通常位于：

```text
src-tauri/target/release/bundle/
```

## 安装 Android APK 构建环境

Android 构建除了需要 Rust 和 Node.js，还需要 Java、Android SDK、Android NDK，以及 Rust 的 Android 编译目标。

### 1. 安装 Android Studio 组件

安装 [Android Studio](https://developer.android.com/studio)，然后在 **SDK Manager** 中安装：

- Android SDK Platform
- Android SDK Platform-Tools
- Android SDK Build-Tools
- Android SDK Command-line Tools
- NDK (Side by side)

除非项目明确指定旧版本，否则使用当前稳定版本。可在 Android Studio 中接受许可证；安装命令行工具后，也可以运行 `sdkmanager --licenses`。

### 2. 配置环境变量

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

重新启动终端和 IDE，并确保 `%JAVA_HOME%\bin`、`%ANDROID_HOME%\platform-tools`、`%ANDROID_HOME%\cmdline-tools\latest\bin` 已加入 `PATH`。

#### macOS

把以下内容加入 `~/.zshrc`：

```bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export NDK_HOME="$ANDROID_HOME/ndk/$(ls -1 "$ANDROID_HOME/ndk" | sort | tail -1)"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
```

然后执行 `source ~/.zshrc`。

#### Linux

根据 Android Studio 的实际安装位置调整路径，然后加入 `~/.bashrc` 或 `~/.zshrc`：

```bash
export JAVA_HOME="/opt/android-studio/jbr"
export ANDROID_HOME="$HOME/Android/Sdk"
export NDK_HOME="$ANDROID_HOME/ndk/$(ls -1 "$ANDROID_HOME/ndk" | sort | tail -1)"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
```

### 3. 安装 Rust Android 编译目标

```bash
rustup target add \
  aarch64-linux-android \
  armv7-linux-androideabi \
  i686-linux-android \
  x86_64-linux-android
```

验证环境：

```bash
node --version
npm --version
rustc --version
cargo --version
java -version
adb --version
rustup target list --installed
```

还应确认 `ANDROID_HOME` 和 `NDK_HOME` 指向真实存在的目录。

## 从导出的 ZIP 本地构建 APK

解压项目 ZIP 后执行：

```bash
npm install
npm run tauri -- android init
npm run tauri -- android build --apk
```

首次构建需要下载 Rust crates 和 Gradle 依赖，可能耗时数分钟。APK 位于：

```text
src-tauri/gen/android/app/build/outputs/apk/
```

需要在真机或模拟器中调试时：

```bash
adb devices
npm run tauri -- android dev
```

如果 `adb devices` 没有列出设备，请打开手机 USB 调试并确认电脑授权，或者启动 Android 模拟器。

## 在 Web2App Studio 中开启直接 APK 下载

直接构建 APK 默认关闭。服务端会先检测本机构建工具链，检测通过后才启用页面中的按钮；构建任务会串行执行，避免耗尽服务器资源。

1. 完成上面的 Android 环境安装。
2. 将 `.env.example` 复制为 `.env`。
3. 至少配置：

```dotenv
ENABLE_ANDROID_BUILDS=true
ANDROID_HOME=C:\Users\你的用户名\AppData\Local\Android\Sdk
NDK_HOME=C:\Users\你的用户名\AppData\Local\Android\Sdk\ndk\你的NDK版本
JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
```

macOS 和 Linux 应填写相应平台的绝对路径。运行服务器的账户必须能够执行 Rust、Cargo、npm 和 Java。

4. 重启生产服务器：

```bash
npm run build
npm start
```

5. 检查构建能力接口：

```bash
curl http://localhost:4173/api/capabilities
```

配置完成后应返回：

```json
{"android":{"available":true,"reason":"Android 构建器已就绪"}}
```

在页面中选择 Android，生成项目，然后点击“下载 APK”。服务端会创建隔离的临时项目，初始化 Tauri Android、构建 APK、传输到浏览器，最后删除临时文件。

## 签名发布版 APK

未签名或调试 APK 可以用于本地测试。发布到 Google Play 或其他正式渠道时，必须使用私有密钥签名。

### 1. 创建上传密钥库

Windows PowerShell：

```powershell
keytool -genkey -v `
  -keystore "$env:USERPROFILE\upload-keystore.jks" `
  -storetype JKS `
  -keyalg RSA `
  -keysize 2048 `
  -validity 10000 `
  -alias upload
```

macOS 或 Linux：

```bash
keytool -genkey -v \
  -keystore ~/upload-keystore.jks \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -alias upload
```

请安全备份密钥库和密码。丢失密钥可能导致已发布应用无法继续更新。禁止把密钥库或密码提交到仓库。

### 2. 配置生成的 Android 项目

创建 `src-tauri/gen/android/keystore.properties`：

```properties
password=你的密钥密码
keyAlias=upload
storeFile=C:\\Users\\你的用户名\\upload-keystore.jks
```

macOS 或 Linux 的 `storeFile` 应使用 Unix 绝对路径。

编辑 `src-tauri/gen/android/app/build.gradle.kts`：

1. 在文件开头添加：

```kotlin
import java.io.FileInputStream
```

2. 在 `buildTypes` 之前添加发布签名配置：

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

3. 在发布构建类型中应用签名配置：

```kotlin
buildTypes {
    getByName("release") {
        signingConfig = signingConfigs.getByName("release")
    }
}
```

再次运行 `npm run tauri -- android build --apk`。

如果提供公共构建服务，不要通过浏览器请求传递长期签名密钥。应该在可信构建机或 CI Runner 中注入加密的 Secrets。

## 验证项目

执行：

```bash
npm run lint
npm run build
npm run test:visual
```

`npm run test:visual` 要求服务器运行在 `4173` 端口。测试会验证桌面和手机布局、手动模式、AI 回退、Android 选择、图标处理和 ZIP 内容。

单独验证 Skill：

```powershell
python "$env:CODEX_HOME\skills\.system\skill-creator\scripts\quick_validate.py" `
  ".\skills\web-to-app"
```

## 常见问题

### 无法识别 `rustc` 或 `cargo`

安装 Rust 后重新启动终端。Windows 用户应确认 `%USERPROFILE%\.cargo\bin` 位于 `PATH` 中，并且默认工具链为 `stable-msvc`。

### 页面仍显示 Android 构建器不可用

- 确认 `.env` 中设置了 `ENABLE_ANDROID_BUILDS=true`。
- 修改 `.env` 后重新启动 Web2App 服务器。
- 确认 `JAVA_HOME`、`ANDROID_HOME`、`NDK_HOME` 指向真实目录。
- 确认运行服务器的同一账户可以执行 `java`、`rustc`、`cargo`、`npm`。
- 访问 `/api/capabilities` 查看第一个缺失的前置条件。

### Android target 或链接错误

执行 `rustup target list --installed`，并补装上面列出的四个 Android target。确认 `NDK_HOME` 指向 SDK Manager 中安装的 **NDK (Side by side)** 目录。

### Gradle 无法下载依赖

首次 Android 构建需要访问 npm、crates.io、Google Maven 和 Maven Central。请检查代理、DNS、证书和防火墙。网络恢复后直接重试即可，不需要删除整个项目。

### 应用中的网页登录失败

OAuth 回调、第三方 Cookie、弹窗、文件下载以及嵌入式 WebView 限制可能与普通浏览器标签页不同。网站可能需要加入回调 URL 白名单或使用额外的 Tauri 插件。不要通过关闭 TLS 校验或嵌入用户凭据来绕过限制。

## Codex Skill

可复用 Skill 位于 `skills/web-to-app`。也可以直接运行脚手架：

```bash
node skills/web-to-app/scripts/scaffold.mjs \
  --url https://example.com \
  --name "Example" \
  --platforms macos,windows,android \
  --icon ./icon.png \
  --out ./output
```

运行 `node skills/web-to-app/scripts/scaffold.mjs --help` 查看所有参数。

## 安全与发布说明

- 应用 URL 只接受 `http://` 和 `https://`。
- 不要在生成项目中嵌入密码、Cookie、OpenAI Key、签名密钥或其他 Secrets。
- 不要提交 `.env`、`keystore.properties` 和密钥库文件。
- 不能保证安装包固定为 5 MB；体积取决于操作系统、插件、图标和打包格式。
- 发布前应在每个目标平台测试登录、下载、上传、通知、深层链接和权限。

## 官方参考资料

- [Tauri 前置环境](https://v2.tauri.app/zh-cn/start/prerequisites/)
- [Tauri Android 签名](https://v2.tauri.app/distribute/sign/android/)
- [Android Studio](https://developer.android.com/studio)
- [Android 应用签名](https://developer.android.com/studio/publish/app-signing)
