import express from 'express'
import OpenAI from 'openai'
import { zodTextFormat } from 'openai/helpers/zod'
import { z } from 'zod'

const isProduction = process.env.NODE_ENV === 'production'
const app = express()
app.use(express.json({ limit: '64kb' }))

const AssistantResult = z.object({
  reply: z.string(),
  appName: z.string(),
  url: z.string(),
  platforms: z.array(z.enum(['macos', 'windows', 'linux'])),
  width: z.number().int().min(480).max(3840),
  height: z.number().int().min(360).max(2160),
  resizable: z.boolean(),
  alwaysOnTop: z.boolean(),
  shortcut: z.string(),
  accent: z.string(),
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
          content: `你是 Web2App Studio 的配置助手。用户通过自然语言修改 Tauri 网页桌面应用配置。\n返回完整配置而不是差异。不得改变用户没有提到的配置。URL 只允许 http 或 https。accent 必须是 #RRGGBB。快捷键使用 CommandOrControl+Shift+字母格式。用简洁中文回复。当前配置：${current}`,
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
