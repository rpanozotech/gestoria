'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

const labels: Record<string, string> = { citas: 'Recordatorio de citas', deudas: 'Vencimientos de deudas', pagos: 'Pagos pendientes', documentos: 'Nuevos documentos', mensajes: 'Mensajes de clientes', facturas: 'Facturas pendientes', tareas: 'Tareas urgentes' };
const defaults = { citas: true, deudas: true, pagos: true, documentos: true, mensajes: true, facturas: true, tareas: true };
type Preferences = typeof defaults;

export default function NotificationPreferencesPage() {
  const [preferences, setPreferences] = useState<Preferences>(defaults);
  const [subscribed, setSubscribed] = useState(false);
  const [notice, setNotice] = useState('');
  useEffect(() => { apiFetch('/push/preferences').then((res) => res.ok ? res.json() : null).then((data) => data?.preferences && setPreferences({ ...defaults, ...data.preferences })).catch(() => undefined); }, []);
  const save = async (next: Preferences) => { setPreferences(next); await apiFetch('/push/preferences', { method: 'PUT', body: JSON.stringify(next) }); setNotice('Preferencias guardadas.'); window.setTimeout(() => setNotice(''), 2500); };
  const subscribe = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !window.isSecureContext) { setNotice('Las notificaciones requieren HTTPS o localhost.'); return; }
    const registration = await navigator.serviceWorker.ready; const keyResponse = await apiFetch('/push/public-key'); const keyData = await keyResponse.json();
    if (!keyData.publicKey) { setNotice('Push aún no está configurado en este staging.'); return; }
    const applicationServerKey = Uint8Array.from(atob(keyData.publicKey.replace(/-/g, '+').replace(/_/g, '/')), (char) => char.charCodeAt(0));
    const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
    await apiFetch('/push/subscription', { method: 'POST', body: JSON.stringify({ subscription }) }); setSubscribed(true); setNotice('Notificaciones activadas.');
  };
  const unsubscribe = async () => { const registration = await navigator.serviceWorker.ready; const subscription = await registration.pushManager.getSubscription(); await apiFetch('/push/subscription', { method: 'DELETE', body: JSON.stringify({ endpoint: subscription?.endpoint }) }); await subscription?.unsubscribe(); setSubscribed(false); setNotice('Notificaciones canceladas.'); };
  return <div className="mx-auto max-w-3xl space-y-6 pb-10"><header className="border-b border-surface-container pb-5"><p className="text-[11px] font-bold tracking-[0.14em] text-secondary">CONFIGURACIÓN</p><h1 className="mt-1 text-3xl font-bold text-on-surface">Preferencias de avisos</h1><p className="mt-1 text-sm text-on-surface-variant">Controla qué avisos quieres recibir. Las previsualizaciones no muestran datos de clientes.</p></header>{notice && <div role="status" className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">{notice}</div>}<section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold text-on-surface">Notificaciones push</h2><p className="mt-1 text-xs text-on-surface-variant">Recibe un aviso genérico y consulta los detalles después de iniciar sesión.</p></div><div className="flex gap-2"><button type="button" onClick={subscribe} className="min-h-10 rounded-md bg-secondary px-3 text-xs font-semibold text-white">Activar</button><button type="button" onClick={unsubscribe} className="min-h-10 rounded-md border border-outline-variant px-3 text-xs font-semibold text-on-surface-variant">Cancelar</button></div></div><p className="mt-3 text-xs font-semibold text-on-surface-variant">Estado: {subscribed ? 'Activo en este dispositivo' : 'No confirmado en este dispositivo'}</p></section><section className="divide-y divide-surface-container rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">{Object.entries(labels).map(([key, label]) => <label key={key} className="flex items-center justify-between gap-4 p-4"><span><span className="block text-sm font-semibold text-on-surface">{label}</span><span className="mt-1 block text-xs text-on-surface-variant">Aviso sin información sensible.</span></span><input type="checkbox" checked={preferences[key as keyof Preferences]} onChange={(e) => save({ ...preferences, [key]: e.target.checked })} className="h-5 w-5 accent-secondary" /></label>)}</section></div>;
}
