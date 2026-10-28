'use client';

import { useEffect, useState, useRef } from 'react';
import { apiFetch } from '@/lib/api';
import ConfigurationNav from '@/components/crm/ConfigurationNav';
import { defaultPreferences as defaults, persistedPreferences, pushJson, persistPushSubscription, deletePushSubscription } from '@/lib/push-settings';

const labels: Record<string, { title: string; desc: string; icon: string }> = {
  citas: {
    title: 'Recordatorio de citas de clientes',
    desc: 'Avisos con 24h y 1h de antelación para videollamadas y citas presenciales.',
    icon: 'calendar_month',
  },
  deudas: {
    title: 'Vencimientos de deudas y cuotas',
    desc: 'Alertas de cuotas próximas a vencer y plazos con Belastingdienst.',
    icon: 'payments',
  },
  pagos: {
    title: 'Confirmaciones de pagos recibidos',
    desc: 'Notificación cuando se registra un cobro de cliente o liquidación bancaria.',
    icon: 'check_circle',
  },
  documentos: {
    title: 'Nuevos documentos subidos por clientes',
    desc: 'Aviso inmediato cuando un cliente aporta DNI, contratos o nóminas.',
    icon: 'upload_file',
  },
  mensajes: {
    title: 'Mensajes del portal y chat del asesor',
    desc: 'Consultas directas planteadas por clientes desde su portal privado.',
    icon: 'chat_bubble',
  },
  facturas: {
    title: 'Presupuestos aprobados y facturas vencidas',
    desc: 'Seguimiento de facturas oficiales emitidas pendientes de cobro.',
    icon: 'receipt_long',
  },
  tareas: {
    title: 'Tareas urgentes y asignaciones del equipo',
    desc: 'Nuevas tareas asignadas en "Mi trabajo de hoy" con prioridad alta.',
    icon: 'checklist',
  },
};

type Preferences = typeof defaults;

