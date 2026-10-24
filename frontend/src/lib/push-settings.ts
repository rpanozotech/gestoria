export type PushFetcher = (path: string, init?: RequestInit) => Promise<Response>;
export const defaultPreferences = { citas: true, deudas: true, pagos: true, documentos: true, mensajes: true, facturas: true, tareas: true };
export type PushPreferences = typeof defaultPreferences;

export async function pushJson<T>(fetcher: PushFetcher, path: string, fallback: string, init?: RequestInit): Promise<T> {
  const response = await fetcher(path, init);
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(typeof data?.error === 'string' ? data.error : fallback);
  if (!data || typeof data !== 'object') throw new Error(fallback);
  return data as T;
}

export function persistedPreferences(data: { preferences?: PushPreferences }): PushPreferences {
  if (!data.preferences || Object.keys(defaultPreferences).some((key) => typeof data.preferences[key as keyof PushPreferences] !== 'boolean')) {
    throw new Error('El servidor no devolvió preferencias válidas. Recarga la página.');
  }
  return data.preferences;
}

/** No conservar una nueva alta local si el servidor no pudo persistirla. */
export async function persistPushSubscription(fetcher: PushFetcher, subscription: PushSubscription, created: boolean): Promise<void> {
  try {
    const data = await pushJson<{ ok?: boolean }>(fetcher, '/push/subscription', 'No se pudo guardar la suscripción push.', {
      method: 'POST', body: JSON.stringify({ subscription }),
    });
    if (data.ok !== true) throw new Error('El servidor no confirmó la suscripción push.');
  } catch (error) {
    if (created) {
      try {
        if (!await subscription.unsubscribe()) throw new Error('rollback');
      } catch {
        throw new Error('No se guardó la suscripción y no se pudo retirar el permiso local. Revisa los permisos del navegador.');
      }
    }
    throw error;
  }
}

export async function deletePushSubscription(fetcher: PushFetcher, subscription: PushSubscription): Promise<void> {
  if (!subscription.endpoint) throw new Error('No se identificó la suscripción de este navegador. No se ha cancelado ningún dispositivo.');
  const data = await pushJson<{ ok?: boolean }>(fetcher, '/push/subscription', 'No se pudo cancelar la suscripción push.', {
    method: 'DELETE', body: JSON.stringify({ endpoint: subscription.endpoint }),
  });
  if (data.ok !== true) throw new Error('El servidor no confirmó la baja push.');
  if (!await subscription.unsubscribe()) throw new Error('La baja se guardó en el servidor, pero debes retirar el permiso local desde el navegador.');
}
