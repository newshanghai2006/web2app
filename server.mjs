import express from 'express'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import OpenAI from 'openai'
import { zodTextFormat } from 'openai/helpers/zod'
import { z } from 'zod'

const isProduction = process.env.NODE_ENV === 'production'
const app = express()
app.use(express.json({ limit: '8mb' }))

const AssistantResult = z.object({
  reply: z.string(),
  appName: z.string(),
  url: z.string(),
  platforms: z.array(z.enum(['macos', 'windows', 'linux', 'android'])),
  width: z.number().int().min(480).max(3840),
  height: z.number().int().min(360).max(2160),
  resizable: z.boolean(),
  alwaysOnTop: z.boolean(),
  shortcut: z.string(),
  accent: z.string(),
})

const AndroidBuildRequest = z.object({
  config: AssistantResult.omit({ reply: true }).extend({
    url: z.string().url().refine((value) => /^https?:\/\//i.test(value)),
    appName: z.string().min(1).max(36),
  }),
  iconDataUrl: z.string().max(7_000_000).regex(/^data:image\/png;base64,/).optional(),
})

function executable(name) {
  if (name === 'java' && process.env.JAVA_HOME) {
    return path.join(process.env.JAVA_HOME, 'bin', process.platform === 'win32' ? 'java.exe' : 'java')
  }
  return process.platform === 'win32' && name === 'npm' ? 'npm.cmd' : name
}

function commandAvailable(name) {
  return spawnSync(executable(name), ['--version'], { stdio: 'ignore' }).status === 0
}

function androidCapability() {
  if (process.env.ENABLE_ANDROID_BUILDS !== 'true') {
    return { available: false, reason: '服务器尚未启用 Android 构建' }
  }
  const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT
  if (!androidHome) {
    return { available: false, reason: '服务器缺少 ANDROID_HOME / ANDROID_SDK_ROOT' }
  }
  if (!fs.existsSync(androidHome)) {
    return { available: false, reason: 'ANDROID_HOME / ANDROID_SDK_ROOT 指向的目录不存在' }
  }
  if (!process.env.NDK_HOME || !fs.existsSync(process.env.NDK_HOME)) {
    return { available: false, reason: '服务器缺少有效的 NDK_HOME' }
  }
  const missing = ['rustc', 'cargo', 'rustup', 'java', 'npm'].filter((name) => !commandAvailable(name))
  if (missing.length) return { available: false, reason: `服务器缺少 ${missing.join('、')}` }
  const targetResult = spawnSync(executable('rustup'), ['target', 'list', '--installed'], { encoding: 'utf8' })
  const installedTargets = targetResult.stdout || ''
  const requiredTargets = ['aarch64-linux-android', 'armv7-linux-androideabi', 'i686-linux-android', 'x86_64-linux-android']
  const missingTargets = requiredTargets.filter((target) => !installedTargets.includes(target))
  if (missingTargets.length) return { available: false, reason: `缺少 Rust Android targets：${missingTargets.join('、')}` }
  return { available: true, reason: 'Android 构建器已就绪' }
}

function run(command, args, cwd, timeoutMs) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable(command), args, { cwd, shell: false, env: process.env })
    let output = ''
    child.stdout.on('data', (chunk) => { output = `${output}${chunk}`.slice(-6000) })
    child.stderr.on('data', (chunk) => { output = `${output}${chunk}`.slice(-6000) })
    const timer = setTimeout(() => {
      child.kill()
      reject(new Error(`${command} timed out`))
    }, timeoutMs)
    child.on('error', (error) => { clearTimeout(timer); reject(error) })
    child.on('exit', (code) => {
      clearTimeout(timer)
      if (code === 0) resolve(output)
      else reject(new Error(`${command} exited with ${code}: ${output}`))
    })
  })
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'web-app'
}

function findApk(directory) {
  if (!fs.existsSync(directory)) return undefined
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      const nested = findApk(target)
      if (nested) return nested
    } else if (entry.name.endsWith('.apk') && !entry.name.includes('unaligned')) {
      return target
    }
  }
}

let androidBuildInProgress = false

app.get('/api/capabilities', (_req, res) => {
  res.json({ android: androidCapability() })
})

