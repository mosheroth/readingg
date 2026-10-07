import { cronAllowed, samplePayload } from '../../src/simania/http'

export const config = { maxDuration: 60 }

export default async function handler(
  req: { headers?: Record<string, string | string[] | undefined> },
  res: { status: (code: number) => { json: (body: unknown) => void } },
) {
  if (!cronAllowed(header(req.headers, 'authorization'))) {
    res.status(401).json({ ok: false })
    return
  }
  const result = await samplePayload()
  res.status(result.status).json(result.body)
}

function header(headers: Record<string, string | string[] | undefined> | undefined, name: string): string | null {
  const value = headers?.[name] ?? headers?.[name.toLowerCase()]
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}
