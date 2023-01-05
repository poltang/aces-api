import { LOGIN_TYPE_ACES, LOGIN_TYPE_TENANT } from "./env";
import { Account } from "./store.types";

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

// const LoginType = LOGIN_TYPE_ACES || LOGIN_TYPE_TENANT

export type TenantSessionUser = Account & {
  loginType: 'aces' | 'tenant';
  ts: number;
}

type UpdateData = {
  [key: string]: string | string[] | number | boolean;
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