'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { saveSession, getToken, SessionUser } from '@/lib/session';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Si ya hay sesion, no mostrar el login
  useEffect(() => {
    if (getToken()) {
      router.replace('/crm');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/backend/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'No se pudo iniciar sesion');
        setLoading(false);
        return;
      }

      saveSession(data.token, data.user as SessionUser);

      // Respeta el ?next= que pone el guard del layout del CRM
      const next = searchParams.get('next');
      router.replace(next && next.startsWith('/') ? next : '/crm');
    } catch {
      setError('Error de conexion. Intentalo de nuevo.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-900 border border-slate-700 flex items-center justify-center">
              <img src="/logo.png" alt="RP Gestoría" className="w-full h-full object-cover" />
            </div>
            <span className="font-headline-sm text-lg font-bold text-on-surface tracking-tight">
              RP Gestoría
            </span>
          </Link>
          <h1 className="font-headline-md text-2xl font-bold text-on-surface">Acceso al CRM</h1>
          <p className="text-sm text-on-surface-variant mt-1">Solo para gestores autorizados</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-on-surface mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-md text-sm text-on-surface focus:outline-none focus:border-secondary transition-colors"
              placeholder="gestor@rp-gestoria.tech"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-semibold text-on-surface mb-1.5">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-md text-sm text-on-surface focus:outline-none focus:border-secondary transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-800">
              <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-primary text-on-primary rounded-md text-sm font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/" className="text-xs text-outline hover:text-secondary transition-colors inline-flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">arrow_back</span>
            Volver a la web pública
          </Link>
        </div>
      </div>
    </div>
  );
}

// useSearchParams() obliga a renderizar en cliente, asi que Next exige que
// este componente este bajo un Suspense para poder prerenderizar la ruta.
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface flex items-center justify-center">
          <span className="material-symbols-outlined text-[28px] text-outline animate-spin">progress_activity</span>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}