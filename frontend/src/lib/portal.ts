export interface PortalAccess {
  portal_username: string;
  portal_password: string;
}

const normalizeUsername = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.|\.$/g, '')
    .slice(0, 32);

/** Credenciales temporales que el gestor puede entregar al cliente por WhatsApp. */
export const createPortalAccess = (fullName: string, email?: string): PortalAccess => {
  const username = normalizeUsername(email?.split('@')[0] || fullName) || `cliente${Date.now()}`;
  const password = `RP-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  return { portal_username: username, portal_password: password };
};
