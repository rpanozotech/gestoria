'use client';

import React, { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function PortalLoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Introduce tu usuario y contraseña para continuar.');
      return;
    }

    setError('');
    setLoading(true);
    fetch('/api/backend/auth/portal-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: identifier.trim(), password }),
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.token || !data.user?.client_id) {
          throw new Error(data.error || 'Usuario o contraseña incorrectos.');
        }
        window.localStorage.setItem('rp_portal_token', data.token);
        window.localStorage.setItem('rp_portal_session_user', JSON.stringify(data.user));
        router.replace('/portal');
      })
      .catch((loginError) => {
        setError(loginError instanceof Error ? loginError.message : 'No se ha podido comprobar el acceso.');
      })
      .finally(() => setLoading(false));
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4 py-10 relative overflow-hidden">
      <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-blue-600/20 blur-3xl" />
      <div className="absolute -bottom-48 -left-32 w-96 h-96 rounded-full bg-indigo-600/15 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-7 group">
            <span className="w-12 h-12 rounded-2xl overflow-hidden border border-slate-700 bg-white shadow-lg group-hover:scale-105 transition-transform">
              <img src="/logo.png" alt="RP Gestoría" className="w-full h-full object-cover" />
            </span>
            <span className="text-left">
              <span className="block font-heading text-lg font-extrabold tracking-tight">Mijn RP Gestoría</span>
              <span className="block text-[10px] uppercase tracking-[0.18em] text-slate-400 font-bold">Portal seguro del cliente</span>
            </span>
          </Link>
          <p className="text-blue-300 text-xs font-bold uppercase tracking-[0.2em]">Área Cliente</p>
          <h1 className="mt-3 text-3xl sm:text-4xl font-heading font-extrabold tracking-tight">Bienvenido de nuevo</h1>
          <p className="mt-3 text-sm text-slate-400">Introduce tus credenciales para continuar.</p>
          <p className="mt-2 text-xs text-slate-500">Tu gestor te proporcionará el usuario y la contraseña por WhatsApp.</p>
        </div>

        <section className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="portal-identifier" className="block text-xs font-bold text-slate-300 mb-2">Usuario</label>
              <input
                id="portal-identifier"
                type="text"
                autoComplete="username"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="Tu usuario"
                className="w-full h-12 px-4 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder:text-slate-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
              />
            </div>

            <div>
              <div className="mb-2">
                <label htmlFor="portal-password" className="block text-xs font-bold text-slate-300">Contraseña</label>
              </div>
              <div className="relative">
                <input
                  id="portal-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Introduce tu contraseña"
                  className="w-full h-12 px-4 pr-12 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder:text-slate-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            {error && <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-sm font-extrabold shadow-lg shadow-blue-900/30 transition-colors"
            >
              {loading ? 'Comprobando acceso...' : 'Entrar al portal'}
            </button>
          </form>

        </section>

        <Link href="/" className="mt-6 flex justify-center items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Volver a la web pública
        </Link>
      </div>
    </main>
  );
}
