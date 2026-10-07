import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Apple,
  ArrowRight,
  Bot,
  Box,
  Check,
  ChevronDown,
  Download,
  ExternalLink,
  Globe2,
  ImagePlus,
  Layers3,
  LoaderCircle,
  Maximize2,
  Monitor,
  PackageCheck,
  PanelTop,
  Rocket,
  Send,
  Settings2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  TerminalSquare,
  WandSparkles,
  X,
} from 'lucide-react'
import { askAssistant } from './assistant'
import { downloadAndroidApk, downloadProject } from './scaffold'
import type { AppConfig, BuildCapabilities, ChatMessage, Platform } from './types'

const initialConfig: AppConfig = {
  appName: 'My Web App',
  url: 'https://linear.app',
  platforms: ['macos', 'windows'],
  width: 1280,
  height: 820,
  resizable: true,
  alwaysOnTop: false,
  shortcut: 'CommandOrControl+Shift+L',
  accent: '#9B7BFF',
}

const platformInfo = [
  { id: 'macos' as const, label: 'macOS', icon: Apple },
  { id: 'windows' as const, label: 'Windows', icon: Monitor },
  { id: 'linux' as const, label: 'Linux', icon: TerminalSquare },
  { id: 'android' as const, label: 'Android', icon: Smartphone },
]

const quickPrompts = [
  '做成全平台应用',
  '窗口改成 1440 × 900',
  '固定尺寸并保持置顶',
]

function getDomain(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return 'your-tool.com' }
}

