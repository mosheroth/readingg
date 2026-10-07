import { booksPayload } from '../src/simania/http'

export default async function handler(
  req: { url?: string },
  res: { status: (code: number) => { json: (body: unknown) => void } },
) {
  const result = await booksPayload(req.url || '/api/books')
  res.status(result.status).json(result.body)
}
