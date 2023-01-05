export interface Credential {
  username: string;
  password: string;
  type: string;
}

export interface CredentialKV {
  key: string;
  value: any[];
  metadata: {
    secret: string;
  };
}

export type RawAccount = {
  id: string;
  tenantId: string;
  role: string;
  status: string;
  isDefault: boolean | number;
  mcount: number;
  username: string;
  email: string;
  fullname: string;
  orgName: string;
  expiryDate: string;
}

export type TenantSessionUser = Omit<RawAccount, 'orgName' | 'expiryDate'> & {
  tenantOrgName: string; // tenant.orgName
  tenantExpDate: string; // tenant.expiryDate
  loginType: 'tenant';
  ts: number;
}

type UpdateData = {
  [key: string]: string | string[] | number | boolean;
}

const x: UpdateData = {
  'nama': 'jum',
  asa: 9090,
  tipe: ['s', 's'],
}

export type UpdateBody = {
  id: string;
  data: UpdateData;
}

export type TableProps = {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string;
  pk: number;
};