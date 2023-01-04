export const /* Base64Data */ DEFAULT_PUBLIC_KEY = 'eyJrZXlfb3BzIjpbXSwiZXh0Ijp0cnVlLCJrdHkiOiJFQyIsIngiOiJ4T2RObFBsMFFsaU5Dand3a0R2UXl4Z3dJNmtLZGtuV25NbEJjdWhFMHZJIiwieSI6IlY2aFhzTTZDWHM4N0diNVFTNWF3cUlEWUt6eG9jMUN1VncwUTQ3MGo1blEiLCJjcnYiOiJQLTI1NiJ9';
export const /* Base64Data */ DEFAULT_PRIVATE_KEY = 'eyJrZXlfb3BzIjpbImRlcml2ZUtleSIsImRlcml2ZUJpdHMiXSwiZXh0Ijp0cnVlLCJrdHkiOiJFQyIsIngiOiJ4T2RObFBsMFFsaU5Dand3a0R2UXl4Z3dJNmtLZGtuV25NbEJjdWhFMHZJIiwieSI6IlY2aFhzTTZDWHM4N0diNVFTNWF3cUlEWUt6eG9jMUN1VncwUTQ3MGo1blEiLCJjcnYiOiJQLTI1NiIsImQiOiJ0UmZKZ2hBVndDOThrWVFDM0RhbXZYVjY3Mk5Wc0JLWmFMNHdRa3BYNW00In0=';

/*
  https://getstream.io/blog/web-crypto-api-chat/
  https://github.com/GetStream/encrypted-web-chat
*/

type KeyData = ArrayBuffer | JsonWebKey | ArrayBufferView

export const generateKeyPair = async () => {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true,
    ["deriveKey", "deriveBits"]
  ) as CryptoKeyPair;

  const publicKeyJwk = await crypto.subtle.exportKey(
    "jwk",
    keyPair.publicKey
  );

  const privateKeyJwk = await crypto.subtle.exportKey(
    "jwk",
    keyPair.privateKey
  );

  return { publicKeyJwk, privateKeyJwk };
};

// export const  deriveKey = async () => {
export const  deriveKey = async (publicKeyJwk?: KeyData, privateKeyJwk?: KeyData) => {
  let publicJwk = JSON.parse(atob(DEFAULT_PUBLIC_KEY));
  let privateJwk = JSON.parse(atob(DEFAULT_PRIVATE_KEY));

  if (publicKeyJwk && privateKeyJwk) {
    publicJwk = publicKeyJwk;
    privateJwk = privateKeyJwk;
  }

  const publicKey = await crypto.subtle.importKey(
    "jwk",
    publicJwk, // publicKeyJwk,
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true,
    []
  );

  const privateKey = await crypto.subtle.importKey(
    "jwk",
    privateJwk, // privateKeyJwk,
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true,
    ["deriveKey", "deriveBits"]
  );

  return await crypto.subtle.deriveKey(
    // @ts-ignore
    { name: "ECDH", public: publicKey },
    privateKey,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
};

// export const encrypt = async (text: string) => {
export const encrypt = async (text: string, derivedKey?: CryptoKey) => {
  const encodedText = new TextEncoder().encode(text);
  const key = derivedKey || await deriveKey();

  const encryptedData = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: new TextEncoder().encode("Initialization Vector") },
    key,
    encodedText
  );

  const uintArray = new Uint8Array(encryptedData);

  // @ts-ignore
  const string = String.fromCharCode.apply(null, uintArray);

  const base64Data = btoa(string);

  return base64Data;
};

// export const decrypt = async (text: string) => {
export const decrypt = async (text: string, derivedKey?: CryptoKey) => {
  const key =  derivedKey || await deriveKey();

  try {
    const string = atob(text);
    const uintArray = new Uint8Array(
      // @ts-ignore
      [...string].map((char) => char.charCodeAt(0))
    );
    const algorithm = {
      name: "AES-GCM",
      iv: new TextEncoder().encode("Initialization Vector"),
    };
    const decryptedData = await crypto.subtle.decrypt(
      algorithm,
      key,
      uintArray
    );

    return new TextDecoder().decode(decryptedData);
  } catch (e) {
    return `error decrypting message: ${e}`;
  }
};
