'use client';

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import ConfigurationNav from '@/components/crm/ConfigurationNav';

const emptyProfile = { full_name: '', title: '', organization: '', phone: '', email: '', hours: '', online: true, avatar_url: '', bio: '', booking_enabled: true, chat_enabled: true };

export default function AdvisorProfilePage() {
  const [profile, setProfile] = useState(emptyProfile);
  const [status, setStatus] = useState<'idle' | 'loading' | 'saving' | 'saved' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/advisor-profile').then(async (response) => {
      if (!response.ok) throw new Error('No se pudo cargar el perfil.');
      const data = await response.json();
      setProfile({ ...emptyProfile, ...(data.profile || {}) });
      setStatus('idle');
    }).catch((reason) => { 
      setError(reason instanceof Error ? reason.message : 'No se pudo cargar el perfil.'); 
      setStatus('error'); 
    });
  }, []);

  const update = (key: string, value: string | boolean) => setProfile((current) => ({ ...current, [key]: value }));
  const save = async () => {
    setStatus('saving'); setError('');
    try {
      const response = await apiFetch('/advisor-profile', { method: 'PUT', body: JSON.stringify(profile) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar el perfil.');
      setProfile({ ...emptyProfile, ...data.profile }); setStatus('saved');
    } catch (reason) { 
      setError(reason instanceof Error ? reason.message : 'No se pudo guardar el perfil.'); 
      setStatus('error'); 
    }
  };

  return (
    <div className="w-full h-full min-h-0 overflow-hidden flex flex-col gap-2">
      <header className="shrink-0 pb-2 border-b border-surface-container flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-on-surface">Perfil del Asesor del Portal</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary/10 text-secondary">
              Portal del Cliente
            </span>
          </div>
          <p className="text-[11px] text-on-surface-variant">
            Estos datos aparecen al cliente en su portal. No se muestran secretos ni contraseñas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span role="status" className="text-xs text-on-surface-variant font-medium">
            {status === 'saved' ? 'Guardado correctamente.' : status === 'saving' ? 'Guardando…' : status === 'loading' ? 'Cargando…' : 'Listo para editar'}
          </span>
          <button 
            type="button" 
            disabled={status === 'loading' || status === 'saving'} 
            onClick={save} 
            className="rounded-lg bg-secondary px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {status === 'saving' ? 'Guardando…' : 'Guardar perfil'}
          </button>
        </div>
      </header>

      <ConfigurationNav />

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-800 shrink-0 flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={() => window.location.reload()} className="font-bold underline text-xs">Reintentar</button>
        </div>
      )}

      <div className="flex-1 min-h-0 grid gap-3 lg:grid-cols-[minmax(0,1fr)_340px] overflow-hidden">
        {/* Formulario */}
        <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-3.5 shadow-sm flex flex-col h-full min-h-0 overflow-hidden" aria-busy={status === 'loading' || status === 'saving'}>
          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-3 pr-1">
            <div className="grid gap-2.5 sm:grid-cols-2">
              {([['full_name','Nombre completo'],['title','Cargo o especialidad'],['organization','Organización'],['phone','Teléfono'],['email','Correo electrónico'],['hours','Horario de atención']] as const).map(([key,label]) => (
                <label key={key} className="text-xs font-semibold text-on-surface-variant">
                  <span className="block text-[11px] font-semibold text-outline uppercase tracking-wider mb-1">{label}</span>
                  <input value={profile[key]} onChange={(event) => update(key,event.target.value)} className="h-8 w-full rounded-md border border-outline-variant bg-surface px-2.5 text-xs text-on-surface focus:border-secondary focus:outline-none" />
                </label>
              ))}
            </div>

            <label className="block text-xs font-semibold text-on-surface-variant">
              <span className="block text-[11px] font-semibold text-outline uppercase tracking-wider mb-1">Texto de presentación</span>
              <textarea value={profile.bio} onChange={(event) => update('bio',event.target.value)} rows={3} maxLength={600} className="w-full rounded-md border border-outline-variant bg-surface px-2.5 py-1.5 text-xs text-on-surface focus:border-secondary focus:outline-none" />
            </label>

            <label className="block text-xs font-semibold text-on-surface-variant">
              <span className="block text-[11px] font-semibold text-outline uppercase tracking-wider mb-1">URL de fotografía o avatar</span>
              <input value={profile.avatar_url} onChange={(event) => update('avatar_url',event.target.value)} className="h-8 w-full rounded-md border border-outline-variant bg-surface px-2.5 text-xs text-on-surface focus:border-secondary focus:outline-none" />
            </label>

            <div className="grid gap-2 sm:grid-cols-3 text-xs text-on-surface pt-1 border-t border-surface-container">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={profile.online} onChange={(event) => update('online',event.target.checked)} className="rounded text-secondary focus:ring-secondary" />
                <span>Disponible online</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={profile.booking_enabled} onChange={(event) => update('booking_enabled',event.target.checked)} className="rounded text-secondary focus:ring-secondary" />
                <span>Botón de cita</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={profile.chat_enabled} onChange={(event) => update('chat_enabled',event.target.checked)} className="rounded text-secondary focus:ring-secondary" />
                <span>Botón de chat</span>
              </label>
            </div>
          </div>
        </section>

        {/* Vista previa */}
        <aside className="rounded-xl border border-outline-variant bg-surface-container-low p-3.5 flex flex-col h-full min-h-0 overflow-y-auto no-scrollbar" aria-label="Vista previa del portal">
          <p className="text-[10px] uppercase font-bold tracking-wider text-secondary shrink-0">Vista previa en Portal</p>
          <div className="mt-2.5 rounded-xl bg-surface-container-lowest p-3.5 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-primary text-base font-bold text-white shrink-0">
                {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : profile.full_name.slice(0,1).toUpperCase() || 'A'}
              </div>
              <div className="min-w-0">
                <h2 className="font-bold text-xs text-on-surface truncate">{profile.full_name || 'Asesor RP'}</h2>
                <p className="text-[11px] text-on-surface-variant truncate">{profile.title || 'Gestor & Asesor Fiscal'}</p>
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-on-surface-variant">
              {profile.bio || 'Especialista en trámites con Belastingdienst, subvenciones y asesoría para residentes en Países Bajos.'}
            </p>
            <div className="mt-3 pt-2.5 border-t border-surface-container text-[11px] text-on-surface-variant flex items-center justify-between">
              <span>{profile.hours || 'Lun - Vie: 9:00 - 18:00'}</span>
              <span className={`inline-flex items-center gap-1 font-semibold ${profile.online ? 'text-emerald-700' : 'text-slate-500'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${profile.online ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                {profile.online ? 'En línea' : 'Desconectado'}
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
