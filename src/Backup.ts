import { Hono } from "hono";
import { Env, LOGIN_TYPE_ACES, LOGIN_TYPE_TENANT } from "./env";
import { D1Database } from "./d1_beta";
import { getSessionUser } from "./session";
import {
  buildUpdater,
  getLoginType,
  logPath,
  objectify,
  prepareDBUpdate,
  remove_duplicates_es6,
  unauthorized,
} from "./utils";
import { UpdateBody } from "./types";
import { FormContent, FormUpdate, formScript } from "./form-update";
import ObjectID from "bson-objectid";
import { ClientOrProjectOrTenant, prepareNewItem } from "./store";
import {
  Client,
  Prefixes,
  Project,
  TableName,
  TableNames,
  TablePaths,
  Tenant,
} from "./store.types";
import { pageNotFound, objectNotFound } from "./utils";

const KEYS = `KEYS`;

const ACCOUNT_PREFIX = Prefixes[0];
const ADMIN_PREFIX = Prefixes[1];
const CLIENT_PREFIX = Prefixes[2];
const MEMBER_PREFIX = Prefixes[3];
const MODULEGROUP_PREFIX = Prefixes[4];
const MODULEUSAGE_PREFIX = Prefixes[5];
const MODULE_PREFIX = Prefixes[6];
const PROJECTMODULE_PREFIX = Prefixes[7];
const PROJECT_PREFIX = Prefixes[8];
const TENANT_PREFIX = Prefixes[9];
const USER_PREFIX = Prefixes[10];

type DurableType =
  | "account"
  | "admin"
  | "client"
  | "member"
  | "modulegroup"
  | "moduleusage"
  | "module"
  | "projectmodule"
  | "project"
  | "tenant"
  | "user";

type PrefixType = {
  [K in DurableType]: string;
};

const PREFIX: PrefixType = {
  // Key is singular mode of table name sans underscore
  account: ACCOUNT_PREFIX,
  admin: ADMIN_PREFIX,
  client: CLIENT_PREFIX,
  member: MEMBER_PREFIX,
  modulegroup: MODULEGROUP_PREFIX,
  moduleusage: MODULEUSAGE_PREFIX,
  module: MODULE_PREFIX,
  projectmodule: PROJECTMODULE_PREFIX,
  project: PROJECT_PREFIX,
  tenant: TENANT_PREFIX,
  user: USER_PREFIX,
};

const ShortPrefixKeys: DurableType[] = [
  "admin",
  "module",
  "modulegroup",
  "moduleusage",
  "tenant",
  "user",
];

const ACES_PATHS = [
  "accounts",
  "projects",
  "clients",
  "members",
  "tenants",
  "users",
];
const TENANT_PATHS = [
  // ["clients", "projects", "accounts", "members"];
  "accounts",
  // "admins",
  "clients",
  "members",
  // "module_groups",
  // "module_usages",
  // "modules", // <- modules can be accessed via /api/modules
  "project-modules", // "project_modules",
  "projects",
  // "tenants",
  "users",
];

function singular(tableName: TableName) {
  return tableName.substring(0, tableName.length - 1).replace("_", "");
}

function getDurableKey(type: DurableType, id: string, tenantId: string | null) {
  if (!Object.keys(PREFIX).includes(type)) return null;
  const prefix = PREFIX[type];
  const shortKeys: DurableType[] = [
    "admin",
    "module",
    "modulegroup",
    "moduleusage",
    "tenant",
    "user",
  ];
  if (shortKeys.includes(type) || !tenantId) return `${prefix}${id}`;
  return `${prefix}${tenantId}:${id}`;
}

export class AcesDurablesBackup {
  app = new Hono({ strict: false });
  env: Env;
  state: DurableObjectState;
  storage: DurableObjectStorage;
  keys: string[] = [];

