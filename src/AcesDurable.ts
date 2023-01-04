import { Hono } from "hono";
import { ACES_BASE_PATH, Env } from "./env";
import { D1Database } from './d1_beta'
import { decrypt, encrypt } from "./crypto";
import { sealData } from "iron-session/edge";
import { logPath } from "./utils";

const TABLES = [
  // 'active_accounts',
  // 'members',
  // 'project_modules',
  // 'users',
  'accounts',
  'clients',
  'module_groups',
  'modules',
  'projects',
  'tenants',
  'used_modules',
]

const BASE_PATH = ACES_BASE_PATH
const ADMIN_PREFIX = 'admin:'
const MODULE_PATHS = ['modules', 'module-groups']
const MODULE_GROUP_PREFIX = 'module-group:'
const MODULE_PREFIX = 'module:'

export class AcesDurable {
  app = new Hono({ strict: false })
  state: DurableObjectState
  storage: DurableObjectStorage

  async fetch(request: Request) {
    let ip = request.headers.get("CF-Connecting-IP");
    console.log(ip)
    return this.app.fetch(request)
  }

  constructor(state: DurableObjectState, env: Env) {
    this.state = state
    this.storage = state.storage

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

    this.state.blockConcurrencyWhile(async () => {
      console.log('blockConcurrencyWhile()')
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
      }

      // Seed module groups
      const groupsList = await this.storage.list({ prefix: MODULE_GROUP_PREFIX })
      if (groupsList.size == 0) {
        const rs = await env.DB.prepare('SELECT * FROM module_groups').all()
        rs.results.forEach(async (item: any) => {
          await this.storage.put(`${MODULE_GROUP_PREFIX}${item.id}`, item)
        })
      }

      // Seed modules
      const modulesList = await this.storage.list({ prefix: MODULE_PREFIX })
      if (modulesList.size == 0) {
        const rs = await env.DB.prepare('SELECT * FROM modules').all()
        rs.results.forEach(async (item: any) => {
          await this.storage.put(`${MODULE_PREFIX}${item.id}`, item)
        })
      }
    })

    // Admin signin handler
    this.app.post('/signin', async (c) => {
      const {username, password} = await c.req.json() as unknown as any

      // 1 Check db
      const sql = `SELECT * FROM admins WHERE status='active' AND (email=? OR username=?)`
      const found = await env.DB.prepare(sql).bind(username, username).first() as unknown as any
      if (!found) {
        return c.json({ message: 'Not Found'}, 404)
      }

      // 2. Check storage
      const data: any = await this.storage.get(`${ADMIN_PREFIX}${found.id}`)
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

    // Shared
    this.app.get('/modules', async (c) => {
      logPath(c, 'AcesDurable')
      const groups = await this.storage.list({ prefix: MODULE_GROUP_PREFIX })
      const modules = await this.storage.list({ prefix: MODULE_PREFIX })
      return c.json({
        groups: Array.from(groups).map(([, value]) => value),
        modules: Array.from(modules).map(([, value]) => value),
      })
    })

    //
    this.app.get(`${BASE_PATH}/admins`, async (c) => {
      const list = await this.storage.list({ prefix: ADMIN_PREFIX })
      const array = Array.from(list).map(([, value]) => value)
      return c.json(array)
    })

    this.app.get(`${BASE_PATH}/:what`, async (c) => {
      logPath(c, 'AcesDurable')
      const url = new URL(c.req.url)
      const group = url.searchParams.get('group')
      const method = url.searchParams.get('method')

      const what = c.req.param('what')
      if (!MODULE_PATHS.includes(what)) {
        return c.json({ message: 'Not Found' }, 404) // Always return json
      }

      const prefix = what == 'modules' ? MODULE_PREFIX : MODULE_GROUP_PREFIX
      const list = await this.storage.list({ prefix: prefix })
      const array = Array.from(list).map(([, value]) => value)

      if (group && what == 'modules') {
        return c.json(array.filter((m: any) => m.groupId.toLowerCase() == group.toLowerCase()))
      }
      if (method && what == 'modules') {
        return c.json(array.filter((m: any) => m.method.toLowerCase() == method.toLowerCase()))
      }
      return c.json(array)
    })

    this.app.get(`${BASE_PATH}/:what/:id`, async (c) => {
      logPath(c, 'AcesDurable')
      const id = c.req.param('id')
      const what = c.req.param('what')
      if (!MODULE_PATHS.includes(what)) {
        return c.json({ message: 'Not Found' }, 404)
      }

      const key = what == 'modules'
        ? `${MODULE_PREFIX}${id}`
        : `${MODULE_GROUP_PREFIX}${id}`

      const found = await this.storage.get(key)
      if (!found) {
        return c.json({ message: 'Not Found' }, 404)
      }
      return c.json(found)
    })
  }
}