export default function NotificationPreferencesPage() {
  const [preferences, setPreferences] = useState<Preferences>(defaults);
  const [subscribed, setSubscribed] = useState(false);
  const [notice, setNotice] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [provider, setProvider] = useState<'checking' | 'available' | 'unavailable' | 'error'>('checking');
  const mutationPending = useRef(false);
  const pushPending = useRef(false);

  useEffect(() => {
    let active = true;
    pushJson<{ preferences: Preferences }>(apiFetch, '/push/preferences', 'No se pudieron cargar las preferencias de avisos.')
      .then((data) => {
        const saved = persistedPreferences(data);
        if (active) { setPreferences(saved); setLoaded(true); }
      })
      .catch((error) => { if (active) setNotice(error instanceof Error ? error.message : 'No se pudieron cargar las preferencias. Recarga la página.'); });
    pushJson<{ publicKey?: string; enabled?: boolean }>(apiFetch, '/push/public-key', 'No se pudo comprobar el proveedor Push.')
      .then((data) => { if (active) setProvider(data.enabled === true && Boolean(data.publicKey) ? 'available' : 'unavailable'); })
      .catch((error) => { if (active) { setProvider('error'); setNotice(error instanceof Error ? error.message : 'No se pudo comprobar el proveedor Push.'); } });
    return () => { active = false; };
  }, []);

  const save = async (next: Preferences) => {
    if (!loaded || mutationPending.current) return;
    mutationPending.current = true;
    setSaving(true);
    const previous = preferences;
    setPreferences(next);
    setNotice('');
    try {
      const data = await pushJson<{ preferences: Preferences }>(apiFetch, '/push/preferences', 'No se pudieron guardar las preferencias.', {
        method: 'PUT', body: JSON.stringify(next),
      });
      setPreferences(persistedPreferences(data));
      setNotice('Preferencias de avisos guardadas correctamente.');
    } catch (error) {
      setPreferences(previous);
      setNotice(error instanceof Error ? error.message : 'No se pudieron guardar las preferencias.');
    } finally {
      mutationPending.current = false;
      setSaving(false);
    }
  };

  const subscribe = async () => {
    if (pushPending.current) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !window.isSecureContext) {
      setNotice('Las notificaciones push requieren un navegador compatible y HTTPS o localhost.');
      return;
    }
    pushPending.current = true;
    setPushBusy(true);
    try {
      const keyData = await pushJson<{ publicKey?: string; enabled?: boolean }>(apiFetch, '/push/public-key', 'No se pudo comprobar el proveedor Push.');
      if (keyData.enabled !== true || !keyData.publicKey) {
        setProvider('unavailable');
        throw new Error('Push no disponible: el proveedor no está configurado. Tus preferencias sí pueden guardarse.');
      }
      setProvider('available');
      // ready puede no resolverse nunca si no hay worker registrado/activo.
      const registration = await navigator.serviceWorker.getRegistration('/');
      if (!registration?.active) throw new Error('No hay un servicio de notificaciones activo. Recarga la página y vuelve a intentarlo.');
      const applicationServerKey = Uint8Array.from(
        atob(keyData.publicKey.replace(/-/g, '+').replace(/_/g, '/')),
        (char) => char.charCodeAt(0)
      );
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
      await persistPushSubscription(apiFetch, subscription, !existing);
      setSubscribed(true);
      setNotice('Suscripción push guardada para este navegador.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No se pudo completar la suscripción push en este navegador.');
    } finally {
      pushPending.current = false;
      setPushBusy(false);
    }
  };

  const unsubscribe = async () => {
    if (pushPending.current) return;
    pushPending.current = true;
    setPushBusy(true);
    try {
      if (!('serviceWorker' in navigator)) throw new Error('Este navegador no dispone de un servicio de notificaciones.');
      const registration = await navigator.serviceWorker.getRegistration('/');
      const subscription = await registration?.pushManager.getSubscription();
      // Nunca enviar un endpoint vacío: el backend borraría todos los dispositivos.
      if (subscription) await deletePushSubscription(apiFetch, subscription);
      setSubscribed(false);
      setNotice(subscription ? 'Notificaciones desactivadas para este navegador.' : 'No hay una suscripción push local en este navegador.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Error al cancelar la suscripción push.');
    } finally {
      pushPending.current = false;
      setPushBusy(false);
    }
  };

  return (
    <div className="w-full h-full min-h-0 overflow-hidden flex flex-col gap-2">
      {/* Header */}
      <header className="shrink-0 pb-1.5 border-b border-surface-container flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-on-surface">Configuración · Avisos</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary/10 text-secondary">
              Alertas Push & Sistema
            </span>
          </div>
          <p className="text-[11px] text-on-surface-variant">
            Controla qué alertas deseas recibir en tiempo real. Por privacidad, las previsualizaciones no muestran datos sensibles de clientes.
          </p>
        </div>
      </header>

      <ConfigurationNav />

      {notice && (
        <div role="status" className="rounded-lg border border-secondary/30 bg-secondary/10 px-3 py-2 text-xs font-semibold text-on-surface shrink-0">
          {notice}
        </div>
      )}

      {/* Contenido a Pantalla Completa Dividido en 2 Secciones */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-hidden">
        {/* Panel Izquierdo: Notificaciones Push del Navegador (4 cols) */}
        <section className="lg:col-span-4 bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 pb-2 border-b border-surface-container">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">notifications_active</span>
              </div>
              <div>
                <h2 className="text-sm font-bold text-on-surface">Notificaciones Push</h2>
                <p className="text-[11px] text-outline">En tu navegador y dispositivo móvil</p>
              </div>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed">
              Recibe avisos inmediatos incluso cuando tengas la pestaña de RP Gestoría en segundo plano. Al pulsar la notificación, accederás directamente al caso en cuestión.
            </p>

            <div className="p-3 bg-surface-container-low rounded-lg border border-surface-container space-y-2">
              <span className="text-[10.5px] uppercase font-bold text-outline tracking-wider block">Estado actual</span>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${subscribed && provider === 'available' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                <span className="text-xs font-semibold text-on-surface">
                  {provider === 'checking' ? 'Comprobando disponibilidad…' : provider === 'unavailable' ? 'Push no disponible: proveedor sin configurar' : provider === 'error' ? 'No se pudo comprobar el proveedor Push' : subscribed ? 'Suscripción guardada en este dispositivo' : 'Suscripción no confirmada en este navegador'}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-surface-container flex gap-2">
            <button
              type="button"
              onClick={subscribe}
              disabled={pushBusy || provider !== 'available'}
              className="flex-1 h-9 rounded-md bg-secondary text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[15px]">check</span>
              <span>Activar Push</span>
            </button>
            <button
              type="button"
              onClick={unsubscribe}
              disabled={pushBusy}
              className="h-9 rounded-md border border-outline-variant px-3 text-xs font-semibold text-on-surface-variant hover:bg-surface transition-colors"
            >
              Desactivar
            </button>
          </div>
        </section>

        {/* Panel Derecho: Categorías de Avisos Específicas (8 cols) */}
        <section className="lg:col-span-8 bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-xs flex flex-col min-h-0 overflow-hidden">
          <div className="pb-2 border-b border-surface-container shrink-0 flex items-center justify-between">
            <h2 className="text-sm font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[17px]">tune</span>
              <span>Categorías de Alertas Activas</span>
            </h2>
            <span className="text-[11px] text-outline font-medium">
              Los cambios se guardan de forma automática
            </span>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar divide-y divide-surface-container pr-1">
            {Object.entries(labels).map(([key, item]) => (
              <label
                key={key}
                className="flex items-center justify-between gap-3 py-3 hover:bg-surface-container-low/50 px-2 rounded-lg transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-secondary text-[18px] mt-0.5">
                    {item.icon}
                  </span>
                  <div>
                    <span className="block text-xs font-bold text-on-surface">
                      {item.title}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-on-surface-variant leading-relaxed">
                      {item.desc}
                    </span>
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={loaded && preferences[key as keyof Preferences]}
                  disabled={!loaded || saving}
                  onChange={(e) => save({ ...preferences, [key]: e.target.checked })}
                  className="h-5 w-5 accent-secondary rounded cursor-pointer shrink-0"
                />
              </label>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