  loadFromDB = async (env: Env, tableName: string, force = false) => {
    // if (!Object.keys(prefixes).includes(tableName)) return;
    if (!TableNames.includes(tableName as TableName)) return;

    const list = await this.storage.list({
      prefix: PREFIX[singular(tableName)],
    });
    if (list.size == 0 || force) {
      console.log(`Load ${tableName} from D1...`);
      const entries = {};
      const keys = [];
      const rs = await env.DB.prepare(`SELECT * FROM ${tableName}`).all();
      rs.results.forEach(async (row: any) => {
        const tenantId = row.tenantId || false;
        // If table has column `tenantId`,
        // use `tenantId` as additional prefix
        let key = tenantId
          ? PREFIX[singular(tableName)] + `${tenantId}:${row.id}`
          : PREFIX[singular(tableName)] + `${row.id}`;
        entries[key] = objectify(row);
        keys.push(key);
      });

      await this.storage.put(entries);
      const _keys: string[] = await this.storage.get(KEYS);
      const newKeys = keys.concat(_keys);
      const uniques = remove_duplicates_es6(newKeys);
      await this.storage.put(KEYS, uniques);
    }
  };

  updateItem = (
    env: Env,
    table: string,
    id: string,
    key: string,
    item: any,
    data: any
  ) => {
    const { dbUpdater, updatedObject } = buildUpdater(item, data);
    const { stmt, bind } = prepareDBUpdate(table, id, dbUpdater);
    // No await to update DO and D1
    this.storage.put(key, updatedObject, { noCache: true });
    env.DB.prepare(stmt)
      .bind(...bind)
      .run();
    return updatedObject;
  };

  saveNewItemAndUpdateKeys = async (
    env: Env,
    item: Client | Project | Tenant,
    key: string,
    stmt: string,
    bind: any[]
  ) => {
    const keys: string[] = await this.storage.get(KEYS);
    this.storage.put(key, item);
    this.storage.put(KEYS, [...keys, key]);
    env.DB.prepare(stmt)
      .bind(...bind)
      .run();
  };

  async fetch(request: Request) {
    // let ip = request.headers.get("CF-Connecting-IP");
    console.log("DurableObject: fetch()");
    return this.app.fetch(request);
  }

