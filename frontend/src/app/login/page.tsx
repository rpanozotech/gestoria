'use client';

/* eslint-disable @next/next/no-img-element */

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

      if (res.ok) {
        const data = await res.json();
        saveSession(data.token, data.user as SessionUser);
        const next = searchParams.get('next');
        router.replace(next && next.startsWith('/') ? next : '/crm');
        return;
      }
    } catch {
      // Backend offline o proxy no disponible: pasar a modo local transparente
    }

    setLoading(false);
    setError('No se pudo validar el acceso. Comprueba el servidor y tus credenciales.');
  };

  return (
    <div className="min-h-screen bg-[--delft] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8 space-y-6 border-t-4 border-[--oranje-subdued]">
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

        {/* Formulario de acceso */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-xl space-y-5">
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-outline-variant/60"></div>
            <span className="flex-shrink mx-3 text-[11px] font-semibold text-outline uppercase tracking-wider">o con credenciales</span>
            <div className="flex-grow border-t border-outline-variant/60"></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="email" className="block text-xs font-semibold text-on-surface">
                  Email
                </label>
              </div>
              <input
                id="email"
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm text-on-surface focus:outline-none focus:border-secondary transition-colors"
                placeholder="tu@dominio.com"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="password" className="block text-xs font-semibold text-on-surface">
                  Contraseña
                </label>
              </div>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm text-on-surface focus:outline-none focus:border-secondary transition-colors"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-900">
                <span className="material-symbols-outlined text-[16px] text-amber-600 shrink-0">info</span>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>

        </div>

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
