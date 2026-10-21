'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

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

const defaults = {
  citas: true,
  deudas: true,
  pagos: true,
  documentos: true,
  mensajes: true,
  facturas: true,
  tareas: true,
};

type Preferences = typeof defaults;

export default function NotificationPreferencesPage() {
  const [preferences, setPreferences] = useState<Preferences>(defaults);
  const [subscribed, setSubscribed] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    apiFetch('/push/preferences')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.preferences) setPreferences({ ...defaults, ...data.preferences });
      })
      .catch(() => undefined);
  }, []);

  const save = async (next: Preferences) => {
    setPreferences(next);
    await apiFetch('/push/preferences', {
      method: 'PUT',
      body: JSON.stringify(next),
    });
    setNotice('Preferencias de avisos guardadas correctamente.');
    window.setTimeout(() => setNotice(''), 3000);
  };

  const subscribe = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !window.isSecureContext) {
      setNotice('Las notificaciones push requieren un entorno seguro (HTTPS o localhost).');
      return;
    }
    try {
      const registration = await navigator.serviceWorker.ready;
      const keyResponse = await apiFetch('/push/public-key');
      const keyData = await keyResponse.json();
      if (!keyData.publicKey) {
        setNotice('El servidor Push está configurándose en este entorno.');
        return;
      }
      const applicationServerKey = Uint8Array.from(
        atob(keyData.publicKey.replace(/-/g, '+').replace(/_/g, '/')),
        (char) => char.charCodeAt(0)
      );
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
      await apiFetch('/push/subscription', {
        method: 'POST',
        body: JSON.stringify({ subscription }),
      });
      setSubscribed(true);
      setNotice('Notificaciones web push activadas en este navegador.');
    } catch {
      setNotice('No se pudo completar la suscripción push en este navegador.');
    }
  };

  const unsubscribe = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      await apiFetch('/push/subscription', {
        method: 'DELETE',
        body: JSON.stringify({ endpoint: subscription?.endpoint }),
      });
      await subscription?.unsubscribe();
      setSubscribed(false);
      setNotice('Notificaciones desactivadas para este navegador.');
    } catch {
      setNotice('Error al cancelar la suscripción push.');
    }
  };

  return (
    <div className="w-full h-full max-h-[calc(100vh-4.6rem)] overflow-hidden flex flex-col gap-2.5">
      {/* Header */}
      <header className="shrink-0 pb-1.5 border-b border-surface-container flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-on-surface">Preferencias de Avisos & Notificaciones</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary/10 text-secondary">
              Alertas Push & Sistema
            </span>
          </div>
          <p className="text-[11px] text-on-surface-variant">
            Controla qué alertas deseas recibir en tiempo real. Por privacidad, las previsualizaciones no muestran datos sensibles de clientes.
          </p>
        </div>
      </header>

      {/* Sub-Tabs de Navegación */}
      <div className="flex border-b border-surface-container gap-3 shrink-0 text-xs font-semibold">
        <Link
          href="/crm/ajustes-datos-empresa"
          className="pb-1.5 border-b-2 border-transparent text-outline hover:text-on-surface flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[15px]">business</span>
          <span>Datos de Empresa</span>
        </Link>
        <Link
          href="/crm/integraciones"
          className="pb-1.5 border-b-2 border-transparent text-outline hover:text-on-surface flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[15px]">hub</span>
          <span>Integraciones (Email & WhatsApp)</span>
        </Link>
        <Link
          href="/crm/preferencias-avisos"
          className="pb-1.5 border-b-2 border-secondary text-secondary flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[15px]">notifications</span>
          <span>Preferencias de Avisos</span>
        </Link>
      </div>

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
                <span className={`w-2.5 h-2.5 rounded-full ${subscribed ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                <span className="text-xs font-semibold text-on-surface">
                  {subscribed ? 'Activo en este dispositivo' : 'No confirmado en este navegador'}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-surface-container flex gap-2">
            <button
              type="button"
              onClick={subscribe}
              className="flex-1 h-9 rounded-md bg-secondary text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[15px]">check</span>
              <span>Activar Push</span>
            </button>
            <button
              type="button"
              onClick={unsubscribe}
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
                  checked={preferences[key as keyof Preferences]}
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
