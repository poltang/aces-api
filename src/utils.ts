import { Context } from "hono"
import { ACES_DO_NAME } from "./env";
import { getSessionUser } from "./session";
import { TableProps } from "./types"

export function pageNotFound(c: Context) {
  return c.text('404 Page Not Found', 404)
}

export function objectNotFound(c: Context) {
  return c.json({ info: 'Object Not Found'}, 404)
}

export function unauthorized(c: Context) {
  return c.text("Unauthorized", 401);
}

export const fetchAcesDurable = async (c) => {
  const id = c.env.ACES_DO.idFromName(ACES_DO_NAME);
  const stub = c.env.ACES_DO.get(id);
  return await stub.fetch(c.req);
};

export const getLoginType = async (c) => {
  const user: any = await getSessionUser(c.req, c.env);
  return user && user.loginType ? user.loginType : null;
};

export function objectify(thing: any) {
  if (Array.isArray(thing)) {
    return thing.map(t => objectify(t))
  }

  const clone = { ...thing }
  if (Object.keys(thing).includes('bizTypes')) {
    clone.bizTypes = JSON.parse(clone.bizTypes)
  }
  if (Object.keys(thing).includes('isDefault')) {
    clone.isDefault = Boolean(clone.isDefault)
  }
  return clone
}

// https://stackoverflow.com/questions/9229645/remove-duplicate-values-from-js-array
export function remove_duplicates_es6(arr: string[]) {
  let s = new Set(arr);
  let it = s.values();
  return Array.from(it);
}


export function logPath(c, prefix) {
  const url = new URL(c.req.url)
  console.log(`${prefix}:${url.pathname}`)
}

export function buildUpdater(src:any, update:any) {
  // Remove `ids`, `created`, `updated` from src
  const srcKeys = Object.keys(src).filter(k => (
    !k.toLowerCase().endsWith('id') && k != 'created' && k != 'updated'
  ))
  console.log(srcKeys);
  const updateKeys = Object.keys(update)
  const validFields = updateKeys.filter(k => srcKeys.includes(k))
  const values = {}
  validFields.forEach(k => {
    values[k] = update[k]
  })
  const ts = new Date().toISOString()
  const dbUpdater:any = {
    ...values,
    updated: ts,
  }
  const updatedObject = {
    ...src,
    ...values,
    updated: ts,
  }
  return { dbUpdater, updatedObject }
}

export function prepareDBUpdate(table:string, id:string|number, data:any) {
  const tableName = table.replace('-', '_')
  const cols = Object.keys(data).map(c => c + '=?').join(', ')
  const bind = Object.values(data).concat(id)
  const sql = `UPDATE ${tableName} SET ${cols} WHERE id=?`
  return {
    stmt: sql,
    bind
  }
}

export async function allTables(db: D1Database) {
  const rs = await db.batch([
    db.prepare("PRAGMA table_info(`admins`)"),
    db.prepare("PRAGMA table_info(`users`)"),
    db.prepare("PRAGMA table_info(`tenants`)"),
    db.prepare("PRAGMA table_info(`members`)"),
    db.prepare("PRAGMA table_info(`clients`)"),
    db.prepare("PRAGMA table_info(`projects`)"),
    db.prepare("PRAGMA table_info(`module_groups`)"),
    db.prepare("PRAGMA table_info(`modules`)"),
    db.prepare("PRAGMA table_info(`project_modules`)"),
    db.prepare("PRAGMA table_info(`accounts`)"),
    db.prepare("PRAGMA table_info(`module_usage`)"),
  ])

  return [
    { title: 'admins', rows: rs[0].results as unknown as TableProps[] },
    { title: 'users', rows: rs[1].results as unknown as TableProps[] },
    { title: 'tenants', rows: rs[2].results as unknown as TableProps[] },
    { title: 'members', rows: rs[3].results as unknown as TableProps[] },
    { title: 'clients', rows: rs[4].results as unknown as TableProps[] },
    { title: 'projects', rows: rs[5].results as unknown as TableProps[] },
    { title: 'module_groups', rows: rs[6].results as unknown as TableProps[] },
    { title: 'modules', rows: rs[7].results as unknown as TableProps[] },
    { title: 'project_modules', rows: rs[8].results as unknown as TableProps[] },
    { title: 'accounts', rows: rs[9].results as unknown as TableProps[] },
    { title: 'module_usage', rows: rs[10].results as unknown as TableProps[] },
  ];
}