function App() {
  const [config, setConfig] = useState(initialConfig)
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 1, role: 'assistant', text: '告诉我你想怎么改。我会直接更新左侧配置。' },
  ])
  const [prompt, setPrompt] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [useAi, setUseAi] = useState(true)
  const [iconDataUrl, setIconDataUrl] = useState<string>()
  const [iconError, setIconError] = useState('')
  const [capabilities, setCapabilities] = useState<BuildCapabilities>({ android: { available: false, reason: '正在检测构建环境…' } })
  const [apkState, setApkState] = useState<'idle' | 'building' | 'error'>('idle')
  const [apkError, setApkError] = useState('')
  const [advancedOpen, setAdvancedOpen] = useState(true)
  const [buildState, setBuildState] = useState<'idle' | 'building' | 'done'>('idle')
  const [buildStep, setBuildStep] = useState(0)
  const chatEnd = useRef<HTMLDivElement>(null)
  const iconInput = useRef<HTMLInputElement>(null)
  const domain = useMemo(() => getDomain(config.url), [config.url])
  const isValidUrl = /^https?:\/\/.+/.test(config.url)

  useEffect(() => {
    fetch('/api/capabilities')
      .then((response) => response.json())
      .then(setCapabilities)
      .catch(() => setCapabilities({ android: { available: false, reason: '无法连接构建服务' } }))
  }, [])

  function update<K extends keyof AppConfig>(key: K, value: AppConfig[K]) {
    setConfig((current) => ({ ...current, [key]: value }))
    if (buildState === 'done') setBuildState('idle')
  }

  function togglePlatform(platform: Platform) {
    const exists = config.platforms.includes(platform)
    if (exists && config.platforms.length === 1) return
    update('platforms', exists ? config.platforms.filter((item) => item !== platform) : [...config.platforms, platform])
  }

  async function sendMessage(text = prompt) {
    const value = text.trim()
    if (!value || isThinking || !useAi) return
    setPrompt('')
    setMessages((items) => [...items, { id: Date.now(), role: 'user', text: value }])
    setIsThinking(true)
    const result = await askAssistant(value, config)
    const { reply, ...nextConfig } = result
    setConfig(nextConfig)
    setMessages((items) => [...items, { id: Date.now() + 1, role: 'assistant', text: reply }])
    setIsThinking(false)
    setTimeout(() => chatEnd.current?.scrollIntoView({ behavior: 'smooth' }), 0)
  }

  async function buildProject() {
    if (!isValidUrl || buildState === 'building') return
    setBuildState('building')
    setBuildStep(0)
    for (let step = 1; step <= 3; step += 1) {
      await new Promise((resolve) => setTimeout(resolve, 650))
      setBuildStep(step)
    }
    setBuildState('done')
  }

  async function selectIcon(file?: File) {
    setIconError('')
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setIconError('请选择 PNG、JPG 或 WebP 图片')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setIconError('图片不能超过 5 MB')
      return
    }

    const source = URL.createObjectURL(file)
    try {
      const image = new Image()
      image.src = source
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = 512
      canvas.height = 512
      const context = canvas.getContext('2d')!
      const size = Math.min(image.naturalWidth, image.naturalHeight)
      const sx = (image.naturalWidth - size) / 2
      const sy = (image.naturalHeight - size) / 2
      context.drawImage(image, sx, sy, size, size, 0, 0, 512, 512)
      setIconDataUrl(canvas.toDataURL('image/png'))
      if (buildState === 'done') setBuildState('idle')
    } catch {
      setIconError('无法读取这张图片，请换一张重试')
    } finally {
      URL.revokeObjectURL(source)
    }
  }

  async function buildAndroid() {
    if (!capabilities.android.available || apkState === 'building') return
    setApkState('building')
    setApkError('')
    try {
      await downloadAndroidApk(config, iconDataUrl)
      setApkState('idle')
    } catch (error) {
      setApkState('error')
      setApkError(error instanceof Error ? error.message : 'APK 构建失败')
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#builder" aria-label="Web2App Studio 首页">
          <span className="brand-mark"><Layers3 size={18} /></span>
          <span>WEB2APP</span>
          <span className="brand-suffix">STUDIO</span>
        </a>
        <div className="topbar-meta">
          <span className="status-dot"><i /> 本地配置</span>
          <a className="docs-link" href="#workflow">工作原理 <ArrowRight size={14} /></a>
        </div>
      </header>

      <main>
        <section className="intro" id="builder">
          <div className="intro-copy">
            <div className="eyebrow"><Sparkles size={14} /> AI 可选 · 网页转桌面与安卓应用</div>
            <h1>把常用网页，<br /><span>变成真正的 App。</span></h1>
            <p>粘贴网址，选择桌面或安卓平台。可以手动配置，也可以让 AI 调整细节，然后导出轻量的 Tauri 应用。</p>
          </div>
          <div className="intro-proof" aria-label="产品特性">
            <div><strong>4</strong><span>桌面 + Android</span></div>
            <div><strong>Rust</strong><span>Tauri 2 内核</span></div>
            <div><strong>1 ZIP</strong><span>可编译项目</span></div>
          </div>
        </section>

        <section className="workspace" aria-label="网页应用生成器">
          <div className="config-panel">
            <div className="panel-heading">
              <div><span className="step-number">01</span><h2>应用配置</h2></div>
              <Settings2 size={18} />
            </div>

            <label className="field-label" htmlFor="url">网页地址</label>
            <div className={`url-field ${!isValidUrl ? 'invalid' : ''}`}>
              <Globe2 size={17} />
              <input id="url" value={config.url} onChange={(event) => update('url', event.target.value)} placeholder="https://your-tool.com" />
              {isValidUrl ? <Check size={16} /> : <X size={16} />}
            </div>
            {!isValidUrl && <p className="field-error">请输入以 http:// 或 https:// 开头的网址</p>}

            <label className="field-label">目标平台</label>
            <div className="platform-grid">
              {platformInfo.map(({ id, label, icon: Icon }) => (
                <button key={id} className={config.platforms.includes(id) ? 'selected' : ''} onClick={() => togglePlatform(id)}>
                  <Icon size={19} /><span>{label}</span>{config.platforms.includes(id) && <Check size={13} className="platform-check" />}
                </button>
              ))}
            </div>

            <label className="field-label">应用图标</label>
            <input ref={iconInput} className="icon-file-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => selectIcon(event.target.files?.[0])} />
            <button className="icon-uploader" onClick={() => iconInput.current?.click()}>
              <span className="icon-thumb" style={{ '--accent': config.accent } as React.CSSProperties}>
                {iconDataUrl ? <img src={iconDataUrl} alt="已上传的应用图标" /> : <ImagePlus size={20} />}
              </span>
              <span><strong>{iconDataUrl ? '更换应用图标' : '上传应用图标'}</strong><small>PNG / JPG / WebP，自动裁切为 512×512</small></span>
            </button>
            {iconError && <p className="field-error">{iconError}</p>}

            <button className="advanced-trigger" onClick={() => setAdvancedOpen((open) => !open)} aria-expanded={advancedOpen}>
              <span>窗口与行为</span><ChevronDown size={17} className={advancedOpen ? 'rotated' : ''} />
            </button>
            {advancedOpen && (
              <div className="advanced-fields">
                <label><span>应用名称</span><input value={config.appName} maxLength={36} onChange={(event) => update('appName', event.target.value)} /></label>
                <div className="size-row">
                  <label><span>宽度</span><input type="number" min="480" max="3840" value={config.width} onChange={(event) => update('width', Number(event.target.value))} /></label>
                  <span>×</span>
                  <label><span>高度</span><input type="number" min="360" max="2160" value={config.height} onChange={(event) => update('height', Number(event.target.value))} /></label>
                </div>
                <label><span>快捷键</span><input value={config.shortcut} onChange={(event) => update('shortcut', event.target.value)} /></label>
                <div className="switch-row">
                  <span>允许调整窗口</span>
                  <button className={`switch ${config.resizable ? 'on' : ''}`} role="switch" aria-checked={config.resizable} onClick={() => update('resizable', !config.resizable)}><i /></button>
                </div>
                <div className="switch-row">
                  <span>窗口保持置顶</span>
                  <button className={`switch ${config.alwaysOnTop ? 'on' : ''}`} role="switch" aria-checked={config.alwaysOnTop} onClick={() => update('alwaysOnTop', !config.alwaysOnTop)}><i /></button>
                </div>
              </div>
            )}
          </div>

          <div className="preview-panel">
            <div className="panel-heading preview-heading">
              <div><span className="step-number">02</span><h2>应用预览</h2></div>
              <span className="live-badge"><i /> LIVE</span>
            </div>
            <div className="preview-stage" style={{ '--accent': config.accent } as React.CSSProperties}>
              <div className="app-window">
                <div className="window-bar">
                  <span className="traffic"><i /><i /><i /></span>
                  <div className="window-title"><ShieldCheck size={13} /> {domain}</div>
                  <ExternalLink size={13} />
                </div>
                <div className="window-content">
                  <div className={`generated-icon ${iconDataUrl ? 'has-image' : ''}`}>
                    {iconDataUrl ? <img src={iconDataUrl} alt="应用图标预览" /> : <Rocket size={30} />}
                  </div>
                  <span className="mini-eyebrow">YOUR NATIVE APP</span>
                  <h3>{config.appName || 'Untitled App'}</h3>
                  <p>{domain}</p>
                  <div className="window-chips">
                    {config.platforms.map((item) => <span key={item}>{platformInfo.find((platform) => platform.id === item)?.label}</span>)}
                  </div>
                </div>
              </div>
              <div className="preview-caption">
                <span><Maximize2 size={14} /> {config.width} × {config.height}</span>
                <span><PanelTop size={14} /> 原生窗口</span>
              </div>
            </div>

            <div className="build-area">
              {buildState === 'idle' && (
                <button className="build-button" onClick={buildProject} disabled={!isValidUrl}>
                  <WandSparkles size={18} /> 生成 Tauri 项目 <ArrowRight size={17} />
                </button>
              )}
              {buildState === 'building' && (
                <div className="build-progress">
                  <div className="build-progress-top"><span><LoaderCircle size={17} className="spin" /> 正在准备项目</span><b>{Math.round((buildStep / 3) * 100)}%</b></div>
                  <div className="progress-track"><i style={{ width: `${(buildStep / 3) * 100}%` }} /></div>
                  <p>{['分析应用配置…', '生成 Tauri 清单…', '打包项目文件…'][Math.min(buildStep, 2)]}</p>
                </div>
              )}
              {buildState === 'done' && (
                <div className="build-complete">
                  <span className="complete-icon"><PackageCheck size={19} /></span>
                  <div><strong>项目已就绪</strong><small>包含桌面与 Android 兼容的 Rust 入口</small></div>
                  <div className="download-actions">
                    <button onClick={() => downloadProject(config, iconDataUrl)}><Download size={17} /> 项目 ZIP</button>
                    {config.platforms.includes('android') && (
                      <button
                        className="apk-button"
                        onClick={buildAndroid}
                        disabled={!capabilities.android.available || apkState === 'building'}
                        title={capabilities.android.reason}
                      >
                        {apkState === 'building' ? <LoaderCircle size={17} className="spin" /> : <Smartphone size={17} />}
                        {apkState === 'building' ? '正在构建' : '下载 APK'}
                      </button>
                    )}
                  </div>
                </div>
              )}
              {config.platforms.includes('android') && !capabilities.android.available && (
                <p className="builder-status"><i /> APK 暂不可直接构建：{capabilities.android.reason}</p>
              )}
              {apkError && <p className="field-error build-error">{apkError}</p>}
              <p className="build-note"><Box size={13} /> ZIP 可直接导出；APK 需连接已配置 Android SDK/NDK 的构建器。</p>
            </div>
          </div>

          <aside className="assistant-panel">
            <div className="panel-heading">
              <div><span className="step-number ai">{useAi ? <Bot size={14} /> : <Settings2 size={14} />}</span><h2>{useAi ? 'AI 配置助手' : '手动配置'}</h2></div>
              <div className="mode-switch" aria-label="配置方式">
                <button className={useAi ? 'active' : ''} onClick={() => setUseAi(true)}>AI</button>
                <button className={!useAi ? 'active' : ''} onClick={() => setUseAi(false)}>手动</button>
              </div>
            </div>
            {useAi ? <>
              <div className="chat-list">
                {messages.map((message) => (
                  <div key={message.id} className={`message ${message.role}`}>
                    {message.role === 'assistant' && <span className="message-avatar"><Sparkles size={13} /></span>}
                    <p>{message.text}</p>
                  </div>
                ))}
                {isThinking && <div className="message assistant"><span className="message-avatar"><Sparkles size={13} /></span><p className="typing"><i /><i /><i /></p></div>}
                <div ref={chatEnd} />
              </div>
              <div className="quick-prompts">
                {quickPrompts.map((item) => <button key={item} onClick={() => sendMessage(item)}>{item}</button>)}
              </div>
              <div className="chat-input">
                <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendMessage() }
                }} placeholder="例如：做成安卓应用，窗口 1200×800" rows={2} />
                <button title="发送" aria-label="发送" onClick={() => sendMessage()} disabled={!prompt.trim() || isThinking}><Send size={17} /></button>
              </div>
            </> : (
              <div className="manual-mode">
                <span className="manual-icon"><Settings2 size={24} /></span>
                <h3>不使用 AI，也能完整生成</h3>
                <p>左侧所有配置都会直接写入项目，不会调用任何 AI 接口。</p>
                <dl>
                  <div><dt>应用</dt><dd>{config.appName || '未命名'}</dd></div>
                  <div><dt>平台</dt><dd>{config.platforms.length} 个</dd></div>
                  <div><dt>图标</dt><dd>{iconDataUrl ? '已自定义' : '使用默认'}</dd></div>
                  <div><dt>输出</dt><dd>{config.platforms.includes('android') ? 'ZIP / APK' : '项目 ZIP'}</dd></div>
                </dl>
              </div>
            )}
          </aside>
        </section>

        <section className="workflow" id="workflow">
          <div className="workflow-intro"><span>从网址到安装包</span><h2>项目生成只需一分钟。<br />构建过程依然清清楚楚。</h2></div>
          <div className="workflow-steps">
            <article><span>01</span><Globe2 /><h3>解析网页</h3><p>读取网址与名称，生成安全的远程 WebView 配置。</p></article>
            <article><span>02</span><Box /><h3>生成项目</h3><p>导出标准 Tauri 2 目录，可继续加入图标与原生能力。</p></article>
            <article><span>03</span><PackageCheck /><h3>原生构建</h3><p>在桌面系统或 Android 构建器上产出对应安装包。</p></article>
          </div>
        </section>
      </main>

      <footer><span>WEB2APP STUDIO</span><p>Tauri-powered apps, with or without AI.</p><span>2026</span></footer>
    </div>
  )
}

export default App
