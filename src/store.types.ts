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

type Typing = {
  prefix: string;
  asPath: string;
  tableName: string;
  typeName: string;
  keys: string[] | null;
}
interface TypingType {
  MODULE: Typing;
  MODULEGROUP: Typing;
  MODULEUSAGE: Typing;
  PROJECTMODULE: Typing;
  ADMIN: Typing;
  USER: Typing;
  MEMBER: Typing;
  ACCOUNT: Typing;
  CLIENT: Typing;
  TENANT: Typing;
  PROJECT: Typing;
}

export const Types: TypingType = {
  ACCOUNT:        { prefix:'account:',         asPath:'accounts',         tableName:'accounts',         typeName:'Account',        keys:AccountKeys },
  ADMIN:          { prefix:'admin:',           asPath:'admins',           tableName:'admins',           typeName:'Admin',          keys:AdminKeys },
  CLIENT:         { prefix:'client:',          asPath:'clients',          tableName:'clients',          typeName:'Client',         keys:ClientKeys },
  MEMBER:         { prefix:'member:',          asPath:'members',          tableName:'members',          typeName:'Member',         keys:MemberKeys },
  MODULEGROUP:    { prefix:'modulegroup:',     asPath:'module-groups',    tableName:'module_groups',    typeName:'ModuleGroup',    keys:ModuleGroupKeys },
  MODULEUSAGE:    { prefix:'moduleusage:',     asPath:'module-usages',    tableName:'module_usages',    typeName:'ModuleUsage',    keys:ModuleUsageKeys },
  MODULE:         { prefix:'module:',          asPath:'modules',          tableName:'modules',          typeName:'Module',         keys:ModuleKeys },
  PROJECTMODULE:  { prefix:'projectmodule:',   asPath:'project-modules',  tableName:'project_modules',  typeName:'ProjectModule',  keys:ProjectModuleKeys },
  PROJECT:        { prefix:'project:',         asPath:'projects',         tableName:'projects',         typeName:'Project',        keys:ProjectKeys },
  TENANT:         { prefix:'tenant:',          asPath:'tenants',          tableName:'tenants',          typeName:'Tenant',         keys:TenantKeys },
  USER:           { prefix:'user:',            asPath:'users',            tableName:'users',            typeName:'User',           keys:UserKeys },
}
// Types.ACCOUNT.asPath