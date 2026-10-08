export function cronAllowed(authorization: string | null | undefined): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return process.env.VERCEL_ENV !== 'production'
  return authorization === `Bearer ${secret}`
}
