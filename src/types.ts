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

export interface BaseSessionUser {
  username: string;

}
