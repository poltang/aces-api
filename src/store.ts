import ObjectID from 'bson-objectid'
import { Backupable, Client, ClientKeys, Project, ProjectKeys, TableName, Tenant, TenantKeys, Types } from './store.types'

export type ClientOrProjectOrTenant = 'client' | 'project' | 'tenant'

function newClientOrProjectOrTenant(
  type: ClientOrProjectOrTenant,
  id: string,
  rawInput: any
) {
  const item: any = {}
  const keys = type == 'client' ? ClientKeys : type == 'project' ? ProjectKeys : TenantKeys
  keys.forEach(k => {
    let value = rawInput[k] ? rawInput[k] : ''

    if (k.toLowerCase().endsWith('id')) {
      if (!ObjectID.isValid(value)) {
        // TODO
      }
    }
    if (k == 'id') {
      value = id
    } else if (k == 'bizTypes') {
      if (typeof value == 'string') {
        value = [value]
      } else if (Array.isArray(value)) {
        // Nothing to do
      } else {
        value = [String(value)]
      }
    } else if (k == 'acesContractValue') { // project
      if (typeof value != 'number') {
        value = parseInt(value)
      }
    }
    item[k] = value
  })

  const ts = new Date().toISOString()
  item.created = ts
  item.updated = ts

  return type == 'client'
    ? item as Client
    : type == 'project'
    ? item as Project
    : item as Tenant
}

export function prepareNewItem(
  type: 'client' | 'project' | 'tenant',
  id: string,
  rawInput: any
) {
  const tableName = { client: 'clients', project: 'projects', tenant: 'tenants' }[type]
  const newItem = newClientOrProjectOrTenant(type, id, rawInput)
  const cols = Object.keys(newItem).map(c => c + '=?').join(', ')
  const bind = Object.values(newItem).concat(id)
  const sql = `UPDATE ${tableName} SET ${cols} WHERE id=?`
  return {
    item: newItem,
    stmt: sql,
    bind
  }
}

export function prepareUpdater(itemToUpdate: any, newData: any) {}

export function prepareDBUpdate(table:string, id:string|number, data:any) {}





export function prepItemForDb(item: any, tableName: TableName, cols: string[]) {
  const vals = cols.map(i => '?').join(',')
  const stmt = `INSERT INTO ${tableName} (${cols.join(',')}) VALUES (${vals})`
  if (cols.includes('bizTypes')) {
    item.bizTypes = JSON.stringify(item.bizTypes)
  }
  if (cols.includes('isDefault')) {
    item.isDefault = item.isDefault ? 1 : 0
  }
  const values = Object.values(item)
  return { stmt, values }
}

// Return D1 SQL for storage item
export function dumpItem(item: any, tableName: TableName) {
  const cols = Object.keys(item)
  const values = Object.values(item)
  const sqlValues = values.map(v => {
    let val = `'${v}'`
    if (typeof v == 'string') {
      const s = v.replace("'", "''")
      val = `'${s}'`
    }
    if (typeof v == 'number') {
      val = `${v}`
    }
    if (typeof v == 'boolean') {
      val = v ? `1` : `0`
    }
    if (Array.isArray(v)) {
      val = `'${JSON.stringify(v)}'`
    }
    return val
  })
  const stmt = `INSERT INTO ${tableName} (${cols.join(',')}) VALUES (${sqlValues.join(',')})`
  const types = []
  cols.forEach((c, i) => {
    let t = typeof values[i] as string
    if (Array.isArray(values[i])) t = 'array'
    types.push(`${c}:${t}`)
  })
  return stmt + ';'
}

/*
id TEXT,
adminId TEXT,
created TEXT,
updated TEXT,
expiryDate TEXT,
orgName TEXT,
shortName TEXT,
tenantType TEXT,
licenseType TEXT,
refreshDate TEXT,
address1 TEXT,
address2 TEXT,
city TEXT,
province TEXT,
postcode TEXT,
phone TEXT,
email TEXT,
website TEXT,
orgType TEXT,
bizTypes TEXT,
logo TEXT,
npwpNomor TEXT,
npwpNama TEXT,
npwpNIK TEXT,
npwpAlamat TEXT,
npwpKelurahan TEXT,
npwpKecamatan TEXT,
npwpKota TEXT,
npwpProvinsi TEXT,
contactName TEXT,
contactPhone TEXT,
contactEmail TEXT,
techContactName TEXT,
techContactPhone TEXT,
techContactEmail TEXT

*/