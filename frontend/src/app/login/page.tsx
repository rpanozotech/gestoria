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

  const handleQuickAccess = (role: 'gestor' | 'admin' = 'gestor') => {
    setLoading(true);
    const quickUser: SessionUser = {
      id: role === 'admin' ? 'usr_admin_master' : 'usr_gestor_ronyp',
      email: role === 'admin' ? 'admin@nexusgest.nl' : 'gestor@rp-gestoria.tech',
      full_name: role === 'admin' ? 'Administrador Sistema' : 'Rony (Gestor Principal)',
      role: role,
    };
    saveSession('nexusgest_local_demo', quickUser);
    const next = searchParams.get('next');
    router.replace(next && next.startsWith('/') ? next : '/crm');
  };

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

    if (process.env.NODE_ENV === 'production') {
      setLoading(false);
      setError('No se pudo validar el acceso. Comprueba el servidor y tus credenciales.');
      return;
    }

    // Solo en desarrollo: permite revisar la interfaz sin PostgreSQL.
    const role: 'gestor' | 'admin' = email.toLowerCase().includes('admin') ? 'admin' : 'gestor';
    const fallbackUser: SessionUser = {
      id: 'usr_' + Date.now(),
      email: email.trim() || 'gestor@rp-gestoria.tech',
      full_name: email.toLowerCase().includes('admin') ? 'Administrador Sistema' : 'Gestor Principal',
      role,
    };
    saveSession('nexusgest_local_demo', fallbackUser);
    const next = searchParams.get('next');
    router.replace(next && next.startsWith('/') ? next : '/crm');
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
          {/* Botón Acceso Rápido 1-Clic: solo desarrollo local */}
          {process.env.NODE_ENV !== 'production' && <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-center">
            <p className="text-xs font-semibold text-primary mb-2 flex items-center justify-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-amber-500">bolt</span>
              Acceso Rápido sin Contraseña
            </p>
            <button
              type="button"
              onClick={() => handleQuickAccess('gestor')}
              disabled={loading}
              className="w-full py-2.5 px-4 bg-primary text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 group cursor-pointer"
            >
              <span>Entrar como Gestor Principal</span>
              <span className="material-symbols-outlined text-[18px] group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
            </button>
            <p className="text-[11px] text-on-surface-variant/80 mt-1.5">
              Acceso inmediato al CRM y gestión completa
            </p>
          </div>}

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
                <button
                  type="button"
                  onClick={() => { setEmail('gestor@rp-gestoria.tech'); setPassword('admin123'); }}
                  className="text-[11px] text-secondary hover:underline cursor-pointer"
                >
                  Autorellenar
                </button>
              </div>
              <input
                id="email"
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm text-on-surface focus:outline-none focus:border-secondary transition-colors"
                placeholder="gestor@rp-gestoria.tech"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="password" className="block text-xs font-semibold text-on-surface">
                  Contraseña
                </label>
                <span className="text-[11px] text-outline">admin123</span>
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

          {/* Cuentas de demostración predefinidas */}
          <div className="pt-2 border-t border-outline-variant/40">
            <p className="text-[11px] font-semibold text-outline mb-2 text-center">Cuentas preconfiguradas:</p>
            <div className="grid grid-cols-2 gap-2 text-left">
              <button
                type="button"
                onClick={() => { setEmail('gestor@rp-gestoria.tech'); setPassword('admin123'); }}
                className="p-2 rounded-lg border border-outline-variant/70 hover:border-secondary hover:bg-secondary/5 transition-all text-left cursor-pointer"
              >
                <div className="text-[11px] font-bold text-on-surface">Gestor</div>
                <div className="text-[10px] text-outline truncate">gestor@rp-gestoria.tech</div>
              </button>
              <button
                type="button"
                onClick={() => { setEmail('admin@nexusgest.nl'); setPassword('admin123'); }}
                className="p-2 rounded-lg border border-outline-variant/70 hover:border-secondary hover:bg-secondary/5 transition-all text-left cursor-pointer"
              >
                <div className="text-[11px] font-bold text-on-surface">Admin</div>
                <div className="text-[10px] text-outline truncate">admin@nexusgest.nl</div>
              </button>
            </div>
          </div>
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
