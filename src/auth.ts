import { sealData } from "iron-session/edge"
import { decrypt } from "./crypto"
import { RawAccount, TenantSessionUser } from "./types"

export async function authHandler(c) {
  const {username, password} = await c.req.json() as unknown as any

  // 1. Find only default account
  // TODO: case if no row with isDefault=TRUE
  const sql = `SELECT * FROM active_accounts WHERE status='active' AND isDefault=TRUE AND (email=? OR username=?)`
  const found: RawAccount = await c.env.DB.prepare(sql).bind(username, username).first()
  if (!found) {
    return c.json({ message: 'Not Found'}, 404)
  }
  console.log('RS', found)

  // 2. Check tenant's expiryDate
  // const exp = new Date(found.expiryDate).getTime()
  // const now = new Date().getTime()
  // const hours = (exp - now) / 3600000
  // if (hours < 1) {
  //   return c.json({ message: 'Could not log you in: Tenant expires in less then one hour'}, 401)
  // }

  // 3. Verify credential in KV
  /*
    key: cred:<id>
    value: secret
    metadata: {
      id: ids[i],
      secret: secret,
      created: new Date().toISOString(),
    }
  */
  const key = `cred:${found.id}`
  console.log('key', key);
  const data = await c.env.KV.getWithMetadata(key) //as unknown as CredentialKV
  console.log('data', data);

  if (!data) {
    // Credential hasn't been created
    // TODO: what action?
    return c.json({ message: 'Could not log you in: Password not created'}, 401)
  }

  // const secret = cred.metadata.secret
  // const decoded = await decrypt(secret)
  if (password != await decrypt(data.metadata.secret)) {
    return c.json({ message: 'Error username or password'}, 401)
  }

  // 4. Verified...
  // https://stackoverflow.com/questions/23886484/elegant-way-to-code-partially-copy-objects-in-javascript#50965203
  const { orgName, expiryDate, ...rest } = found
  const partial = rest
  const user: TenantSessionUser = { // SessionUser
    ...partial,
    // TODO
    // Check accuracy of `isDefault`
    isDefault: true, // found.isDefault == 1,
    loginType: 'tenant',
    tenantOrgName: found.orgName,
    tenantExpDate: found.expiryDate,
    ts: new Date().getTime(),
  }
  console.log('TenantSessionUser', user);

  const sealedData = await sealData(user, {password: c.env.COOKIE_PASSWORD})
  console.log("sealedData:", sealedData);


  /* Create headers and set cookie for direct client
  ================================================== */
  c.header('X-Message', 'Hello!')
  c.header('Content-Type', 'application/json')
  // c.cookie(c.env.COOKIE_NAME, createCookie(sealedData))
  c.cookie(c.env.COOKIE_NAME, sealedData)
  c.status(200)

  /* Return user and cookie data that can be reused by client
  =========================================================== */
  return c.json({ user, cookie: sealedData })
}