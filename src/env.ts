export const LOGIN_TYPE_ACES = 'aces'
export const LOGIN_TYPE_TENANT = 'tenant'

export interface Env {
  COOKIE_NAME: string;
  COOKIE_PASSWORD: string;
  CORS_ORIGIN: string;
  DB: D1Database;
  KV: KVNamespace;
  ACES_DO: DurableObjectNamespace;
}
