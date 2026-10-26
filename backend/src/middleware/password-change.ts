import type { Request, Response, NextFunction } from 'express';

// Same single-process deployment model as rate-limit.ts. Reserve in-flight
// attempts as well, so concurrent failures cannot bypass the limit.
const attempts = new Map<string, { count: number; expires: number }>();
export function passwordChangeGuard(req: Request, res: Response, next: NextFunction) {
  res.setHeader('Cache-Control', 'no-store');
  const origin = req.get('origin');
  const allowed = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',').map(s => s.trim());
  if ((origin && !allowed.includes(origin)) || (!origin && !req.get('authorization')?.startsWith('Bearer ')) || !req.is('application/json') || req.get('sec-fetch-site') === 'cross-site') {
    return res.status(403).json({ error: 'Origen de la solicitud no permitido.' });
  }
  const now = Date.now();
  for (const [key, value] of attempts) if (value.expires <= now) attempts.delete(key);
  // Socket address cannot be spoofed via X-Forwarded-For. The account bucket
  // independently limits a user across IPs; the proxy-wide cap is conservative.
  const keys = [`user:${req.user!.id}`, `ip:${req.socket.remoteAddress}`];
  if (attempts.size > 50000) return res.status(429).json({ error: 'Inténtalo más tarde.' });
  const buckets = keys.map(key => {
    let bucket = attempts.get(key);
    if (!bucket) { bucket = { count: 0, expires: now + 15 * 60_000 }; attempts.set(key, bucket); }
    return bucket;
  });
  if (buckets.some((b, i) => b.count >= (i === 0 ? 10 : 100))) {
    res.setHeader('Retry-After', String(Math.max(1, Math.ceil((Math.max(...buckets.map(b => b.expires)) - now) / 1000))));
    return res.status(429).json({ error: 'Demasiados intentos. Espera 15 minutos antes de volver a intentarlo.' });
  }
  buckets.forEach(b => b.count++);
  res.on('finish', () => {
    if (res.statusCode < 400 || res.statusCode >= 500) buckets.forEach(b => b.count--);
    console.info(JSON.stringify({ event: 'password_change', userId: req.user!.id, status: res.statusCode }));
  });
  next();
}
