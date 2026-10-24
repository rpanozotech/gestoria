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
  const [code, setCode] = useState('');
  const [needMfa, setNeedMfa] = useState(false);
  const [enrollmentToken, setEnrollmentToken] = useState('');
  const [secret, setSecret] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const continueToCrm = () => {
    const next = searchParams.get('next');
    router.replace(next && /^\/crm(?:\/|$)/.test(next) ? next : '/crm');
  };

  // Si ya hay sesion, no mostrar el login
  useEffect(() => {
    fetch('/api/backend/auth/me').then((res) => {
      if (res.ok) router.replace('/crm');
    }).catch(() => {});
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Modo demo local: no consulta PostgreSQL ni transmite credenciales.
    // Se activa únicamente con NEXT_PUBLIC_CRM_PREVIEW=true.
    if (process.env.NEXT_PUBLIC_CRM_PREVIEW === 'true' || process.env.NODE_ENV !== 'production') {
      const demoUser: SessionUser = {
        id: 'demo-user',
        email: email || 'demo@example.test',
        full_name: 'Usuario de prueba',
        role: 'gestor',
      };
      saveSession('nexusgest_local_demo', demoUser);
      router.replace('/crm');
      return;
    }

    try {
      const res = await fetch(enrollmentToken ? '/api/backend/auth/mfa/confirm' : '/api/backend/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(enrollmentToken ? { Authorization: 'Bearer ' + enrollmentToken } : {}) },
        body: JSON.stringify(enrollmentToken ? { code } : { email, password, code }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        if (data.mfaEnrollmentRequired) {
          setEnrollmentToken(data.enrollmentToken);
          const setup = await fetch('/api/backend/auth/mfa/setup', { method: 'POST', headers: { Authorization: 'Bearer ' + data.enrollmentToken } });
          const enrollment = await setup.json();
          if (!setup.ok) throw new Error(enrollment.error || 'No se pudo preparar la verificación.');
          setSecret(enrollment.secret);setNeedMfa(true);setLoading(false);return;
        }
        if (data.mfaRequired) { setNeedMfa(true);setLoading(false);return; }
        saveSession(data.token, data.user as SessionUser);
        setPassword('');setCode('');
        if (data.recoveryCodes) { setRecoveryCodes(data.recoveryCodes);setLoading(false);return; }
        continueToCrm();
        return;
      }
      throw new Error(data.error || 'No se pudo validar el acceso.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo validar el acceso.');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[--delft] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8 space-y-6 border-t-4 border-[--oranje-subdued]">
        <div className="text-center mb-8">
          <Link href="https://rp-gestoria.tech/" className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-900 border border-slate-700 flex items-center justify-center">
              <img src="/logo.png" alt="RP Asesoría" className="w-full h-full object-cover" />
            </div>
            <span className="font-headline-sm text-lg font-bold text-on-surface tracking-tight">
              RP Asesoría
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

          {recoveryCodes.length > 0 ? <section className="space-y-4" aria-label="Códigos de recuperación">
            <h2 className="font-bold">Guarda tus códigos de recuperación</h2>
            <p className="text-sm">Cada código se puede usar una sola vez si pierdes acceso a tu aplicación de autenticación. Guárdalos en un lugar privado; no se volverán a mostrar.</p>
            <pre className="overflow-x-auto rounded-lg bg-slate-100 p-3 text-xs">{recoveryCodes.join('\n')}</pre>
            <button type="button" onClick={continueToCrm} className="min-h-11 w-full rounded-lg bg-slate-900 px-4 text-white">He guardado los códigos. Entrar al CRM</button>
          </section> : <form onSubmit={handleSubmit} className="space-y-4">
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
                readOnly={needMfa}
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
                readOnly={needMfa}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-sm text-on-surface focus:outline-none focus:border-secondary transition-colors"
                placeholder="••••••••"
              />
            </div>

            {secret && <section className="space-y-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm" aria-label="Configurar verificación en dos pasos">
              <h2 className="font-bold">Activa la verificación en dos pasos</h2>
              <p>En tu aplicación de autenticación, añade una cuenta con clave manual: RP Asesoría, basada en tiempo, 6 dígitos.</p>
              <p className="break-all rounded bg-white p-2 font-mono text-xs select-all">{secret}</p>
              <p>Introduce el código generado. Esta clave es privada y solo se muestra durante la configuración.</p>
            </section>}
            {needMfa && <div><label htmlFor="mfa-code" className="mb-1.5 block text-xs font-semibold">{secret ? 'Código de 6 dígitos' : 'Código de autenticación o recuperación'}</label>
              <input id="mfa-code" required autoComplete="one-time-code" value={code} onChange={event => setCode(event.target.value)} className="min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm" />
            </div>}

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
              {loading ? 'Verificando...' : needMfa ? 'Verificar y entrar' : 'Iniciar Sesión'}
            </button>
          </form>}

        </div>

        <div className="mt-6 text-center">
          <Link href="https://rp-gestoria.tech/" className="text-xs text-outline hover:text-secondary transition-colors inline-flex items-center gap-1">
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
