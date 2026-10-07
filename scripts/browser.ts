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
    protocolTimeout: 300_000,
    ignoreDefaultArgs: ['--enable-automation'],
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-blink-features=AutomationControlled', '--lang=he-IL'],
  })
  let page = await openPage(browser)

  return {
    async fetchText(url: string) {
      try {
        return await readPage(page, url)
      } catch (error) {
        const message = error instanceof Error ? error.message : ''
        if (!/timed out|Target closed|Session closed|Protocol error|Execution context was destroyed/i.test(message)) throw error
        await page.close().catch(() => undefined)
        page = await openPage(browser)
        return await readPage(page, url)
      }
    },
    async close() {
      await browser.close()
    },
  }
}

async function openPage(browser: { newPage: () => Promise<Page> }): Promise<Page> {
  const page = await browser.newPage()
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
  })
  await page.setUserAgent(
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  )
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8' })
  return page
}

async function readPage(page: Page, url: string): Promise<string> {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (!/ERR_ABORTED|Navigation timeout/i.test(message)) throw error
  }
  const reviewPage = url.includes('showReview.php')
  const bookPage = url.includes('bookdetails.php')
  for (let attempt = 0; attempt < 20; attempt += 1) {
    let html = ''
    try {
      html = await page.content()
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      if (!/timed out|Execution context was destroyed|Target closed/i.test(message)) throw error
      await new Promise((resolve) => setTimeout(resolve, 1000))
      continue
    }
    if (isChallenge(html)) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      continue
    }
    if (bookPage && (html.includes('"viewCount"') || html.includes('aggregateRating') || html.includes('"description"'))) return html
    if (!reviewPage && !bookPage && html.includes('showReview.php?reviewId=')) return html
    if (reviewPage && (html.includes('bookdetails.php?item_id=') || html.includes('\\"bookId\\"'))) return html
    if (reviewPage && attempt >= 8 && html.includes('__next_f')) return html
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  return page.content()
}

type Page = {
  goto: (url: string, options: { waitUntil: 'domcontentloaded'; timeout: number }) => Promise<unknown>
  content: () => Promise<string>
  close: () => Promise<void>
  evaluateOnNewDocument: (fn: () => void) => Promise<unknown>
  setUserAgent: (ua: string) => Promise<unknown>
  setExtraHTTPHeaders: (headers: Record<string, string>) => Promise<unknown>
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
