'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

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
    }).catch((reason) => { setError(reason instanceof Error ? reason.message : 'No se pudo cargar el perfil.'); setStatus('error'); });
  }, []);

  const update = (key: string, value: string | boolean) => setProfile((current) => ({ ...current, [key]: value }));
  const save = async () => {
    setStatus('saving'); setError('');
    try {
      const response = await apiFetch('/advisor-profile', { method: 'PUT', body: JSON.stringify(profile) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar el perfil.');
      setProfile({ ...emptyProfile, ...data.profile }); setStatus('saved');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo guardar el perfil.'); setStatus('error'); }
  };

  return <div className="max-w-6xl space-y-6">
    <header><p className="text-[11px] font-semibold text-secondary">CONFIGURACIÓN · PORTAL</p><h1 className="text-2xl font-bold text-on-surface">Perfil del asesor del portal</h1><p className="mt-1 text-sm text-on-surface-variant">Estos datos aparecen al cliente en su portal. No se muestran secretos ni credenciales.</p></header>
    {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error} <button type="button" onClick={() => window.location.reload()} className="ml-2 font-bold underline">Reintentar</button></div>}
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm space-y-5" aria-busy={status === 'loading' || status === 'saving'}>
        <div className="grid gap-4 sm:grid-cols-2">
          {([['full_name','Nombre'],['title','Cargo o especialidad'],['organization','Organización'],['phone','Teléfono'],['email','Correo electrónico'],['hours','Horario de atención']] as const).map(([key,label]) => <label key={key} className="text-xs font-semibold text-on-surface-variant">{label}<input value={profile[key]} onChange={(event) => update(key,event.target.value)} className="mt-1 h-10 w-full rounded-md border border-outline-variant bg-surface px-3 text-sm text-on-surface outline-none focus-visible:ring-2 focus-visible:ring-secondary" /></label>)}
        </div>
        <label className="block text-xs font-semibold text-on-surface-variant">Texto de presentación<textarea value={profile.bio} onChange={(event) => update('bio',event.target.value)} rows={4} maxLength={600} className="mt-1 w-full rounded-md border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface outline-none focus-visible:ring-2 focus-visible:ring-secondary" /></label>
        <label className="block text-xs font-semibold text-on-surface-variant">URL de fotografía o avatar<input value={profile.avatar_url} onChange={(event) => update('avatar_url',event.target.value)} className="mt-1 h-10 w-full rounded-md border border-outline-variant bg-surface px-3 text-sm text-on-surface outline-none focus-visible:ring-2 focus-visible:ring-secondary" /></label>
        <div className="grid gap-3 sm:grid-cols-3 text-sm text-on-surface"><label className="flex items-center gap-2"><input type="checkbox" checked={profile.online} onChange={(event) => update('online',event.target.checked)} /> Disponible online</label><label className="flex items-center gap-2"><input type="checkbox" checked={profile.booking_enabled} onChange={(event) => update('booking_enabled',event.target.checked)} /> Botón de cita</label><label className="flex items-center gap-2"><input type="checkbox" checked={profile.chat_enabled} onChange={(event) => update('chat_enabled',event.target.checked)} /> Botón de chat</label></div>
        <div className="flex items-center justify-between border-t border-surface-container pt-4"><span role="status" className="text-xs text-on-surface-variant">{status === 'saved' ? 'Guardado correctamente.' : status === 'saving' ? 'Guardando…' : status === 'loading' ? 'Cargando…' : 'Los cambios se registran en el servidor.'}</span><button type="button" disabled={status === 'loading' || status === 'saving'} onClick={save} className="rounded-md bg-secondary px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{status === 'saving' ? 'Guardando…' : 'Guardar perfil'}</button></div>
      </section>
      <aside className="rounded-xl border border-outline-variant bg-surface-container-low p-5" aria-label="Vista previa del portal"><p className="text-[11px] font-semibold text-secondary">VISTA PREVIA</p><div className="mt-4 rounded-xl bg-surface-container-lowest p-4 shadow-sm"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-primary text-lg font-bold text-white">{profile.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : profile.full_name.slice(0,1).toUpperCase() || 'A'}</div><div><h2 className="font-bold text-on-surface">{profile.full_name || 'Pendiente de configuración'}</h2><p className="text-xs text-on-surface-variant">{profile.title || 'Pendiente de configuración'}</p></div></div><p className="mt-4 text-sm leading-relaxed text-on-surface-variant">{profile.bio || 'Pendiente de configuración'}</p><p className="mt-4 text-xs text-on-surface-variant">{profile.hours || 'Pendiente de configuración'} · {profile.online ? 'Disponible online' : 'No disponible online'}</p></div></aside>
    </div>
  </div>;
}
