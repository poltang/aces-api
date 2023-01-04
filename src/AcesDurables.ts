import { Hono } from "hono"
import { decrypt } from "./crypto";
import { sealData } from "iron-session/edge";
import { Env, LOGIN_TYPE_ACES, LOGIN_TYPE_TENANT } from "./env";
import { D1Database } from './d1_beta'
import { getSessionUser } from "./session";
import { logPath, objectify } from "./utils";

const KEYS = `KEYS`
const ADMIN_PREFIX        = 'admin:'
const ACCOUNT_PREFIX      = 'account:'
const PROJECT_PREFIX      = 'project:'
const CLIENT_PREFIX       = 'client:'
const MEMBER_PREFIX       = 'member:'
const TENANT_PREFIX       = 'tenant:'
const USER_PREFIX         = 'user:'
const MODULE_PREFIX       = 'module:'
const MODULE_GROUP_PREFIX = 'module-group:'

const prefixes = {
  accounts:           ACCOUNT_PREFIX,
  admins:             ADMIN_PREFIX,
  projects:           PROJECT_PREFIX,
  clients:            CLIENT_PREFIX,
  members:            MEMBER_PREFIX,
  tenants:            TENANT_PREFIX,
  users:              USER_PREFIX,
  modules:            MODULE_PREFIX,
  module_groups:      MODULE_GROUP_PREFIX
}
const ACES_PATHS = [
  'accounts',
  'projects',
  'clients',
  'members',
  'tenants',
  'users',
]
const TENANT_PATHS = [
  'clients',
  'projects',
  'accounts',
  'members',
]

// https://stackoverflow.com/questions/9229645/remove-duplicate-values-from-js-array
function remove_duplicates_es6(arr: string[]) {
  let s = new Set(arr);
  let it = s.values();
  return Array.from(it);
}

export class AcesDurables {
  app = new Hono({strict:false})
  state: DurableObjectState
  storage: DurableObjectStorage
  keys: string[] = []

  /*
  // put(entries, options):
  Takes an Object and stores each of its keys and values to storage.
  */

  loadFromDB = async (env: Env, tableSrc: string, force = false) => {
    if (!Object.keys(prefixes).includes(tableSrc)) return

    const list = await this.storage.list({ prefix: prefixes[tableSrc] })
    if (list.size == 0 || force) {
      console.log(`Load ${tableSrc} from D1...`);
      const entries = {}
      const keys = []
      const rs = await env.DB.prepare(`SELECT * FROM ${tableSrc}`).all()
      rs.results.forEach(async (row: any) => {
        const tenantId = row.tenantId || false
        // If table has column `tenantId`,
        // use `tenantId` as additional prefix
        let key = tenantId
          ? prefixes[tableSrc] + `${tenantId}:${row.id}`
          : prefixes[tableSrc] + `${row.id}`
        entries[key] = objectify(row)
        keys.push(key)
      })

      await this.storage.put(entries)
      const _keys:string[] = await this.storage.get(KEYS)
      const newKeys = keys.concat(_keys)
      const uniques = remove_duplicates_es6(newKeys)
      await this.storage.put(KEYS, uniques)
    }
  }

  async fetch(request: Request) {
    // let ip = request.headers.get("CF-Connecting-IP");
    console.log('DurableObject: fetch()')
    return this.app.fetch(request)
  }

