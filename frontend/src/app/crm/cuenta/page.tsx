'use client';

import { useState, type FormEvent } from 'react';
import { apiUrl } from '@/lib/api';
import { clearSession, getToken } from '@/lib/session';

export default function AccountPage() {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError('');
    const form = event.currentTarget;
    const fields = new FormData(form);
    const body = Object.fromEntries(fields.entries());
    if (body.newPassword !== body.confirmPassword) { setError('Las contraseñas nuevas no coinciden.'); return; }
    if (new TextEncoder().encode(String(body.newPassword)).length > 72) { setError('La contraseña nueva supera el máximo de 72 bytes.'); return; }
    setBusy(true);
    try {
      const token = getToken();
      const response = await fetch(apiUrl('/auth/change-password'), {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) { setError(data.error || 'No se pudo cambiar la contraseña.');return; }
      form.reset();clearSession();window.location.replace('/login?passwordChanged=1');
    } catch { setError('No se pudo conectar. Comprueba tu conexión e inténtalo de nuevo.'); }
    finally { setBusy(false); }
  }
  const inputClass = 'mt-1 w-full rounded-lg border border-slate-300 p-3 text-slate-900 focus:outline-blue-600';
  return <section className="overflow-y-auto py-5"><div className="mx-auto max-w-xl rounded-xl border border-slate-200 bg-white p-5 sm:p-8">
    <h1 className="text-xl font-bold text-slate-900">Mi cuenta</h1>
    <h2 className="mt-5 text-lg font-semibold">Cambiar contraseña</h2>
    <p className="mt-2 text-sm text-slate-600">Usa una contraseña distinta de al menos 12 caracteres (máximo 72 bytes). Se conservará la verificación en dos pasos.</p>
    <p className="mt-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">Al confirmar se cerrarán todas tus sesiones, incluida esta. Tendrás que iniciar sesión con tu nueva contraseña y tu segundo factor. Usa un código nuevo del autenticador, distinto al utilizado para entrar.</p>
    <form onSubmit={submit} className="mt-5 space-y-4" aria-busy={busy}>
      <label className="block text-sm font-medium" htmlFor="currentPassword">Contraseña actual<input className={inputClass} id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required maxLength={1024} /></label>
      <label className="block text-sm font-medium" htmlFor="newPassword">Nueva contraseña<input className={inputClass} id="newPassword" name="newPassword" type="password" autoComplete="new-password" required minLength={12} /></label>
      <label className="block text-sm font-medium" htmlFor="confirmPassword">Repetir nueva contraseña<input className={inputClass} id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required minLength={12} /></label>
      <label className="block text-sm font-medium" htmlFor="code">Código del autenticador<input className={inputClass} id="code" name="code" type="text" inputMode="numeric" autoComplete="one-time-code" required pattern="[0-9]{6}" maxLength={6} /></label>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <button disabled={busy} className="w-full rounded-lg bg-blue-700 p-3 font-semibold text-white disabled:opacity-50" type="submit">{busy ? 'Cambiando…' : 'Cambiar contraseña y cerrar todas las sesiones'}</button>
    </form>
  </div></section>;
}
