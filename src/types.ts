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