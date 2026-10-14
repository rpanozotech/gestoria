export type AuthCheck =
  | { ok: true }
  | { ok: false; status: 401 | 403; error: string };

export async function validateManagerToken(
  token: string,
  fetchImpl: typeof fetch = fetch,
  backendOrigin = process.env.API_INTERNAL_URL || 'http://backend:5000',
): Promise<AuthCheck> {
  try {
    const response = await fetchImpl(`${backendOrigin.replace(/\/$/, '')}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      return { ok: false, status: 401, error: 'Token inválido o expirado.' };
    }
    const payload = await response.json() as { user?: { role?: string } };
    if (payload.user?.role !== 'admin' && payload.user?.role !== 'gestor') {
      return { ok: false, status: 403, error: 'No tienes permisos para usar esta función.' };
    }
    return { ok: true };
  } catch {
    return { ok: false, status: 401, error: 'No se pudo verificar la sesión.' };
  }
}
