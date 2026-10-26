// Credentials exist only in the success UI, never in drafts or AI history.
const credentialFields = new Set(['portal_password', 'portal_username', 'portal_access', 'password', 'temporary_password', 'token', 'access_token', 'refresh_token']);
export function withoutPortalCredentials<T>(value: T): T {
  return JSON.parse(JSON.stringify(value, (key, item) => credentialFields.has(key) ? undefined : item)) as T;
}
