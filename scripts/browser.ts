import { execSync } from 'node:child_process'
import { isChallenge } from '../src/simania/parse.ts'

export async function createBrowserFetch(): Promise<{
  fetchText: (url: string) => Promise<string>
  close: () => Promise<void>
}> {
  const puppeteer = await import('puppeteer-core')
  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: true,
    ignoreDefaultArgs: ['--enable-automation'],
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-blink-features=AutomationControlled', '--lang=he-IL'],
  })
  const page = await browser.newPage()
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
  })
  await page.setUserAgent(
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  )
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8' })

  return {
    async fetchText(url: string) {
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })
      } catch (error) {
        const message = error instanceof Error ? error.message : ''
        if (!/ERR_ABORTED|Navigation timeout/i.test(message)) throw error
      }
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const html = await page.content()
        if (!isChallenge(html)) return html
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
      return page.content()
    },
    async close() {
      await browser.close()
    },
  }
}

function findChrome(): string {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH
  for (const name of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
    try {
      const found = execSync(`command -v ${name}`, { encoding: 'utf8' }).trim()
      if (found) return found
    } catch {
      // Try the next binary name.
    }
  }
  throw new Error('Chrome was not found. Set CHROME_PATH.')
}
