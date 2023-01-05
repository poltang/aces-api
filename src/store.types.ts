export type Admin = {
  id: string;
  username: string;
  fullname: string;
  email: string;
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
  created: string;
  updated: string;
  isDefault: boolean;
}
export type Account = {
  id: string;
  tenantId: string;
  role: string;
  status: string;
  isDefault: boolean;
  mcount: number;
  username: string;
  email: string;
  fullname: string;
  orgName: string;
  expiryDate: string;
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
export type UsedModule = {
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

export const UsedModuleKeys = (`id,projectId,quota,groupId,lang,level,minutes,`
+ `method,title,description,price,created,updated`).split(',')

export const AdminKeys = (`id,username,fullname,email,role,status,`
+ `created,updated`).split(',')

export const UserKeys = (`id,username,fullname,email,`
+ `created,updated`).split(',')

export const MemberKeys = (`id,tenantId,role,status,isDefault,`
+ `created,updated`).split(',')

export const AccountKeys = (`id,tenantId,role,status,isDefault,mcount,username,email,`
+ `fullname,orgName,expiryDate`).split(',')

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
  USEDMODULE: Typing;
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
  MODULE:         { prefix:'module:',          asPath:'module',          tableName:'modules',          typeName:'Module',         keys:ModuleKeys },
  MODULEGROUP:    { prefix:'modulegroup:',     asPath:'module-group',    tableName:'module_groups',    typeName:'ModuleGroup',    keys:ModuleGroupKeys },
  USEDMODULE:     { prefix:'usedmodule:',      asPath:'used-module',     tableName:'used_modules',     typeName:'UsedModule',     keys:UsedModuleKeys },
  PROJECTMODULE:  { prefix:'projectmodule:',   asPath:'project-module',  tableName:'project_modules',  typeName:'ProjectModule',  keys:[] },
  ADMIN:          { prefix:'admin:',           asPath:'admin',           tableName:'admins',           typeName:'Admin',          keys:AdminKeys },
  USER:           { prefix:'user:',            asPath:'user',            tableName:'users',            typeName:'User',           keys:UserKeys },
  MEMBER:         { prefix:'member:',          asPath:'member',          tableName:'members',          typeName:'Member',         keys:MemberKeys },
  ACCOUNT:        { prefix:'account:',         asPath:'account',         tableName:'accounts',         typeName:'Account',        keys:AccountKeys },
  CLIENT:         { prefix:'client:',          asPath:'client',          tableName:'clients',          typeName:'Client',         keys:ClientKeys },
  TENANT:         { prefix:'tenant:',          asPath:'tenant',          tableName:'tenants',          typeName:'Tenant',         keys:TenantKeys },
  PROJECT:        { prefix:'project:',         asPath:'project',         tableName:'projects',         typeName:'Project',        keys:ProjectKeys },
}
// Types.ACCOUNT.asPath