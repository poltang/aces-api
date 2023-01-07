/* imports */
import { Hono } from "hono";
import { serveStatic } from "hono/serve-static.module";
import { Env, LOGIN_TYPE_TENANT } from "./env";
import {
  fetchAcesDurable,
  getLoginType,
  logPath,
  pageNotFound,
  unauthorized,
} from "./utils";
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
import { Prefixes, Singulars, TableNames, TablePaths } from "./store.types";
import { getSessionUser } from "./session";
import { sampleData } from "./data";

/* exports */
export { AcesDurables } from "./AcesDurables";

const app = new Hono<{ Bindings: Env }>({ strict: false });

// app.use('*', poweredBy())
// Middleware poweredBy() caused error when directly returning
// from DurableObject
// TODO: Should create issue on honojs

app.use("/static/*", serveStatic({ root: "./" }));

app.use("*", async (c, next) => {
  logPath(c, "Hono");
  await next();
});

const apiPaths = [
  ...TablePaths, // Durable
  "test", // <- all testing goes here
  "keys", // Durable
  "data",
  "pragma",
  "tenant", // Durable
];

app.use("/:query/:path?", async (c, next) => {
  console.log("middleware");
  const query = c.req.param("query");
  const login = await getLoginType(c, c.env);

  // Apply protected
  if (apiPaths.includes(query) && !login) {
    return unauthorized(c);
  }
  if (TablePaths.includes(query) && query != "modules") {
    if (login == LOGIN_TYPE_TENANT) return unauthorized(c);
  }
  if (query == "tenant" && login != LOGIN_TYPE_TENANT) {
    return unauthorized(c);
  }
  await next();
});

app.use("/:query/:path/:subpath?", async (c, next) => {
  console.log("middleware");
  const query = c.req.param("query");
  const login = await getLoginType(c, c.env);

  // Apply protected
  if (apiPaths.includes(query) && !login) {
    return unauthorized(c);
  }
  if (TablePaths.includes(query) && query != "modules") {
    if (login == LOGIN_TYPE_TENANT) return unauthorized(c);
  }
  if (query == "tenant" && login != LOGIN_TYPE_TENANT) {
    return unauthorized(c);
  }
  await next();
});

// ----------------------

app.use("/favicon.ico", serveStatic({ path: "./favicon.ico" }));
app.use("/login", serveStatic({ path: "./login.html" }));

app.get("/hello", (c) =>
  c.text("This is Home! You can access: /static/hello.txt")
);
app.get("/", async (c) => {
  return c.json({ TableNames, TablePaths, Prefixes, Singulars });
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
app.get("/sample-data", async (c) => sampleData(c));
app.get("/test/admin-kv", async (c) => adminKV(c));
app.get("/test/delete-kv", async (c) => deleteSeedKV(c));
app.get("/test/rebuild-kv", async (c) => rebuildSeedKV(c));
app.get("/test/tables", async (c) => showTables(c));
app.get("/test/mini", async (c) => mini(c));
app.get("/pragma/:table", async (c) => pragma(c));
app.get("/data/:table", async (c) => table(c));
app.get("/data/:table/:id", async (c) => tableWithId(c));

app.get("/:query/:path?", async (c) => {
  const query = c.req.param("query");
  console.log("query", query);
  if (!apiPaths.includes(query)) {
    return pageNotFound(c);
  }
  return fetchAcesDurable(c);
});

// { strict: true }
app.get("/:query/:path/*", async (c) => {
  const query = c.req.param("query");
  console.log("query", query);
  if (!apiPaths.includes(query)) {
    return pageNotFound(c);
  }
  return fetchAcesDurable(c);
});

// TES FORM UPDATE
// app.get("/dev/*", async (c) => fetchAcesDurable(c));
// app.get("/api/*", async (c) => fetchAcesDurable(c));
// app.post("/api/*", async (c) => fetchAcesDurable(c));

export default app;
