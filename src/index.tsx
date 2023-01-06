/* imports */
import { Hono } from "hono";
import { serveStatic } from "hono/serve-static.module";
import { Env, LOGIN_TYPE_TENANT } from "./env";
import { fetchAcesDurable, getLoginType, logPath, unauthorized } from "./utils";
import signinHTML from "./signin-html";
import { authHandler } from "./auth";
import { Credential } from "./types";
import {
  adminKV,
  deleteSeedKV,
  mini,
  pragma,
  rebuildSeedKV,
  showTables,
  table,
  tableWithId,
  whoami,
} from "./dev-routes";
import { AsPaths, Prefixes, Singulars, TableNames } from "./store.types";
import { getSessionUser } from "./session";

/* exports */
export { AcesDurables } from "./AcesDurables";

const app = new Hono<{ Bindings: Env }>({ strict: true });

// app.use('*', poweredBy())
// Middleware poweredBy() caused error when directly returning
// from DurableObject
// TODO: Should create issue on honojs

app.use("*", async (c, next) => {
  logPath(c, "Hono");
  await next();
});
app.use("/static/*", serveStatic({ root: "./" }));
app.use("/favicon.ico", serveStatic({ path: "./favicon.ico" }));
app.use("/login", serveStatic({ path: "./login.html" }));
app.get("/z", (c) => c.text("This is Home! You can access: /static/hello.txt"));
app.get("/", async (c) => {
  return c.json({ TableNames, AsPaths, Prefixes, Singulars });
});
/* Signin */

app.get("/signin", async (c) => c.html(signinHTML));

// Signin only accepts Credential type object
app.post("/signin", async (c) => {
  const { type } = (await c.req.json()) as unknown as Credential;
  if (!type) return c.json({ info: "Bad Request" }, 400);
  return authHandler(c);
});

/* DEV Routes */

app.get("/whoami", async (c) => whoami(c));
app.get("/admin-kv", async (c) => adminKV(c));
app.get("/delete-kv", async (c) => deleteSeedKV(c));
app.get("/rebuild-kv", async (c) => rebuildSeedKV(c));
app.get("/tables", async (c) => showTables(c));
app.get("/mini", async (c) => mini(c));
app.get("/pragma/:table", async (c) => pragma(c));
app.get("/data/:table", async (c) => table(c));
app.get("/data/:table/:id", async (c) => tableWithId(c));

/* Middleware: aces or tenant */
app.use("/api/:tenantOrAces/*", async (c, next) => {
  const path = c.req.param("tenantOrAces");
  const loginType = await getLoginType(c);
  if (path == LOGIN_TYPE_TENANT && loginType != LOGIN_TYPE_TENANT) {
    return unauthorized(c);
  }
  if (path != LOGIN_TYPE_TENANT && loginType == LOGIN_TYPE_TENANT) {
    return unauthorized(c);
  }
  await next();
});

/* Middleware: aces & tenat */
app.use("/jsx", async (c, next) => {
  const user = await getSessionUser(c.req, c.env);
  if (!user) return unauthorized(c);
  await next();
});

// TES FORM UPDATE
app.get("/jsx", async (c) => fetchAcesDurable(c));
// app.post("/jsx", async (c) => fetchAcesDurable(c));

app.get("/api/*", async (c) => fetchAcesDurable(c));
app.post("/api/*", async (c) => fetchAcesDurable(c));

export default app;
