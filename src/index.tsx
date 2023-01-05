import { Hono } from "hono";
import { serveStatic } from "hono/serve-static.module";
import ObjectID from "bson-objectid";
import { DBTables, Env, LOGIN_TYPE_TENANT } from "./env";
import { allTables, logPath, objectify } from "./utils";
import signinHTML from "./signin-html";
import { authHandler } from "./auth";
import { getSessionUser } from "./session";
import { Credential } from "./types";
import SQLiteTable from "./SQLiteTable";
// import { FormData, FormUpdate, FormContent, formScript } from "./form-update";
/* exports */
export { AcesDurables } from "./AcesDurables";

const ACES_DO_NAME = "aces-durables";

const app = new Hono<{ Bindings: Env }>({ strict: true });

// app.use('*', poweredBy())
// Middleware poweredBy() caused error when directly returning
// from DurableObject
// TODO: Should create issue on honojs

app.use("/static/*", serveStatic({ root: "./" }));
app.use("/favicon.ico", serveStatic({ path: "./favicon.ico" }));
app.use("/login", serveStatic({ path: "./login.html" }));
app.get("/", (c) => c.text("This is Home! You can access: /static/hello.txt"));

app.use("*", async (c, next) => {
  logPath(c, "Hono");
  await next();
});

app.get("/tables", async (c) => {
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
});

app.get("/xx", async (c) => {
  if (globalThis.MINIFLARE) {
    console.log("Running in local/dev mode");
  } else {
    console.log("Running in production");
  }
  const list = await c.env.KV.list({ prefix: "cred:" });
  console.log("list", list.keys.length);
  if (list.keys.length == 0) {
    const secret = "y2o2X8B4ChDQiH5PB0Wxpmd8SsTaeqg=";
    const ids = [
      "6397c47ba009344a26c0db8e",
      "6397c47ba009344a26c0db8f",
      "6397c47ba009344a26c0db90",
      "6397c47ba009344a26c0db91",
      "6397c47ba009344a26c0db92",
      "6397c47ba009344a26c0db93",
    ];
    /* for (let i = 0; i < ids.length; i++) {
      await c.env.KV.put(`cred:${ids[i]}`, secret, {
        metadata: {
          id: ids[i],
          secret: secret,
          created: new Date().toISOString(),
        },
      });
    } */
  }

  const id = ObjectID().toHexString();
  // const x = createTenantTemplate();
  // return c.json(x);

  return c.text("Hello Hono! " + id);
});

/* Signin */

app.get("/signin", async (c) => {
  return c.html(signinHTML);
});

// Signin only accepts Credential type object
app.post("/signin", async (c) => {
  // Cannot reconstruct a Request with a used body.
  const req = c.req.clone();
  const { type } = (await c.req.json()) as unknown as Credential;

  if (!type) return c.text("Bad Request", 400);

  // Tenant signin handler
  if (type == "tenant") {
    return authHandler(c);
  }

  // Aces signin handler
  const id = c.env.ACES_DO.idFromName(ACES_DO_NAME);
  const stub = c.env.ACES_DO.get(id);
  return await stub.fetch(req);
});

/* DB Viewers */

app.get("/pragma/:table", async (c) => {
  const table = c.req.param("table").replace("-", "_");
  if (DBTables.includes(table)) {
    const sql = `PRAGMA table_info('${table}')`;
    const rs = await c.env.DB.prepare(sql).all();
    return c.json(rs.results);
  }
  return c.text("Page Not Found", 404);
});

app.get("/data/:table", async (c) => {
  const table = c.req.param("table").replace("-", "_");
  if (!DBTables.includes(table)) {
    return c.text("Page Not Found", 404);
  }
  const sql = `SELECT * FROM [${table}]`;
  const rs = await c.env.DB.prepare(sql).all();
  return c.json(objectify(rs.results));
});

app.get("/data/:table/:id", async (c) => {
  const id = c.req.param("id");
  const table = c.req.param("table").replace("-", "_");
  if (!DBTables.includes(table)) {
    return c.text("Page Not Found", 404);
  }

  let sql = `SELECT * FROM [${table}] WHERE id=?`;
  const rs = await c.env.DB.prepare(sql).bind(id).first();
  if (!rs) return c.text("Not Found", 404);
  return c.json(objectify(rs));
});

app.get("/whoami", async (c) => {
  const user: any = await getSessionUser(c.req, c.env);
  if (!user) {
    return c.text("Unauthorized", 401);
  }
  return c.json(user);
});

/* AcesDurables */

// TES FORM UPDATE
app.get("/jsx", async (c) => {
  const user: any = await getSessionUser(c.req, c.env);
  if (!user || user.loginType != LOGIN_TYPE_TENANT) {
    return c.text("Unauthorized", 401);
  }

  const id = c.env.ACES_DO.idFromName(ACES_DO_NAME);
  const stub = c.env.ACES_DO.get(id);
  return await stub.fetch(c.req);
});
app.post("/jsx", async (c) => {
  const user: any = await getSessionUser(c.req, c.env);
  if (!user || user.loginType != LOGIN_TYPE_TENANT) {
    return c.text("Unauthorized", 401);
  }

  const id = c.env.ACES_DO.idFromName(ACES_DO_NAME);
  const stub = c.env.ACES_DO.get(id);
  return await stub.fetch(c.req);
});

app.get("/api/*", async (c) => {
  const user: any = await getSessionUser(c.req, c.env);
  if (!user) {
    return c.text("Unauthorized", 401);
  }

  const id = c.env.ACES_DO.idFromName(ACES_DO_NAME);
  const stub = c.env.ACES_DO.get(id);
  return await stub.fetch(c.req);
});

app.post("/api/*", async (c) => {
  const user: any = await getSessionUser(c.req, c.env);
  if (!user) {
    return c.text("Unauthorized", 401);
  }

  const id = c.env.ACES_DO.idFromName(ACES_DO_NAME);
  const stub = c.env.ACES_DO.get(id);
  return await stub.fetch(c.req);
});

export default app;
// app.fire();
