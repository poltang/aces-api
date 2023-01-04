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