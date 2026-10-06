'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

type Integration = { channel: 'email' | 'whatsapp'; provider: string; enabled: boolean; config: Record<string, string>; configured: boolean };

const defaults: Record<string, { provider: string; config: Record<string, string> }> = {
  email: { provider: 'brevo', config: { sender_email: '', sender_name: '' } },
  whatsapp: { provider: 'meta_whatsapp', config: { phone_number_id: '', business_account_id: '' } },
};

export default function IntegracionesPage() {
  const [items, setItems] = useState<Record<string, Integration>>({});
  const [secrets, setSecrets] = useState<Record<string, string>>({ email: '', whatsapp: '' });
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/integrations').then((r) => r.ok ? r.json() : null).then((data) => {
      const next: Record<string, Integration> = {};
      for (const item of data?.integrations || []) next[item.channel] = item;
      setItems(next);
    }).catch(() => setStatus('No se pudo cargar la configuración.'));
  }, []);

  const value = (channel: 'email' | 'whatsapp') => items[channel] || { channel, ...defaults[channel], enabled: false, configured: false } as Integration;
  const update = (channel: 'email' | 'whatsapp', patch: Partial<Integration>) => setItems((prev) => ({ ...prev, [channel]: { ...value(channel), ...patch } }));
  const save = async (channel: 'email' | 'whatsapp') => {
    const item = value(channel);
    setSaving(channel); setStatus('');
    const res = await apiFetch(`/integrations/${channel}`, { method: 'PUT', body: JSON.stringify({ ...item, secret: secrets[channel] || undefined }) });
    const data = await res.json().catch(() => ({}));
    setSaving(null);
    if (!res.ok) return setStatus(data.error || 'No se pudo guardar.');
    setSecrets((prev) => ({ ...prev, [channel]: '' }));
    update(channel, data.integration);
    setStatus(`${channel === 'email' ? 'Email' : 'WhatsApp'} guardado. La clave nunca se muestra.`);
  };

  return <main className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6 overflow-y-auto h-full">
    <header><p className="text-xs uppercase tracking-widest text-secondary font-bold">CRM · Configuración</p><h1 className="text-3xl font-extrabold text-on-surface mt-1">Integraciones y avisos</h1><p className="text-sm text-outline mt-2">Configura desde aquí el proveedor de email y WhatsApp. Las claves se cifran en el servidor y nunca se vuelven a mostrar.</p></header>
    {status && <div role="status" className="rounded-lg border border-secondary/30 bg-secondary/10 p-3 text-sm text-on-surface">{status}</div>}
    {(['email', 'whatsapp'] as const).map((channel) => { const item = value(channel); return <section key={channel} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 space-y-4 shadow-sm">
      <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-on-surface">{channel === 'email' ? 'Email transaccional' : 'WhatsApp Business'}</h2><p className="text-xs text-outline mt-1">{channel === 'email' ? 'Brevo o Resend para confirmaciones y recordatorios.' : 'Meta Cloud API, Twilio o 360dialog.'}</p></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={item.enabled} onChange={(e) => update(channel, { enabled: e.target.checked })} /> Activado</label></div>
      <label className="block text-sm font-semibold">Proveedor<select className="mt-1 w-full rounded-lg border border-outline-variant bg-surface p-2.5" value={item.provider} onChange={(e) => update(channel, { provider: e.target.value })}>{(channel === 'email' ? [['brevo','Brevo'],['resend','Resend']] : [['meta_whatsapp','Meta WhatsApp Cloud API'],['twilio_whatsapp','Twilio WhatsApp'],['360dialog_whatsapp','360dialog']]).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></label>
      <div className="grid sm:grid-cols-2 gap-3">{Object.entries(item.config || {}).map(([key, current]) => <label key={key} className="text-sm font-semibold">{key.replaceAll('_', ' ')}<input className="mt-1 w-full rounded-lg border border-outline-variant bg-surface p-2.5" value={current} onChange={(e) => update(channel, { config: { ...item.config, [key]: e.target.value } })} /></label>)}</div>
      <label className="block text-sm font-semibold">{channel === 'email' ? 'API key' : 'Token de acceso'}<input type="password" autoComplete="new-password" className="mt-1 w-full rounded-lg border border-outline-variant bg-surface p-2.5" value={secrets[channel]} onChange={(e) => setSecrets((prev) => ({ ...prev, [channel]: e.target.value }))} placeholder={item.configured ? 'Clave guardada; dejar vacío para conservarla' : 'Se guardará cifrada en el servidor'} /></label>
      <div className="flex justify-end"><button type="button" disabled={saving === channel} onClick={() => save(channel)} className="rounded-lg bg-primary px-4 py-2 text-white font-semibold disabled:opacity-50">{saving === channel ? 'Guardando…' : 'Guardar configuración'}</button></div>
    </section>; })}
  </main>;
}
