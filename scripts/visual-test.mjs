import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'
import JSZip from 'jszip'

const executablePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const artifacts = path.resolve('.artifacts')
fs.mkdirSync(artifacts, { recursive: true })

const browser = await chromium.launch({ executablePath, headless: true })
const results = []

try {
  for (const viewport of [
    { name: 'desktop', width: 1440, height: 1100 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    const context = await browser.newContext({ viewport, acceptDownloads: true })
    const page = await context.newPage()
    const errors = []
    page.on('console', (message) => {
      if (message.type() === 'error' && !message.text().includes('/api/assistant')) errors.push(message.text())
    })
    page.on('pageerror', (error) => errors.push(error.message))

    await page.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle' })
    await page.locator('h1').waitFor({ state: 'visible' })
    const metrics = await page.evaluate(() => ({
      title: document.title,
      heading: document.querySelector('h1')?.textContent?.replace(/\s+/g, ' ').trim(),
      viewportWidth: document.documentElement.clientWidth,
      contentWidth: document.documentElement.scrollWidth,
      workspaceHeight: Math.round(document.querySelector('.workspace')?.getBoundingClientRect().height || 0),
    }))
    await page.screenshot({ path: path.join(artifacts, `${viewport.name}.png`), fullPage: true })
    results.push({ ...viewport, ...metrics, errors })

    if (viewport.name === 'desktop') {
      const assistant = page.locator('.chat-input textarea')
      await assistant.fill('窗口改成 1440 × 900')
      await assistant.press('Enter')
      await page.getByText('窗口设为 1440 × 900', { exact: false }).waitFor()
      const values = await page.locator('.size-row input').evaluateAll((inputs) => inputs.map((input) => input.value))
      if (values.join('x') !== '1440x900') throw new Error(`Assistant did not update dimensions: ${values}`)

      await page.getByRole('button', { name: '手动', exact: true }).click()
      await page.getByText('不使用 AI，也能完整生成').waitFor()
      await page.getByRole('button', { name: /Android/ }).click()
      await page.locator('.icon-file-input').setInputFiles({
        name: 'test-icon.png',
        mimeType: 'image/png',
        buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+XHLN5QAAAABJRU5ErkJggg==', 'base64'),
      })
      await page.getByAltText('应用图标预览').waitFor()

      await page.getByRole('button', { name: /生成 Tauri 项目/ }).click()
      await page.getByText('项目已就绪').waitFor()
      const apkButton = page.getByRole('button', { name: /下载 APK/ })
      if (await apkButton.isEnabled()) throw new Error('APK button should be disabled without an Android builder')
      const downloadPromise = page.waitForEvent('download')
      await page.getByRole('button', { name: /项目 ZIP/ }).click()
      const download = await downloadPromise
      results[0].download = download.suggestedFilename()
      const zip = await JSZip.loadAsync(await fs.promises.readFile(await download.path()))
      for (const required of [
        'my-web-app/src-tauri/src/lib.rs',
        'my-web-app/src-tauri/icons/icon.png',
        'my-web-app/web2app.config.json',
      ]) {
        if (!zip.file(required)) throw new Error(`Export is missing ${required}`)
      }
      results[0].exportFilesVerified = true
    }
    await context.close()
  }
} finally {
  await browser.close()
}

console.log(JSON.stringify(results, null, 2))
