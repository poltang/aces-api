import { Hono } from "hono";
import { D1Database } from "./d1_beta";
import { Env } from "./env";
import { getSessionUser, TenantSessionUser } from "./session";
import {
  Backupable,
  Client,
  COLUMNS,
  DurableType,
  getDurableType,
  PREFIX,
  Project,
  TableName,
  TableNames,
  Tenant,
  ViewNames,
} from "./store.types";
import {
  buildUpdater,
  objectify,
  objectNotFound,
  pageNotFound,
  prepareDBUpdate,
  remove_duplicates_es6,
} from "./utils";
import { aces_sample_data } from "../sample-data/do-ready";
import { dumpItem, prepItemForDb } from "./store";

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
    console.log("DurableObject: starting AcesDurables instance ...");
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

    // PUT ALL INITIATION HERE
    this.state.blockConcurrencyWhile(async () => {
      console.log("blockConcurrencyWhile( ... )");
      console.log("Checking keys...");
      const keys = await this.storage.get(KEYS); // as string[];
      if (keys == undefined || (keys as string[]).length == 0) {
        console.log("Storage empty");
        this.initStoreWithSampleData(true);
      }
      if (keys && (keys as string[]).length > 1) {
        console.log(`Found ${(keys as string).length} key(s)`);
      }
      console.log("Finished initiation");
    });

    /* Return all DurableObject keys */
    // -> /keys
    // -> /keys?tid=[tenantId]
    this.app.get("/keys", async (c) => {
      const url = new URL(c.req.url);
      const tid = url.searchParams.get("tid");

      try {
        const keys = (await this.storage.get(KEYS)) as string[];
        console.log("KEYS", keys.length);
        if (keys.length > 0) {
          keys.sort().filter((k) => k != "KEYS");
        }
        // if (tid) return c.json(keys.filter((k) => k.includes(tid)));
        return c.json(keys);
      } catch (error) {
        console.log(error);
        return c.text("DO ERROR 103");
      }
    });

    this.app.get("/dump", async (c) => {
      const rs = await this.dumpStorage();
      return c.text(rs.join("\n"));
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
      const path = c.req.param("path");
      console.log(path);
      const url = new URL(c.req.url);
      const group = url.searchParams.get("group");
      const method = url.searchParams.get("method");
      const tid = url.searchParams.get("tid");
      const tableName = c.req.param("path").replace("-", "_") as TableName;
      const prefix = PREFIX[singular(tableName)];
      console.log("PREFIX", prefix);

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

      const results: any[] = [];
      try {
        const list = await this.storage.list({ prefix });
        if (list) {
          const array: any[] = Array.from(list).map(([, value]) => value);
          results.push(...array);
        }
      } catch (error) {
        console.log("Error reading storage");
        return c.json(
          {
            info: "Internal Server Error",
          },
          500
        );
      }

      // Case for modules: always return modules with their groups
      if (tableName == "modules") {
        const gPrefix = PREFIX["modulegroup"];
        const gList = await this.storage.list({ prefix: gPrefix });
        const gArray: any[] = Array.from(gList).map(([, value]) => value);

        if (group) {
          return c.json({
            modules: results.filter(
              (m) => m.groupId.toLowerCase() == group.toLowerCase()
            ),
            groups: gArray.filter(
              (m) => m.id.toLowerCase() == group.toLowerCase()
            ),
          });
        }
        if (method) {
          const modules = results.filter(
            (m) => m.method.toLowerCase() == method.toLowerCase()
          );
          const groupIds = modules.map((m) => m.groupId);
          return c.json({
            modules: modules,
            groups: gArray.filter((m) => groupIds.includes(m.id)),
          });
        }
        return c.json({
          modules: results,
          groups: gArray,
        });
      }
      return c.json(results);
    });

    /* Aces query with id */
    this.app.get("/:path/:id", async (c) => {
      const tableName = c.req.param("path").replace("-", "_") as TableName;
      const id = c.req.param("id");
      const allKeys: string[] = await this.storage.get(KEYS);

      if (!allKeys) {
        return c.text("EMPTY");
      }

      const prefix = PREFIX[singular(tableName)];
      const keys = allKeys.filter(
        (p) => p.startsWith(prefix) && p.endsWith(id)
      );

      const list = await this.storage.get(keys);
      if (list.size == 0) return objectNotFound(c);
      const array: any[] = Array.from(list).map(([, value]) => value);
      const result = array[0];

      // Case modules: include group
      if (tableName == "modules") {
        const group = await this.storage.get(
          `${PREFIX.modulegroup}${result.groupId}`
        );
        return c.json({
          module: result,
          group: group,
        });
      }
      return c.json(result);
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

  __deleteDB = async (env: Env) => {
    const rs = await env.DB.batch([
      env.DB.prepare(`DELETE FROM project_modules`),
      env.DB.prepare(`DELETE FROM modules`),
      env.DB.prepare(`DELETE FROM module_groups`),
      env.DB.prepare(`DELETE FROM projects`),
      env.DB.prepare(`DELETE FROM clients`),
      env.DB.prepare(`DELETE FROM members`),
      env.DB.prepare(`DELETE FROM tenants`),
      env.DB.prepare(`DELETE FROM users`),
      env.DB.prepare(`DELETE FROM admins`),
    ]);
    return rs;
  };

  /**
   * Save/copy 9 types of data to 9 DB table,
   * assuming the target tables are all empty.
   * @param env Env
   * @returns array of results report
   */
  __saveToDBTable = async (env: Env) => {
    const run = async (e, t, c, p) => {
      const list = await this.storage.list({ prefix: p });
      if (list.size == 0) return;
      const array = Array.from(list).map(([, v]) => v as Backupable);
      // console.log(array)
      const preps = [];
      array.forEach(async (item) => {
        const { stmt, values } = prepItemForDb(item, t, c);
        preps.push(e.DB.prepare(stmt).bind(...values));
      });
      return await e.DB.batch([...preps]);
    };

    await run(env, "admins", COLUMNS.admin, PREFIX.admin);
    await run(env, "users", COLUMNS.user, PREFIX.user);
    await run(env, "tenants", COLUMNS.tenant, PREFIX.tenant);
    await run(env, "members", COLUMNS.member, PREFIX.member);
    await run(env, "clients", COLUMNS.client, PREFIX.client);
    await run(env, "projects", COLUMNS.project, PREFIX.project);
    await run(env, "module_groups", COLUMNS.modulegroup, PREFIX.modulegroup);
    await run(env, "modules", COLUMNS.module, PREFIX.module);
    await run(
      env,
      "project_modules",
      COLUMNS.projectmodule,
      PREFIX.projectmodule
    );
  };

  /**
   *
   * @returns array of SQL ordered insert statements as DO backup
   */
  dumpStorage = async () => {
    const run = async (s, p, t: TableName) => {
      if (ViewNames.includes(t)) return [];
      const list = await s.list({ prefix: p });
      const array = Array.from(list).map(([, v]) => v);
      const rs = [];
      array.forEach(async (item) => {
        const text = dumpItem(item, t);
        rs.push(text);
      });
      return rs.length ? rs : ["-- empty"];
    };

    const rs = [];
    // DO NOT CHANGE THE ORDER
    rs.push("--\n-- admins\n--");
    rs.push(...(await run(this.storage, PREFIX.admin, "admins")));
    rs.push("--\n-- users\n--");
    rs.push(...(await run(this.storage, PREFIX.user, "users")));
    rs.push("--\n-- tenants\n--");
    rs.push(...(await run(this.storage, PREFIX.tenant, "tenants")));
    rs.push("--\n-- members\n--");
    rs.push(...(await run(this.storage, PREFIX.member, "members")));
    rs.push("--\n-- clients\n--");
    rs.push(...(await run(this.storage, PREFIX.client, "clients")));
    rs.push("--\n-- projects\n--");
    rs.push(...(await run(this.storage, PREFIX.project, "projects")));
    rs.push("--\n-- module_groups\n--");
    rs.push(...(await run(this.storage, PREFIX.modulegroup, "module_groups")));
    rs.push("--\n-- modules\n--");
    rs.push(...(await run(this.storage, PREFIX.module, "modules")));
    rs.push("--\n-- project_modules\n--");
    rs.push(
      ...(await run(this.storage, PREFIX.projectmodule, "project_modules"))
    );
    // rs.push('-- accounts')
    // rs.push(...(await run(this.storage, PREFIX.account, "accounts")));
    // rs.push('-- module_usages')
    // rs.push(...(await run(this.storage, PREFIX.moduleusage, "module_usages")));
    return rs;
  };

  __resetKeys = async () => {
    const keys: string[] = await this.storage.get(KEYS);
    if (keys && keys.length > 0) {
      return await this.storage.delete(keys);
    }
  };

  __cleanupStore = async () => {
    const keys: string[] = await this.storage.get(KEYS);
    // Perform deletion using txn
    if (keys && keys.length > 0) {
      await this.storage.transaction(async (txn) => {
        // await txn.delete(keys) // <- delete all
        keys.forEach(async (key) => await txn.delete(key)); // <- per entry
      });
    }
  };

  initStoreWithSampleData = async (force: boolean) => {
    if (force) {
      console.log("Force init...");
      console.log("Deleting all key-value pairs in storage...");
      await this.storage.deleteAll();
      console.log("Loading sample data...");
      await this.storage.transaction(async (txn) => {
        await txn.put(aces_sample_data); // <- max 128 entries
        const keys = Object.keys(aces_sample_data);
        await txn.put(KEYS, keys);
      });
      console.log(
        `Loaded ${
          Object.keys(aces_sample_data).length
        } key-value pairs to storage.`
      );
      console.log("Finished");
    }
  };

  __loadFromDB = async (tableName: TableName, force = false) => {
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

  // NOT DONE YET
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

  // NOT DONE YET
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
