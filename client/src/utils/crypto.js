// Utility for End-to-End Encryption using Web Crypto API

// Helper to convert ArrayBuffer to Base64
const arrayBufferToBase64 = (buffer) => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

// Helper to convert Base64 to ArrayBuffer
const base64ToArrayBuffer = (base64) => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

// Generate an RSA-OAEP key pair
export const generateKeyPair = async () => {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt']
  );

  const publicKeyBuffer = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
  const privateKeyBuffer = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

  return {
    publicKeyBase64: arrayBufferToBase64(publicKeyBuffer),
    privateKeyBase64: arrayBufferToBase64(privateKeyBuffer),
  };
};

export const importPublicKey = async (publicKeyBase64) => {
  const buffer = base64ToArrayBuffer(publicKeyBase64);
  return window.crypto.subtle.importKey(
    'spki',
    buffer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    true,
    ['encrypt']
  );
};

export const importPrivateKey = async (privateKeyBase64) => {
  const buffer = base64ToArrayBuffer(privateKeyBase64);
  return window.crypto.subtle.importKey(
    'pkcs8',
    buffer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    true,
    ['decrypt']
  );
};

// Encrypt a message hybrid style: AES-GCM for the text, RSA for the AES key
export const encryptMessage = async (text, receiverPublicKeyBase64, myPublicKeyBase64) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);

  // 1. Generate a random AES-GCM key
  const aesKey = await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  // 2. Encrypt the data with AES-GCM
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encryptedContentBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    data
  );

  // 3. Export the AES key
  const rawAesKey = await window.crypto.subtle.exportKey('raw', aesKey);

  // 4. Encrypt the raw AES key with the receiver's valid RSA public key
  const rsaPubKeyInfo = await importPublicKey(receiverPublicKeyBase64);
  const encryptedKeyBuffer = await window.crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    rsaPubKeyInfo,
    rawAesKey
  );

  // 5. Encrypt the raw AES key with our own RSA public key
  let senderEncryptedKeyBuffer = null;
  if (myPublicKeyBase64) {
    const myPubKeyInfo = await importPublicKey(myPublicKeyBase64);
    senderEncryptedKeyBuffer = await window.crypto.subtle.encrypt(
      { name: 'RSA-OAEP' },
      myPubKeyInfo,
      rawAesKey
    );
  }

  return {
    encrypted_content: arrayBufferToBase64(encryptedContentBuffer),
    encrypted_key: arrayBufferToBase64(encryptedKeyBuffer),
    sender_encrypted_key: senderEncryptedKeyBuffer ? arrayBufferToBase64(senderEncryptedKeyBuffer) : null,
    iv: arrayBufferToBase64(iv),
  };
};

// Decrypt a message
export const decryptMessage = async (encrypted_content, encrypted_key, ivBase64, myPrivateKeyBase64) => {
  try {
    const encryptedContentBuffer = base64ToArrayBuffer(encrypted_content);
    const encryptedKeyBuffer = base64ToArrayBuffer(encrypted_key);
    const iv = new Uint8Array(base64ToArrayBuffer(ivBase64));

    // 1. Decrypt the AES key using our RSA private key
    const rsaPrivKeyInfo = await importPrivateKey(myPrivateKeyBase64);
    const rawAesKey = await window.crypto.subtle.decrypt(
      { name: 'RSA-OAEP' },
      rsaPrivKeyInfo,
      encryptedKeyBuffer
    );

    // 2. Import the AES key
    const aesKey = await window.crypto.subtle.importKey(
      'raw',
      rawAesKey,
      { name: 'AES-GCM' },
      true,
      ['decrypt']
    );

    // 3. Decrypt the content
    const decryptedContentBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      encryptedContentBuffer
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedContentBuffer);
  } catch (err) {
    console.error('Decryption failed', err);
    return '🔒 [Message encrypted with an older security key]';
  }
};
