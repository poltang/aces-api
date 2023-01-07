import { aces_sample_data } from "../sample-data/do-ready";

export function sampleData(c) {
  // const o = {}
  // Object.keys(data).forEach((key) => {
  //   const src: any[] = data[key]
  //   src.forEach((item) => {
  //     const doKey = item.tenantId
  //     ? `${key}:${item.tenantId}:${item.id}`
  //     : `${key}:${item.id}`
  //     o[doKey] = item
  //   })
  // })
  return c.json(aces_sample_data)
}