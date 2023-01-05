import ObjectID from 'bson-objectid'
import { Client, ClientKeys, Project, ProjectKeys, Tenant, TenantKeys, Types } from './store.types'

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