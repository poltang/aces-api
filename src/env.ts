export const ACES_DO_NAME = "aces-durables";
export const LOGIN_TYPE_ACES = 'aces'
export const LOGIN_TYPE_TENANT = 'tenant'
export const ADMIN_KV_PREFIX = "acesadmin:";
export const CRED_KV_PREFIX = "cred:";

export interface Env {
  COOKIE_NAME: string;
  COOKIE_PASSWORD: string;
  CORS_ORIGIN: string;
  DB: D1Database;
  KV: KVNamespace;
  ACES_DO: DurableObjectNamespace;
}
