export type TableName =
  | 'accounts'
  | 'admins'
  | 'clients'
  | 'members'
  | 'module_groups'
  | 'module_usages'
  | 'modules'
  | 'project_modules'
  | 'projects'
  | 'tenants'
  | 'users'

export const TableNames: TableName[] = [
  'accounts',
  'admins',
  'clients',
  'members',
  'module_groups',
  'module_usages',
  'modules',
  'project_modules',
  'projects',
  'tenants',
  'users',
]
export const Singulars = TableNames.map(n => n
  .substring(0, n.length -1)
  .replace('_', '')
)
export const Prefixes = TableNames.map(n => n
  .substring(0, n.length -1)
  .replace('_', '')
  .concat(':')
)
export const TablePaths = TableNames.map(n => n
  .replace('_', '-')
)

export type Admin = {
  id: string;
  username: string;
  fullname: string;
  email: string;
  secret: string;
  role: string;
  status: string;
  created: string;
  updated: string;
}
export type User = {
  id: string;
  username: string;
  fullname: string;
  email: string;
  created: string;
  updated: string;
}
export type Member = {
  id: string;
  tenantId: string;
  role: string;
  status: string;
  isDefault: boolean;
  created: string;
  updated: string;
}
export type Account = {
  id: string;
  tenantId: string;
  role: string;
  status: string;
  isDefault: boolean | number;
  mems: number;
  amems: number;
  username: string;
  email: string;
  fullname: string;
  tenantOrgName: string;
  tenantExpDate: string;
}
export type Client = {
  id: string;
  tenantId: string;
  created: string;
  updated: string;
  orgName: string;
  address1: string;
  address2: string;
  city: string;
  province: string;
  postcode: string;
  phone: string;
  email: string;
  website: string;
  orgType: string;
  bizTypes: string[];
  logo: string;
  npwpNomor: string;
  npwpNama: string;
  npwpNIK: string;
  npwpAlamat: string;
  npwpKelurahan: string;
  npwpKecamatan: string;
  npwpKota: string;
  npwpProvinsi: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
}
export type Project = {
  id: string;
  tenantId: string;
  clientId: string;
  adminId: string;
  slug: string;
  created: string;
  updated: string;
  type: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  acesContractDate: string;
  acesContractValue: number;
  acesInvoiceDate: string;
  reportLang: string;
  clientContractDate: string;
  clientInvoiceDate: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
}
export type Tenant = {
  id: string;
  adminId: string;
  created: string;
  updated: string;
  expiryDate: string;
  orgName: string;
  shortName: string;
  tenantType: string;
  licenseType: string;
  refreshDate: string;
  address1: string;
  address2: string;
  city: string;
  province: string;
  postcode: string;
  phone: string;
  email: string;
  website: string;
  orgType: string;
  bizTypes: string[]
  logo: string;
  npwpNomor: string;
  npwpNama: string;
  npwpNIK: string;
  npwpAlamat: string;
  npwpKelurahan: string;
  npwpKecamatan: string;
  npwpKota: string;
  npwpProvinsi: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  techContactName: string;
  techContactPhone: string;
  techContactEmail: string;
}
export type Module = {
  id: string;
  groupId: string;
  lang: string;
  level: number;
  minutes: number;
  method: string;
  title: string;
  description: string;
  price: number;
  created: string;
  updated: string;
}
export type ModuleGroup = {
  id: string;
  name: string;
  descID: string;
  descEN: string;
  created: string;
  updated: string;
}
export type ProjectModule = {
  id: string;
  projectId: string;
  quota: number;
  created: string;
  updated: string;
}
export type ModuleUsage = {
  id: string;
  projectId: string;
  quota: number;
  groupId: string;
  lang: string;
  level: number;
  minutes: number;
  method: string;
  title: string;
  description: string;
  price: string;
  created: string;
  updated: string;
}

export const ModuleKeys = (`id,groupId,lang,level,minutes,method,title,description,`
+ `price,created,updated`).split(',')

export const ModuleGroupKeys = (`id,name,descID,descEN,created,updated`).split(',')

export const ModuleUsageKeys = (`id,projectId,quota,groupId,lang,level,minutes,`
+ `method,title,description,price,created,updated`).split(',')

export const AdminKeys = (`id,username,fullname,email,role,status,`
+ `created,updated`).split(',')

export const UserKeys = (`id,username,fullname,email,`
+ `created,updated`).split(',')

export const MemberKeys = (`id,tenantId,role,status,isDefault,`
+ `created,updated`).split(',')

export const AccountKeys = (`id,tenantId,role,status,isDefault,mcount,username,email,`
+ `fullname,tenantOrgName,tenantExpDate`).split(',')

export const ClientKeys = (`id,tenantId,created,updated,orgName,address1,address2,city,`
+ `province,postcode,phone,email,website,orgType,bizTypes,logo,npwpNomor,npwpNama,npwpNIK,`
+ `npwpAlamat,npwpKelurahan,npwpKecamatan,npwpKota,npwpProvinsi,`
+ `contactName,contactPhone,contactEmail`).split(',')

export const TenantKeys = (`id,adminId,created,updated,expiryDate,orgName,shortName,`
+ `tenantType,licenseType,refreshDate,address1,address2,city,province,postcode,phone,`
+ `email,website,orgType,bizTypes,logo,npwpNomor,npwpNama,npwpNIK,npwpAlamat,`
+ `npwpKelurahan,npwpKecamatan,npwpKota,npwpProvinsi,contactName,contactPhone,`
+ `contactEmail,techContactName,techContactPhone,techContactEmail`).split(',')

export const ProjectKeys = (`id,tenantId,clientId,adminId,slug,created,updated,`
+`type,title,description,startDate,endDate,acesContractDate,acesContractValue,`
+`acesInvoiceDate,reportLang,clientContractDate,clientInvoiceDate,contactName,`
+`contactPhone,contactEmail`).split(',')

export const ProjectModuleKeys =(`id,projectId,quota,created,updated`).split(',')

export type DurableType =
  | "account"
  | "admin"
  | "client"
  | "member"
  | "modulegroup"
  | "moduleusage"
  | "module"
  | "projectmodule"
  | "project"
  | "tenant"
  | "user";

// export type DurablePrefix = {
//   [K in DurableType]: string;
// };

export function getDurableType(tableName: TableName) {
  return tableName.substring(0, tableName.length -1)
  .replace('_', '') as DurableType
}

export const DurableTypes = {}

export type PrefixType = {
  [K in DurableType]: string;
};

export const PREFIX: PrefixType = {
  // Key is singular mode of table name sans underscore
  account: Prefixes[0],
  admin: Prefixes[1],
  client: Prefixes[2],
  member: Prefixes[3],
  modulegroup: Prefixes[4],
  moduleusage: Prefixes[5],
  module: Prefixes[6],
  projectmodule: Prefixes[7],
  project: Prefixes[8],
  tenant: Prefixes[9],
  user: Prefixes[10],
};