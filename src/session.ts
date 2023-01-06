import { unsealData } from "iron-session/edge";
import { Env } from "./env";
import { Account, Admin } from "./store.types";

// export type AcesSessionUser = Omit<Admin, 'secret' | 'created' | 'updated'> & {
export type AcesSessionUser = {
  id: string;
  loginType: 'aces' | 'tenant';
  fullname: string;
  username: string;
  email: string;
  role: string;
  status: string;
  ts: number;
}

export type TenantSessionUser = Account & {
  loginType: 'aces' | 'tenant';
  ts: number;
}

export async function getSessionUser(req: Request, env: Env) {
  // First-party (hono) coookie: if exists, cookie starts with "aces-auth="
  const cookie = req.headers.get('cookie')
  // Client cookie: comes with cookie created using sealedData from API
  const session = req.headers.get('iron-session')
  const strCookie:string = cookie || session
  if (!strCookie || strCookie.length < 100) {
    return null
  }

  // If it is first-party cookie it starts with cookie name
  // hence we must trim first
  const cookieData = strCookie.startsWith(env.COOKIE_NAME)
    ? strCookie.substring(env.COOKIE_NAME.length + 1)
    : strCookie

  try {
    const user = await unsealData(cookieData, {password: env.COOKIE_PASSWORD})
    // if (!user) return null
    // iron-session cookie comes shaped as { user: { ... }}
    return user?.user ? user?.user : user
  } catch (error) {
    console.log('Error:getSessionUser', error)
    return null
  }
}