  constructor(state: DurableObjectState, env: Env) {
    console.log('AcesDurables()')
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
      if (!await this.storage.get(KEYS)) {
        await this.storage.put(KEYS, [KEYS])
      }

      // Seed admin
      const list = await this.storage.list({ prefix: ADMIN_PREFIX })
      if (list.size == 0) {
        const id = '6397c47ba009344a26c0db97'
        const secret = 'y2o2X8B4ChDQiH5PB0Wxpmd8SsTaeqg='
        const key = ADMIN_PREFIX + id
        await this.storage.put(key, {
          id,
          fullname: 'Gaia Poltangan',
          username: 'poltang',
          email: 'adminits@gaiasol.com',
          role: 'super-admin',
          status: 'active',
          secret: secret,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
        })

        const keys: string[] = await this.storage.get(KEYS)
        const newKeys = keys.concat(key)
        const uniques = remove_duplicates_es6(newKeys)
        await this.storage.put(KEYS, uniques)
      }

      // this.loadFromDB(env, 'admins')
      await this.loadFromDB(env, 'modules')
      await this.loadFromDB(env, 'module_groups')
      await this.loadFromDB(env, 'tenants')
      await this.loadFromDB(env, 'accounts')
      await this.loadFromDB(env, 'projects')
      await this.loadFromDB(env, 'clients')
      await this.loadFromDB(env, 'members')
      await this.loadFromDB(env, 'users')
    })

    this.app.use('*', async (c, next) => {
      logPath(c, 'AcesDurables')
      await next()
    })

    // Admin signin handler
    this.app.post('/signin', async (c) => {
      const {username, password} = await c.req.json() as unknown as any

      // 1 Check db
      const sql = `SELECT * FROM admins WHERE status='active' AND (email=? OR username=?)`
      const found = await env.DB.prepare(sql).bind(username, username).first() as unknown as any
      if (!found) {
        console.log('NOT FOUND IN DB')
        return c.json({ message: 'Not Found'}, 404)
      }
      console.log('found', found)

      // 2. Check storage
      const data: any = await this.storage.get(`${ADMIN_PREFIX}${found.id}`)
      console.log('data', data)
      const secret = data.secret
      if (password != await decrypt(secret)) {
        return c.json({ message: 'Error username or password'}, 401)
      }

      const user = {
        id: data.id,
        loginType: 'aces',
        fullname: data.fullname,
        username: data.username,
        email: data.email,
        role: data.role,
        status: data.status,
        ts: new Date().getTime()
      }
      console.log("user:", user);

      const sealedData = await sealData(user, {password: env.COOKIE_PASSWORD})
      console.log("sealedData:", sealedData);

      /* Create headers and set cookie for direct client
      ================================================== */
      c.header('X-Message', 'Hello!')
      c.header('Content-Type', 'application/json')
      c.cookie(env.COOKIE_NAME, sealedData)
      c.status(200)

      /* Return user and cookie data that can be reused by client
      =========================================================== */
      return c.json({ user, cookie: sealedData })
    })

    /*
    Shared GET handlers
    ===================
    /api/modules?group=somegroup
    /api/modules?method=somemethod
    */

    this.app.get('/api/modules', async (c) => {
      // console.log(this.keys, this.keys.length);

      const url = new URL(c.req.url)
      const group = url.searchParams.get('group')
      const method = url.searchParams.get('method')

      const list = await this.storage.list({ prefix: MODULE_PREFIX })
      const array = Array.from(list).map(([, value]) => value)
      const groupList = await this.storage.list({ prefix: MODULE_GROUP_PREFIX })
      const groupArray = Array.from(groupList).map(([, value]) => value)

      if (group) {
        const modules = array.filter((m:any) => m.groupId.toLowerCase() == group.toLowerCase())
        const ids = modules.map((m: any) => m.groupId)
        const groups = groupArray.filter((g: any) => ids.includes(g.id))
        return c.json({ modules, groups })
      }
      if (method) {
        const modules = array.filter((m:any) => m.method.toLowerCase() == method.toLowerCase())
        const ids = modules.map((m: any) => m.groupId)
        const groups = groupArray.filter((g: any) => ids.includes(g.id))
        return c.json({ modules, groups })
      }
      return c.json({ modules: array, groups: groupArray })
    })

    /*
    Tenant GET handlers
    ===================
    /api/tenant/info
    /api/tenant/clients
    /api/tenant/projects
    /api/tenant/accounts
    /api/tenant/members
    */

    this.app.get('/api/tenant/:what', async (c) => {
      const paths = [...TENANT_PATHS, 'info']
      const what = c.req.param('what')
      console.log('what', what)
      if (!paths.includes(what)) {
        return c.text('404 Not Found', 404)
      }

      const user: any  = await getSessionUser(c.req, env)
      if (user.loginType != LOGIN_TYPE_TENANT) {
        return c.text('Unauthorized', 401)
      }

      const tenantId = user.tenantId
      console.log('tenantId', tenantId)
      if (what == 'info') {
        const tenant = await this.storage.get(`${TENANT_PREFIX}${tenantId}`)
        return tenant
          ? c.json(tenant)
          : c.json({ message: 'Not Found' }, 404)
      }

      const prefix = `${prefixes[what]}${tenantId}`
      const list = await this.storage.list({ prefix: prefix })
      const array = Array.from(list).map(([, value]) => value)
      return c.json(array)
    })

    this.app.get('/api/tenant/:what/:id', async (c) => {
      const what = c.req.param('what')
      console.log('what', what)
      if (!TENANT_PATHS.includes(what)) {
        return c.text('404 Not Found', 404)
      }

      const user: any  = await getSessionUser(c.req, env)
      if (user.loginType != LOGIN_TYPE_TENANT) {
        return c.text('Unauthorized', 401)
      }

      const id = c.req.param('id')
      const tenantId = user.tenantId
      const key = `${prefixes[what]}${tenantId}:${id}`
      console.log(key);
      const item = await this.storage.get(key)
      if (!item) {
        return c.json({ message: 'Not Found' }, 404)
      }
      return c.json(item)
    })

    /*
    Aces GET handlers
    ===================
    /api/accounts?tid=xxx
    /api/projects?tid=xxx
    /api/clients?tid=xxx
    /api/members?tid=xxx
    /api/tenants?tid=xxx
    /api/users?tid=xxx
    */

    this.app.get('/api/:subject', async (c) => {
      const subject = c.req.param('subject')

      if (!ACES_PATHS.includes(subject)) {
        return c.text('404 Not Found', 404)
      }

      const user: any  = await getSessionUser(c.req, env)
      if (user.loginType != LOGIN_TYPE_ACES) {
        return c.text('Unauthorized', 401)
      }

      const url = new URL(c.req.url)
      const tid = url.searchParams.get('tid')
      console.log('tid:', tid)

      let prefix = prefixes[subject]
      if (tid !== null) {
        prefix = `${prefix}${tid}`
        console.log('prefix:', prefix)
        if (subject == 'tenants') {
          const tenant = await this.storage.get(prefix)
          return tenant
            ? c.json(tenant)
            : c.json({ message: 'Not Found' }, 404)
        } else {
          prefix = subject == 'users' ? prefixes[subject] : prefix
          const list = await this.storage.list({ prefix: prefix })
          const array = Array.from(list).map(([, value]) => value)
          return c.json(array)
        }
      }

      console.log('prefix:', prefix)
      const list = await this.storage.list({ prefix: prefix })
      const array = Array.from(list).map(([, value]) => value)
      return c.json(array)
    })

    this.app.get('/api/:subject/:id', async (c) => {
      const { subject, id } = c.req.param()
      if (!ACES_PATHS.includes(subject)) {
        return c.text('404 Not Found', 404)
      }

      if (subject == 'tenants' || subject == 'users') {
        const key = prefixes[subject] + id
        console.log('key:', key)
        const item = await this.storage.get(key)
        console.log('item:', item)
        if (item == undefined) return c.json({ message: 'Not Found' }, 404)
        return c.json(item)
      }

      /*
      const list = await this.storage.list({ prefix: prefixes[subject] })
      let found
      list.forEach((item: any) => {
        if (found == undefined) {
          console.log('FOREACH')
          if (item.id == id) {
            found = item
          }
        }
      })

      if (found == undefined) {
        return c.json({ message: 'Not Found' }, 404)
      }
      return c.json(found)
      //*/

      const prefix = prefixes[subject]
      console.log(prefix+id);
      const storedKeys: string[] = await this.storage.get(KEYS)
      const filter =  storedKeys.filter(t => t.startsWith(prefix) && t.endsWith(id))
      console.log(filter);

      if (filter.length) {
        const found = await this.storage.get(filter[0])
        if (found) {
          return c.json(found)
        }
      }
      return c.json({ message: 'Not Found' }, 404)
    })

    /*
    this.app.get(`${BASE_PATH}`, async (c) => {
      console.log('TenantDurable()')
      return c.json({message: 'TENANT_DURABLE'})
    })
    */
  }
}