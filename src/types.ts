export type Platform = 'macos' | 'windows' | 'linux' | 'android'

export interface AppConfig {
  appName: string
  url: string
  platforms: Platform[]
  width: number
  height: number
  resizable: boolean
  alwaysOnTop: boolean
  shortcut: string
  accent: string
}

export interface AssistantResult extends AppConfig {
  reply: string
}

export interface ChatMessage {
  id: number
  role: 'assistant' | 'user'
  text: string
}

export interface BuildCapabilities {
  android: {
    available: boolean
    reason: string
  }
}
