import type { AppConfig, AssistantResult, Platform } from './types'

const platformNames: Record<Platform, string> = {
  macos: 'macOS',
  windows: 'Windows',
  linux: 'Linux',
  android: 'Android',
}

export async function askAssistant(message: string, current: AppConfig): Promise<AssistantResult> {
  try {
    const response = await fetch('/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, current }),
    })
    if (response.ok) return await response.json()
  } catch {
    // The deterministic fallback keeps the builder usable without a server key.
  }
  return localAssistant(message, current)
}

function localAssistant(message: string, current: AppConfig): AssistantResult {
  const next = { ...current, platforms: [...current.platforms] }
  const lower = message.toLowerCase()
  const url = message.match(/https?:\/\/[^\s，。]+/i)?.[0]
  const size = message.match(/(\d{3,4})\s*[x×*]\s*(\d{3,4})/i)
  const hex = message.match(/#[0-9a-f]{6}/i)?.[0]
  const platforms: Platform[] = []

  if (/mac|macos|苹果/.test(lower)) platforms.push('macos')
  if (/windows|win\b|微软/.test(lower)) platforms.push('windows')
  if (/linux|ubuntu|deb|appimage/.test(lower)) platforms.push('linux')
  if (/android|安卓|apk/.test(lower)) platforms.push('android')
  if (/全平台|四个平台|所有平台|all platforms/.test(lower)) platforms.push('macos', 'windows', 'linux', 'android')

  if (url) next.url = url
  if (size) {
    next.width = Math.min(3840, Math.max(480, Number(size[1])))
    next.height = Math.min(2160, Math.max(360, Number(size[2])))
  }
  if (hex) next.accent = hex
  if (platforms.length) next.platforms = [...new Set(platforms)]
  if (/置顶|always.?on.?top/.test(lower)) next.alwaysOnTop = !/不置顶|取消置顶/.test(lower)
  if (/不可调整|固定尺寸|禁止缩放/.test(lower)) next.resizable = false
  if (/可调整|允许缩放/.test(lower)) next.resizable = true

  const nameMatch = message.match(/(?:叫做|命名为|名称是|name it)\s*[“"']?([^，。,“”"']{1,24})/i)
  if (nameMatch) next.appName = nameMatch[1].trim()

  const changes = [
    url && `网址设为 ${next.url}`,
    size && `窗口设为 ${next.width} × ${next.height}`,
    platforms.length && `出包平台改为 ${next.platforms.map((item) => platformNames[item]).join('、')}`,
    hex && `主题色改为 ${next.accent}`,
    nameMatch && `应用命名为 ${next.appName}`,
  ].filter(Boolean)

  return {
    ...next,
    reply: changes.length
      ? `已更新：${changes.join('；')}。你可以继续描述，或直接生成项目。`
      : '我可以帮你改名称、网址、平台、窗口尺寸、主题色或置顶设置。例如：“做成 Mac 和 Windows 应用，窗口 1280×820”。',
  }
}
