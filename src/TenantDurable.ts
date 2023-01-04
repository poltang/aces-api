import { Hono } from "hono"
import { Env, TENANT_BASE_PATH } from "./env";
import { D1Database } from './d1_beta'
import { getSessionUser } from "./session";
import { logPath, objectify } from "./utils";

const BASE_PATH = TENANT_BASE_PATH
const ACCOUNT_PREFIX = 'account:'
const PROJECT_PREFIX = 'project:'
const CLIENT_PREFIX  = 'client:'
const TENANT_PREFIX  = 'tenant:'

const prefixes = {
  accounts: ACCOUNT_PREFIX,
  projects: PROJECT_PREFIX,
  clients:  CLIENT_PREFIX,
}

export class TenantDurable {
  app = new Hono({strict:false})
  state: DurableObjectState
  storage: DurableObjectStorage

  init = async (env, user) => {
    const tenantId = user.tenantId
    const key = TENANT_PREFIX + tenantId
    const stored = await this.storage.get(key)
    if (stored === undefined) {
      console.log('Load tenant from db');
      const rs = await env.DB.prepare('SELECT * FROM tenants WHERE id=?')
        .bind(tenantId).first()
      const tenant = objectify(rs)
      await this.storage.put(key, tenant)
    }
  }
  initData = async (env: Env, tenantId: string, tableSrc: string) => {
    if (!Object.keys(prefixes).includes(tableSrc)) return

    const list = await this.storage.list({ prefix: prefixes[tableSrc] })
    if (list.size > 0) return // Storage has been initiated

    const rs = await env.DB.prepare(
      `SELECT * FROM ${tableSrc} WHERE tenantId=?`
    ).bind(tenantId).all()

    if (rs.results.length == 0) return

    const rows: any[] = objectify(rs.results)
    console.log(`Restoring from table [${tableSrc}]...`);
    rows.forEach(async (row) => {
      const prefix = prefixes[tableSrc]
      const key = prefix + row.id
      await this.storage.put(key, row)
    })
  }

  async fetch(request: Request) {
    // let ip = request.headers.get("CF-Connecting-IP");
    console.log('DurableObject: fetch()')
    return this.app.fetch(request)
  }

  constructor(state: DurableObjectState, env: Env) {
    console.log('TenantDurable()')
    this.state = state
    this.storage = state.storage

    // DO Beta shim
    if (!env.DB) {
      const e = (env as any).__D1_BETA__DB;
      if (e) {
        if (e.prepare) {
          env.DB = e;
        } else {
          // @ts-ignore
          env.DB = new D1Database(e);
        }
      }
    }

    // Init
    this.state.blockConcurrencyWhile(async () => {
      console.log('blockConcurrencyWhile()')
    })

    this.app.use('*', async (c, next) => {
      logPath(c, 'TenantDurable')
      await next()
    })

    /* GET handlers */

    this.app.get(`${BASE_PATH}`, async (c) => {
      const user: any  = await getSessionUser(c.req, env)
      const tenantId = user.tenantId

      /* CHECK */ await this.init(env, user)

      const key = TENANT_PREFIX + tenantId
      return c.json(await this.storage.get(key))
    })

    this.app.get(`${BASE_PATH}/:kind`, async (c) => {
      const kind = c.req.param('kind')
      if (!Object.keys(prefixes).includes(kind)) {
        return c.text('404 Page Not Found', 404)
      }
      const user: any  = await getSessionUser(c.req, env)
      const tenantId = user.tenantId

      /* CHECK */ await this.initData(env, tenantId, kind)

      const list = await this.storage.list({ prefix: prefixes[kind] })
      console.log('Storage size:', list.size)
      const array = Array.from(list).map(([, value]) => value)
      return c.json(array)
    })

    this.app.get(`${BASE_PATH}/:kind/:id`, async (c) => {
      const id = c.req.param('id')
      const kind = c.req.param('kind')
      if (!Object.keys(prefixes).includes(kind)) {
        return c.text('404 Page Not Found', 404)
      }

      // const { tenantId }  = await getSessionUser(c.req, env) as unknown as any
      const user: any  = await getSessionUser(c.req, env)
      const tenantId = user.tenantId

      /* CHECK */ await this.initData(env, tenantId, kind)

      const key = prefixes[kind] + id
      const item = await this.storage.get(key)
      if (!item) {
        return c.json({message: 'Not Found'}, 404)
      }

      return c.json(item)
    })

    /*
    this.app.get(`${BASE_PATH}`, async (c) => {
      console.log('TenantDurable()')
      return c.json({message: 'TENANT_DURABLE'})
    })
    */
  }
}