export const ACES_BASE_PATH = '/aces'
export const TENANT_BASE_PATH = '/tenant'

export interface Env {
  COOKIE_NAME: string;
  COOKIE_PASSWORD: string;
  CORS_ORIGIN: string;
  DB: D1Database;
  KV: KVNamespace;
  ACES_DURABLE: DurableObjectNamespace;
  TENANT_DURABLE: DurableObjectNamespace;
}

export const TABLES = [
  'accounts',
  'active_accounts',
  'clients',
  'members',
  'module_groups',
  'modules',
  'project_modules',
  'projects',
  'tenants',
  'used_modules',
  'users',
]