  constructor(state: DurableObjectState, env: Env) {
    console.log("AcesDurables()");
    this.env = env;
    this.state = state;
    this.storage = state.storage;

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
      console.log("blockConcurrencyWhile()");
      if (!(await this.storage.get(KEYS))) {
        await this.storage.put(KEYS, [KEYS]);
      }

      // Seed admin
      const list = await this.storage.list({ prefix: ADMIN_PREFIX });
      if (list.size == 0) {
        const id = "6397c47ba009344a26c0db97";
        const secret = "y2o2X8B4ChDQiH5PB0Wxpmd8SsTaeqg=";
        const key = ADMIN_PREFIX + id;
        await this.storage.put(key, {
          id,
          fullname: "Gaia Poltangan",
          username: "poltang",
          email: "adminits@gaiasol.com",
          role: "super-admin",
          status: "active",
          secret: secret,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
        });

        const keys: string[] = await this.storage.get(KEYS);
        const newKeys = keys.concat(key);
        const uniques = remove_duplicates_es6(newKeys);
        await this.storage.put(KEYS, uniques);
      }

      // this.loadFromDB(env, 'admins')
      await this.loadFromDB(env, "modules");
      await this.loadFromDB(env, "module_groups");
      await this.loadFromDB(env, "tenants");
      await this.loadFromDB(env, "accounts");
      await this.loadFromDB(env, "projects");
      await this.loadFromDB(env, "clients");
      await this.loadFromDB(env, "members");
      await this.loadFromDB(env, "users");
    });

    this.app.use("*", async (c, next) => {
      logPath(c, "AcesDurables");
      await next();
    });

    /* Default pattern  */
    this.app.use("/api/:path/:subPath?", async (c, next) => {
      const path = c.req.param("path");
      const isTenant = (await getLoginType(c, this.env)) == "tenant";
      // Tenant can only access modules
      if (path != "modules" && isTenant) {
        return unauthorized(c);
      }
      await next();
    });

    /* Tenant-only routes */
    this.app.use("/api/tenant/*", async (c, next) => {
      const loginType = await getLoginType(c, this.env);
      if (loginType != LOGIN_TYPE_TENANT) {
        return unauthorized(c);
      }
      await next();
    });

    this.app.get("/dev", async (c) => {
      const user: any = await getSessionUser(c.req, env);
      const keys: string[] = await this.storage.get(KEYS);
      const filtered = keys.filter((k) => k.startsWith(CLIENT_PREFIX));
      const key = filtered[0];
      const client: any = await this.storage.get(key);
      const tenant: any = await this.storage.get(
        `${TENANT_PREFIX}${user.tenantId}`
      );

      // Data presented in form
      const data = {
        id: client.id,
        npwpNomor: client.npwpNomor,
        npwpNama: client.npwpNama,
        npwpAlamat: client.npwpAlamat,
        npwpKota: client.npwpKota,
      };
      return c.html(
        <FormUpdate>
          <FormContent data={data} />
          {formScript}
        </FormUpdate>
      );
    });

    /* Durable keys /api/keys?tid=1 */
    this.app.get("/api/keys", async (c) => {
      const keys: string[] = await this.storage.get(KEYS);
      const url = new URL(c.req.url);
      const tid = url.searchParams.get("tid");
      const filtered = Boolean(parseInt(tid))
        ? keys.filter((k) => k.split(":").length == 3)
        : keys;
      filtered.sort();

      const lines = filtered.join("\n  ");
      return c.text(`  ${lines}`);
    });

    /* --------------------------------------------------------- */

    this.app.get("/api/:path", async (c) => {
      const path = c.req.param("path");
      if (!TablePaths.includes(path)) {
        return pageNotFound(c);
      }
      const tableName = path.replace("-", "_") as TableName;
      let prefix = PREFIX[singular(tableName)];
      const list = await this.storage.list({ prefix });
      const array: any[] = Array.from(list).map(([, value]) => value);

      const url = new URL(c.req.url);
      const group = url.searchParams.get("group");
      const method = url.searchParams.get("method");
      const tid = url.searchParams.get("tid");

      // Filtering modules with group or method
      if (tableName == "modules") {
        if (group) {
          const rs = array.filter(
            (m) => m.groupId.toLowerCase() == group.toLowerCase()
          );
          return c.json(rs);
        }
        if (method) {
          const rs = array.filter(
            (m) => m.method.toLowerCase() == method.toLowerCase()
          );
          return c.json(rs);
        }
      }

      // Filtering with tid (tenantId)
      const withTID = ["accounts", "clients", "members", "projects"];
      if (withTID.includes(tableName) && tid) {
        const rs = array.filter((m) => m.tenantId == tid.toLowerCase());
        return c.json(rs);
      }

      return c.json(array);
    });

    /* Per table/collection  */
    this.app.get("/api/:path/:id", async (c) => {
      const id = c.req.param("id"); //.toLowerCase();
      const path = c.req.param("path");
      const tableName = path.replace("-", "_") as TableName;
      let prefix = PREFIX[singular(tableName)];

      const doKeys: string[] = await this.storage.get(KEYS);
      const filtered = doKeys.filter(
        (k) => k.startsWith(prefix) && k.endsWith(id)
      );
      if (filtered.length) {
        const item = await this.storage.get(filtered[0]);
        if (item) {
          return c.json(item);
        }
      }
      return objectNotFound(c);
    });

    /* --------------------------------------------------------- */

    /* Tenant-only routes  */
    this.app.get("/api/tenant/:subPath", async (c) => {
      const subPath = c.req.param("subPath");
      const paths = [...TENANT_PATHS, "info"];
      // if (!paths.includes(subPath)) {
      //   return pageNotFound(c);
      // }

      const tableName =
        subPath == "info"
          ? ("tenants" as TableName)
          : (subPath.replace("-", "_") as TableName);
      return c.text(tableName);
    });

    // --------------------------------------------------------------

    /* AcesModules */
    this.app.get("/apix/working-modules", async (c) => {
      const url = new URL(c.req.url);
      const group = url.searchParams.get("group");
      const method = url.searchParams.get("method");

      const moduleList = await this.storage.list({ prefix: MODULE_PREFIX });
      const moduleArray = Array.from(moduleList).map(([, value]) => value);
      const groupList = await this.storage.list({ prefix: MODULEGROUP_PREFIX });
      const groupArray = Array.from(groupList).map(([, value]) => value);

      if (group) {
        const modules = moduleArray.filter(
          (m: any) => m.groupId.toLowerCase() == group.toLowerCase()
        );
        const ids = modules.map((m: any) => m.groupId);
        const groups = groupArray.filter((g: any) => ids.includes(g.id));
        return c.json({ modules, groups });
      }
      if (method) {
        const modules = moduleArray.filter(
          (m: any) => m.method.toLowerCase() == method.toLowerCase()
        );
        const ids = modules.map((m: any) => m.groupId);
        const groups = groupArray.filter((g: any) => ids.includes(g.id));
        return c.json({ modules, groups });
      }
      return c.json({ modules: moduleArray, groups: groupArray });
    });

    this.app.get("/apix/tenant/:infoOrTenantPath", async (c) => {
      const paths = [...TENANT_PATHS, "info"];
      const infoOrTenantPath = c.req.param("infoOrTenantPath");
      if (!paths.includes(infoOrTenantPath)) {
        return pageNotFound(c);
      }

      const user: any = await getSessionUser(c.req, env);
      // if (user.loginType != LOGIN_TYPE_TENANT) {
      //   return c.text("Unauthorized", 401);
      // }

      const tenantId = user.tenantId;
      console.log("tenantId", tenantId);
      if (infoOrTenantPath == "info") {
        const tenant = await this.storage.get(`${TENANT_PREFIX}${tenantId}`);
        return tenant ? c.json(tenant) : pageNotFound(c);
      }

      // Param "info" never comes to this point
      const prefix = `${PREFIX[singular(infoOrTenantPath)]}${tenantId}`;
      const list = await this.storage.list({ prefix: prefix });
      const array = Array.from(list).map(([, value]) => value);
      return c.json(array);
    });

    this.app.get("/apix/tenant/:tenantPath/:id", async (c) => {
      const tenantPath = c.req.param("tenantPath");
      console.log("tenantPath", tenantPath);
      if (!TENANT_PATHS.includes(tenantPath)) {
        return pageNotFound(c);
      }

      const user: any = await getSessionUser(c.req, env);
      if (user.loginType != LOGIN_TYPE_TENANT) {
        return c.text("Unauthorized", 401);
      }

      const id = c.req.param("id");
      const tenantId = user.tenantId;
      const key = `${PREFIX[singular(tenantPath)]}${tenantId}:${id}`;
      console.log(key);
      const item = await this.storage.get(key);
      if (!item) {
        return objectNotFound(c);
      }
      return c.json(item);
    });

    this.app.post("/apix/tenant/:infoOrTenantPath", async (c) => {
      const paths = [...TENANT_PATHS, "info"];
      const infoOrTenantPath = c.req.param("infoOrTenantPath");
      console.log("infoOrTenantPath", infoOrTenantPath);

      if (!paths.includes(infoOrTenantPath)) {
        return pageNotFound(c);
      }

      const user: any = await getSessionUser(c.req, env);
      if (user.loginType != LOGIN_TYPE_TENANT) {
        return c.text("Unauthorized", 401);
      }

      const tableName =
        infoOrTenantPath == "info" ? "tenants" : infoOrTenantPath;
      const { id, data } = (await c.req.json()) as unknown as UpdateBody;
      console.log("id", id);
      console.log("data", data);

      // If tableName is 'tenants', the `id` must match `user.tenantId`
      if (tableName == "tenants") {
        if (id != user.tenantId) {
          return c.json(
            {
              info: "The `id` doesn't match `tenantId`",
            },
            400
          );
        }

        const key = `${TENANT_PREFIX}${id}`;
        console.log("key", key);
        const item = await this.storage.get(key);
        if (!item) {
          return objectNotFound(c);
        }

        const updatedObject = this.updateItem(
          env,
          tableName,
          id,
          key,
          item,
          data
        );
        return c.json(updatedObject);
      }

      // Table = accounts / client / member / project
      // Key = [type]:[tenantId]:[id]
      // const key = `${PREFIX[singular(tableName)]}${user.tenantId}:${id}`;
      const key = `${
        PREFIX[singular(tableName)]
      }6397c202f3d8a77b799c4292:${id}`;
      console.log("key", key);
      const item = await this.storage.get(key);
      if (!item) {
        return objectNotFound(c);
      }

      const updatedObject = this.updateItem(
        env,
        tableName,
        id,
        key,
        item,
        data
      );
      return c.json(updatedObject);
    });

    this.app.post("/apix/tenant/create", async (c) => {
      const user: any = await getSessionUser(c.req, env);
      const loginType = await getLoginType(c);
      console.log(loginType);
      if (user.loginType != LOGIN_TYPE_TENANT) {
        return c.text("Unauthorized", 401);
      }

      // 1. create id
      // 2. create key
      // 3. create object from input and template
      // 4. put to store and db
      // 5. return

      const { type, data } = (await c.req.json()) as unknown as any;

      if (!["client", "project", "tenant"].includes(type)) {
        return c.json({ info: "Invalid type" }, 400);
      }

      const theType: ClientOrProjectOrTenant = type;

      const id = ObjectID().toHexString();
      const { item, stmt, bind } = prepareNewItem(theType, id, data);
      const key = {
        client: `${CLIENT_PREFIX}${user.tenantId}:${id}`,
        project: `${PROJECT_PREFIX}${user.tenantId}:${id}`,
        tenant: `${TENANT_PREFIX}${id}`,
      }[theType];

      this.saveNewItemAndUpdateKeys(env, item, key, stmt, bind);

      return c.json(item);
    });

    this.app.get("/apix/:tableName", async (c) => {
      const tableName = c.req.param("tableName");

      if (!ACES_PATHS.includes(tableName)) {
        return pageNotFound(c);
      }

      const user: any = await getSessionUser(c.req, env);
      if (user.loginType != LOGIN_TYPE_ACES) {
        return c.text("Unauthorized", 401);
      }

      const url = new URL(c.req.url);
      const tid = url.searchParams.get("tid");
      console.log("tid:", tid);

      let prefix = PREFIX[singular(tableName)];

      // None TID
      if (tid !== null) {
        prefix = `${prefix}${tid}`;
        console.log("prefix:", prefix);
        if (tableName == "tenants") {
          const tenant = await this.storage.get(prefix);
          return tenant
            ? c.json(tenant)
            : c.json({ message: "Not Found" }, 404);
        } else {
          // No tenantId in users
          prefix = tableName == "users" ? PREFIX[singular(tableName)] : prefix;
          const list = await this.storage.list({ prefix: prefix });
          const array = Array.from(list).map(([, value]) => value);
          return c.json(array);
        }
      }

      // With TID
      console.log("prefix:", prefix);
      const list = await this.storage.list({ prefix: prefix });
      const array = Array.from(list).map(([, value]) => value);
      return c.json(array);
    });

    this.app.get("/apix/:tableName/:id", async (c) => {
      const { tableName, id } = c.req.param();
      if (!ACES_PATHS.includes(tableName)) {
        return pageNotFound(c);
      }

      // For tenants and users
      if (tableName == "tenants" || tableName == "users") {
        const key = PREFIX[singular(tableName)] + id;
        const item = await this.storage.get(key);
        if (item == undefined) return objectNotFound(c);
        return c.json(item);
      }

      // Other than tenants and users
      const prefix = PREFIX[singular(tableName)];
      console.log(prefix + id);
      // Using KEYS
      const storedKeys: string[] = await this.storage.get(KEYS);
      const filter = storedKeys.filter(
        (t) => t.startsWith(prefix) && t.endsWith(id)
      );
      console.log(filter);

      // filter.length should be 1 or 0
      if (filter.length) {
        const found = await this.storage.get(filter[0]);
        if (found) {
          return c.json(found);
        }
      }
      return objectNotFound(c);
    });

    /* Create tenant, user/member/account
     * Handled by app -> only via aces web app
     **/

    this.app.post("/apix/create", async (c) => {
      const { type, data } = (await c.req.json()) as unknown as any;
    });
  }
}