app.post('/api/build/android', async (req, res) => {
  const capability = androidCapability()
  if (!capability.available) return res.status(503).json({ code: 'ANDROID_BUILDER_UNAVAILABLE', message: capability.reason })
  if (androidBuildInProgress) return res.status(429).json({ code: 'ANDROID_BUILDER_BUSY', message: 'Android 构建器正在处理另一个任务，请稍后重试' })

  const parsed = AndroidBuildRequest.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ code: 'INVALID_BUILD_CONFIG', message: '应用配置或图标格式无效' })

  androidBuildInProgress = true
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'web2app-android-'))
  const { config, iconDataUrl } = parsed.data
  const slug = slugify(config.appName)

  try {
    let iconPath
    if (iconDataUrl) {
      iconPath = path.join(tempRoot, 'icon.png')
      fs.writeFileSync(iconPath, Buffer.from(iconDataUrl.split(',')[1], 'base64'))
    }

    const scaffoldArgs = [
      path.resolve('skills/web-to-app/scripts/scaffold.mjs'),
      '--url', config.url,
      '--name', config.appName,
      '--platforms', 'android',
      '--width', String(config.width),
      '--height', String(config.height),
      '--out', tempRoot,
    ]
    if (!config.resizable) scaffoldArgs.push('--fixed')
    if (config.alwaysOnTop) scaffoldArgs.push('--always-on-top')
    if (iconPath) scaffoldArgs.push('--icon', iconPath)

    await run(process.execPath, scaffoldArgs, process.cwd(), 30_000)
    const project = path.join(tempRoot, slug)
    await run('npm', ['install'], project, 180_000)
    await run('npm', ['run', 'tauri', '--', 'android', 'init'], project, 300_000)
    if (iconPath) await run('npm', ['run', 'tauri', '--', 'icon', 'src-tauri/icon-source.png'], project, 120_000)
    await run('npm', ['run', 'tauri', '--', 'android', 'build', '--apk'], project, 1_200_000)

    const apk = findApk(path.join(project, 'src-tauri', 'gen', 'android', 'app', 'build', 'outputs', 'apk'))
    if (!apk) throw new Error('Build completed without an APK artifact')
    res.download(apk, `${slug}.apk`, () => fs.rmSync(tempRoot, { recursive: true, force: true }))
  } catch (error) {
    fs.rmSync(tempRoot, { recursive: true, force: true })
    console.error(error)
    res.status(500).json({ code: 'ANDROID_BUILD_FAILED', message: 'APK 构建失败，请检查 Android 工具链与服务器日志' })
  } finally {
    androidBuildInProgress = false
  }
})

app.post('/api/assistant', async (req, res) => {
  if (!process.env.OPENAI_API_KEY) {
    return res.status(204).end()
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const current = JSON.stringify(req.body?.current ?? {})
    const message = String(req.body?.message ?? '').slice(0, 2000)
    const response = await client.responses.parse({
      model: process.env.OPENAI_MODEL || 'gpt-6-astra',
      input: [
        {
          role: 'system',
          content: `你是 Web2App Studio 的配置助手。用户通过自然语言修改 Tauri 网页桌面或 Android 应用配置。\n返回完整配置而不是差异。不得改变用户没有提到的配置。平台可选 macos、windows、linux、android。URL 只允许 http 或 https。accent 必须是 #RRGGBB。快捷键使用 CommandOrControl+Shift+字母格式。用简洁中文回复。当前配置：${current}`,
        },
        { role: 'user', content: message },
      ],
      text: { format: zodTextFormat(AssistantResult, 'web2app_config') },
    })

    if (!response.output_parsed) {
      return res.status(422).json({ error: 'AI_EMPTY_RESPONSE' })
    }
    res.json(response.output_parsed)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'AI_REQUEST_FAILED' })
  }
})

if (isProduction) {
  app.use(express.static('dist'))
  app.use((_req, res) => res.sendFile(`${process.cwd()}/dist/index.html`))
} else {
  const { createServer: createViteServer } = await import('vite')
  const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' })
  app.use(vite.middlewares)
}

const port = Number(process.env.PORT || 4173)
app.listen(port, () => {
  console.log(`Web2App Studio: http://localhost:${port}`)
})
