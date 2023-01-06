import ObjectID from "bson-objectid";
import { Context } from "hono";
import { ADMIN_KV_PREFIX, CRED_KV_PREFIX, Env } from "./env";
import { getSessionUser } from "./session";
import SQLiteTable from "./SQLiteTable";
import { TableNames } from "./store.types";
import { allTables, objectify } from "./utils";

type RC = Context<string, { Bindings: Env }, unknown>;

const DEFAULT_SECRET = "y2o2X8B4ChDQiH5PB0Wxpmd8SsTaeqg=";
const SEED_USER_IDS = [
  "6397c47ba009344a26c0db8e",
  "6397c47ba009344a26c0db8f",
  "6397c47ba009344a26c0db90",
  "6397c47ba009344a26c0db91",
  "6397c47ba009344a26c0db92",
  "6397c47ba009344a26c0db93",
];

export async function whoami(c: RC) {
  const user: any = await getSessionUser(c.req, c.env);
  if (!user) {
    return c.text("Welcome, Guest.");
  }
  return c.json(user);
}

export async function adminKV(c: RC) {
  const admins = await c.env.KV.list({ prefix: ADMIN_KV_PREFIX });

  // If not yet in kv
  if (admins.keys.length == 0) {
    // Load from table
    const rs = await c.env.DB.prepare("SELECT * FROM admins").all();
    console.log(rs.results);

    // Put each to kv
    rs.results.forEach(async (row: any) => {
      const key = `${ADMIN_KV_PREFIX}${row.id}`;
      await c.env.KV.put(key, row.secret, {
        metadata: {
          id: row.id,
          secret: row.secret,
          info: "Aces admin KV credential",
          created: new Date().toISOString(),
        },
      });
    });

    // Reload kv
    const admins = await c.env.KV.list({ prefix: ADMIN_KV_PREFIX });
    return c.json(admins.keys);
  }

  return c.json(admins.keys);
}

export async function deleteSeedKV(c: RC) {
  const list = await c.env.KV.list({ prefix: CRED_KV_PREFIX });
  const keys = list.keys.map((i) => i.name);
  keys.forEach(async (key) => {
    await c.env.KV.delete(key);
  });
  return c.json(keys);
}

export async function rebuildSeedKV(c: RC) {
  SEED_USER_IDS.forEach(async (id: string) => {
    const key = `${CRED_KV_PREFIX}${id}`;
    await c.env.KV.put(key, DEFAULT_SECRET, {
      metadata: {
        id: id,
        secret: DEFAULT_SECRET,
        info: "Testing Cred KV",
        created: new Date().toISOString(),
      },
    });
  });

  const list = await c.env.KV.list({ prefix: CRED_KV_PREFIX });
  return c.json(list.keys);
}

export async function mini(c: RC) {
  const local = globalThis.MINIFLARE;
  const text = local ? "(Running local)" : "(Running production)";
  const id = ObjectID().toHexString();

  return c.text("Hello Hono! " + id + " " + text);
}

export async function showTables(c: RC) {
  const tables = await allTables(c.env.DB);
  return c.html(
    <div>
      <h1>Aces Tables</h1>
      {tables.map((table) => (
        <SQLiteTable title={table.title} results={table.rows} />
      ))}
      <div style="height:20rem" />
    </div>
  );
}

export async function pragma(c: RC) {
  const table = c.req.param("table").replace("-", "_");
  if (TableNames.includes(table)) {
    const sql = `PRAGMA table_info('${table}')`;
    const rs = await c.env.DB.prepare(sql).all();
    return c.json(rs.results);
  }
  return c.text("Page Not Found", 404);
}

export async function table(c: RC) {
  const table = c.req.param("table").replace("-", "_");
  if (!TableNames.includes(table)) {
    return c.text("Page Not Found", 404);
  }
  const sql = `SELECT * FROM [${table}]`;
  const rs = await c.env.DB.prepare(sql).all();
  return c.json(objectify(rs.results));
}

export async function tableWithId(c: RC) {
  const id = c.req.param("id");
  const table = c.req.param("table").replace("-", "_");
  if (!TableNames.includes(table)) {
    return c.text("Page Not Found", 404);
  }

  let sql = `SELECT * FROM [${table}] WHERE id=?`;
  const rs = await c.env.DB.prepare(sql).bind(id).first();
  if (!rs) return c.text("Not Found", 404);
  return c.json(objectify(rs));
}
