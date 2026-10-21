'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

type Integration = {
  channel: 'email' | 'whatsapp';
  provider: string;
  enabled: boolean;
  config: Record<string, string>;
  configured: boolean;
};

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
    apiFetch('/integrations')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const next: Record<string, Integration> = {};
        for (const item of data?.integrations || []) next[item.channel] = item;
        setItems(next);
      })
      .catch(() => setStatus('No se pudo cargar la configuración.'));
  }, []);

  const value = (channel: 'email' | 'whatsapp') =>
    items[channel] || ({ channel, ...defaults[channel], enabled: false, configured: false } as Integration);

  const update = (channel: 'email' | 'whatsapp', patch: Partial<Integration>) =>
    setItems((prev) => ({ ...prev, [channel]: { ...value(channel), ...patch } }));

  const save = async (channel: 'email' | 'whatsapp') => {
    const item = value(channel);
    setSaving(channel);
    setStatus('');
    const res = await apiFetch(`/integrations/${channel}`, {
      method: 'PUT',
      body: JSON.stringify({ ...item, secret: secrets[channel] || undefined }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(null);
    if (!res.ok) return setStatus(data.error || 'No se pudo guardar.');
    setSecrets((prev) => ({ ...prev, [channel]: '' }));
    update(channel, data.integration);
    setStatus(`${channel === 'email' ? 'Email' : 'WhatsApp'} guardado. La clave se ha cifrado.`);
  };

  return (
    <div className="w-full h-full max-h-[calc(100vh-4.6rem)] overflow-hidden flex flex-col gap-2.5">
      {/* Header */}
      <header className="shrink-0 pb-1.5 border-b border-surface-container flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-on-surface">Integraciones & Canales de Envío</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary/10 text-secondary">
              Email & WhatsApp
            </span>
          </div>
          <p className="text-[11px] text-on-surface-variant">
            Configura el proveedor de correo y mensajería oficial. Las claves se guardan cifradas en el servidor.
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
          className="pb-1.5 border-b-2 border-secondary text-secondary flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[15px]">hub</span>
          <span>Integraciones (Email & WhatsApp)</span>
        </Link>
        <Link
          href="/crm/preferencias-avisos"
          className="pb-1.5 border-b-2 border-transparent text-outline hover:text-on-surface flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[15px]">notifications</span>
          <span>Preferencias de Avisos</span>
        </Link>
      </div>

      {status && (
        <div role="status" className="rounded-lg border border-secondary/30 bg-secondary/10 p-2.5 text-xs text-on-surface shrink-0">
          {status}
        </div>
      )}

      {/* Grid de 2 Columnas para Email y WhatsApp a Pantalla Completa */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto no-scrollbar pr-1">
        {(['email', 'whatsapp'] as const).map((channel) => {
          const item = value(channel);
          const isEmail = channel === 'email';

          return (
            <section
              key={channel}
              className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col justify-between shadow-xs space-y-3.5"
            >
              <div className="space-y-3">
                {/* Header de canal */}
                <div className="flex items-center justify-between gap-3 pb-2 border-b border-surface-container">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isEmail ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
                      <span className="material-symbols-outlined text-[18px]">
                        {isEmail ? 'mail' : 'chat'}
                      </span>
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-on-surface">
                        {isEmail ? 'Email Transaccional' : 'WhatsApp Business'}
                      </h2>
                      <p className="text-[11px] text-outline">
                        {isEmail ? 'Brevo o Resend para confirmaciones y facturas' : 'Meta Cloud API o Twilio para alertas'}
                      </p>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.enabled}
                      onChange={(e) => update(channel, { enabled: e.target.checked })}
                      className="h-4 w-4 accent-secondary rounded"
                    />
                    <span>Activado</span>
                  </label>
                </div>

                {/* Proveedor */}
                <label className="block text-xs font-semibold text-on-surface">
                  <span className="block text-[11px] font-semibold text-outline uppercase tracking-wider mb-1">
                    Proveedor
                  </span>
                  <select
                    className="h-8 w-full rounded-md border border-outline-variant bg-surface px-2.5 text-xs text-on-surface focus:border-secondary focus:outline-none"
                    value={item.provider}
                    onChange={(e) => update(channel, { provider: e.target.value })}
                  >
                    {(isEmail
                      ? [
                          ['brevo', 'Brevo (Recomendado)'],
                          ['resend', 'Resend'],
                        ]
                      : [
                          ['meta_whatsapp', 'Meta WhatsApp Cloud API (Oficial)'],
                          ['twilio_whatsapp', 'Twilio WhatsApp'],
                          ['360dialog_whatsapp', '360dialog'],
                        ]
                    ).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </label>

                {/* Campos de configuración */}
                <div className="grid sm:grid-cols-2 gap-2.5">
                  {Object.entries(item.config || {}).map(([key, current]) => (
                    <label key={key} className="text-xs font-semibold text-on-surface">
                      <span className="block text-[10.5px] font-semibold text-outline uppercase tracking-wider mb-1">
                        {key.replaceAll('_', ' ')}
                      </span>
                      <input
                        className="h-8 w-full rounded-md border border-outline-variant bg-surface px-2.5 text-xs text-on-surface focus:border-secondary focus:outline-none"
                        value={current}
                        onChange={(e) =>
                          update(channel, { config: { ...item.config, [key]: e.target.value } })
                        }
                      />
                    </label>
                  ))}
                </div>

                {/* Secreto API Key / Token */}
                <label className="block text-xs font-semibold text-on-surface">
                  <span className="block text-[11px] font-semibold text-outline uppercase tracking-wider mb-1">
                    {isEmail ? 'API Key del proveedor' : 'Token permanente de acceso Meta / Twilio'}
                  </span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    className="h-8 w-full rounded-md border border-outline-variant bg-surface px-2.5 text-xs text-on-surface font-mono-data focus:border-secondary focus:outline-none"
                    value={secrets[channel]}
                    onChange={(e) => setSecrets((prev) => ({ ...prev, [channel]: e.target.value }))}
                    placeholder={
                      item.configured
                        ? '•••••••••••••••• (Clave guardada; dejar vacío para mantenerla)'
                        : 'Introduce tu clave secreta de API'
                    }
                  />
                </label>
              </div>

              {/* Botón de Guardado */}
              <div className="pt-2 border-t border-surface-container flex items-center justify-between">
                <span className="text-[11px] text-outline">
                  {item.configured ? '● Configuración activa' : '○ Sin configurar'}
                </span>
                <button
                  type="button"
                  disabled={saving === channel}
                  onClick={() => save(channel)}
                  className="rounded-lg bg-secondary px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {saving === channel ? 'Guardando…' : 'Guardar ' + (isEmail ? 'Email' : 'WhatsApp')}
                </button>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
