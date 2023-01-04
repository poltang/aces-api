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