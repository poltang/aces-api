import { Hono } from "hono";
import { Env } from "./env";
import { getSessionUser, TenantSessionUser } from "./session";
import {
  Client,
  DurableType,
  getDurableType,
  PREFIX,
  Project,
  TableName,
  TableNames,
  Tenant,
} from "./store.types";
import {
  buildUpdater,
  objectify,
  objectNotFound,
  pageNotFound,
  prepareDBUpdate,
  remove_duplicates_es6,
} from "./utils";

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

const TenantDataGroup: TableName[] = [
  "accounts",
  "clients",
  "projects",
  "members",
];

const KEYS = `KEYS`;

export class AcesDurables {
  app = new Hono({ strict: false });
  env: Env;
  state: DurableObjectState;
  storage: DurableObjectStorage;

  constructor(state: DurableObjectState, env: Env) {
    console.log("Starting DurableObject: AcesDurables ...");
    this.env = env;
    this.state = state;
    this.storage = state.storage;

    this.state.blockConcurrencyWhile(async () => {
      console.log("blockConcurrencyWhile( ... )");
    });

    /* Return all DurableObject keys */
    // -> /keys
    // -> /keys?tid=[tenantId]
    this.app.get("/keys", async (c) => {
      const url = new URL(c.req.url);
      const tid = url.searchParams.get("tid");
      const keys = ((await this.storage.get(KEYS)) as string[])
        .sort()
        .filter((k) => k != "KEYS");
      if (tid) return c.json(keys.filter((k) => k.includes(tid)));
      return c.json(keys);
    });

    this.app.get("/tenant", async (c) => {
      const user = (await getSessionUser(c.req, this.env)) as TenantSessionUser;
      const tenantId = user.tenantId;
      const key = getDurableKey("tenant", tenantId, tenantId);
      const tenant = await this.storage.get(key);
      return c.json(tenant);
    });

    const tenantQueries = ["info", "accounts", "clients", "projects"];

    /* Tenant-only query */
    this.app.get("/tenant/:query", async (c) => {
      const user = (await getSessionUser(c.req, this.env)) as TenantSessionUser;
      const tenantId = user.tenantId;
      const query = c.req.param("query");

      if (!tenantQueries.includes(query)) return pageNotFound(c);

      const tableName: TableName =
        query == "info" ? "tenants" : (query as TableName);

      if (tableName == "tenants") {
        const key = getDurableKey("tenant", tenantId, tenantId);
        const tenant = await this.storage.get(key);
        return c.json(tenant);
      }

      const prefix = PREFIX[singular(tableName)] + tenantId;
      const list = await this.storage.list({ prefix });
      const array: any[] = Array.from(list).map(([, value]) => value);
      return c.json(array);
    });

    /* Tenant-only query with id */
    this.app.get("/tenant/:query/:id", async (c) => {
      const id = c.req.param("id");
      const query = c.req.param("query");

      if (!tenantQueries.includes(query)) return pageNotFound(c);

      const user = (await getSessionUser(c.req, this.env)) as TenantSessionUser;
      const tenantId = user.tenantId;
      const tableName: TableName =
        query == "info" ? "tenants" : (query as TableName);
      const type = getDurableType(tableName);
      const key = getDurableKey(type, id, tenantId);
      const item = await this.storage.get(key);
      if (!item) return objectNotFound(c);
      return c.json(item);
    });

    /* Aces query */
    // -> /modules?method=assisted
    // -> /projects?tid=[tenantId]
    this.app.get("/:path", async (c) => {
      const url = new URL(c.req.url);
      const group = url.searchParams.get("group");
      const method = url.searchParams.get("method");
      const tid = url.searchParams.get("tid");
      const tableName = c.req.param("path").replace("-", "_") as TableName;
      const prefix = PREFIX[singular(tableName)];

      // Case for tenant data
      if (tid && TenantDataGroup.includes(tableName)) {
        // Retrive keys
        const allKeys: string[] = await this.storage.get(KEYS);
        const tidPrefix = `${prefix}${tid}`;
        const keys = allKeys.filter((k) => k.startsWith(tidPrefix));
        const list = await this.storage.get(keys);
        const array: any[] = Array.from(list).map(([, value]) => value);
        return c.json(array);
      }

      const list = await this.storage.list({ prefix });
      const array: any[] = Array.from(list).map(([, value]) => value);

      // Case for modules: always return modules with their groups
      if (tableName == "modules") {
        const gPrefix = PREFIX["modulegroup"];
        const gList = await this.storage.list({ prefix: gPrefix });
        const gArray: any[] = Array.from(gList).map(([, value]) => value);

        if (group) {
          return c.json({
            modules: array.filter(
              (m) => m.groupId.toLowerCase() == group.toLowerCase()
            ),
            groups: gArray.filter(
              (m) => m.id.toLowerCase() == group.toLowerCase()
            ),
          });
        }
        if (method) {
          const modules = array.filter(
            (m) => m.method.toLowerCase() == method.toLowerCase()
          );
          const groupIds = modules.map((m) => m.groupId);
          return c.json({
            modules: modules,
            groups: gArray.filter((m) => groupIds.includes(m.id)),
          });
        }
        return c.json({
          modules: array,
          groups: gArray,
        });
      }
      return c.json(array);
    });

    /* Aces query with id */
    this.app.get("/:path/:id", async (c) => {
      const tableName = c.req.param("path").replace("-", "_") as TableName;
      const id = c.req.param("id");
      const allKeys: string[] = await this.storage.get(KEYS);
      const prefix = PREFIX[singular(tableName)];
      const keys = allKeys.filter(
        (p) => p.startsWith(prefix) && p.endsWith(id)
      );

      // TODO: include group when returning modules

      const list = await this.storage.get(keys);
      if (list.size == 0) return objectNotFound(c);
      const array: any[] = Array.from(list).map(([, value]) => value);
      return c.json(array[0]);
    });

    /* Reserved */
    this.app.get("/:path/:subpath/:opt", async (c) => {
      const opt = c.req.param("opt");
      const path = c.req.param("path");
      const subpath = c.req.param("subpath");
      return c.text(`query -> ${path} -> ${subpath} -> ${opt}`);
    });
  }

  async fetch(request: Request) {
    // let ip = request.headers.get("CF-Connecting-IP");
    console.log("DurableObject: fetch()");
    return this.app.fetch(request);
  }

  loadFromDB = async (tableName: TableName, force = false) => {
    if (!TableNames.includes(tableName)) return;

    const list = await this.storage.list({
      prefix: PREFIX[singular(tableName)],
    });
    if (list.size == 0 || force) {
      console.log(`Load ${tableName} from D1...`);
      const entries = {};
      const keys = [];
      const rs = await this.env.DB.prepare(`SELECT * FROM ${tableName}`).all();
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
    this.env.DB.prepare(stmt)
      .bind(...bind)
      .run();
    return updatedObject;
  };

  saveNewItemAndUpdateKeys = async (
    item: Client | Project | Tenant,
    key: string,
    stmt: string,
    bind: any[]
  ) => {
    const keys: string[] = await this.storage.get(KEYS);
    this.storage.put(key, item);
    this.storage.put(KEYS, [...keys, key]);
    this.env.DB.prepare(stmt)
      .bind(...bind)
      .run();
  };
}
