import { sealData } from "iron-session/edge"
import { decrypt } from "./crypto"
import { Account } from "./store.types"
import { AcesSessionUser, TenantSessionUser } from "./session"
import { objectNotFound } from "./utils"
import { ADMIN_KV_PREFIX, CRED_KV_PREFIX, LOGIN_TYPE_TENANT } from "./env"
import { Credential } from "./types"

export async function authHandler(c) {
  const { type, username, password } = (await c.req.json()) as unknown as Credential;

  const stmt = type == LOGIN_TYPE_TENANT
    ? `SELECT * FROM accounts WHERE status='active'
    AND isDefault=TRUE AND (email=? OR username=?)`
    : `SELECT * FROM admins
    WHERE status='active' AND (email=? OR username=?)`

  const found = await c.env.DB.prepare(stmt)
    .bind(username, username).first()

  if (!found) return objectNotFound(c)

  const key = type == LOGIN_TYPE_TENANT
    ? `${CRED_KV_PREFIX}:${found.id}`
    : `${ADMIN_KV_PREFIX}${found.id}`

  const data = await c.env.KV.getWithMetadata(key) //as unknown as CredentialKV
  console.log('key', key);
  console.log('data', data);

  if (!data) {
    // Credential hasn't been created
    // TODO: what action?
    return c.json({ message: 'Could not log you in: Password not created'}, 401)
  }

  if (password != await decrypt(data.metadata.secret)) {
    return c.json({ message: 'Error username or password'}, 401)
  }

  const user = type == LOGIN_TYPE_TENANT
  ? {
    ...found,
    isDefault: true,
    loginType: 'tenant',
    ts: new Date().getTime(),
  } as TenantSessionUser
  : {
    id: found.id,
    loginType: "aces",
    fullname: found.fullname,
    username: found.username,
    email: found.email,
    role: found.role,
    status: found.status,
    ts: new Date().getTime(),
  } as AcesSessionUser

  console.log("AcesSessionUser:", user);
  const sealedData = await sealData(user, {password: c.env.COOKIE_PASSWORD});
  console.log("sealedData:", sealedData);

  /* Create headers and set cookie for direct client
  ================================================== */
  c.header("X-Message", "Hello!");
  c.header("Content-Type", "application/json");
  c.cookie(c.env.COOKIE_NAME, sealedData);
  c.status(200);

  /* Return user and cookie data that can be reused by client
  =========================================================== */
  return c.json({ user, cookie: sealedData });
}

