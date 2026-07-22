// Cryptographic security utility for Texno & Moto Bozor CRM

const SECRET_SALT = 'TB_CRM_SECURE_SALT_2026_V1';
const TARGET_HASH = 'e1d04334348d2f9bd3804a9e1424c5368174ae744ff654a5945ee3877cee63d7'; // 'Texnoilhom123'
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours session

// SHA-256 hash helper
export const hashString = async (str) => {
  const utf8 = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', utf8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// Cryptographically signed session token generation
export const createSecureSession = async (userRole = 'admin') => {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = `${userRole}:${expiresAt}:${SECRET_SALT}`;
  const signature = await hashString(payload);
  const sessionToken = btoa(JSON.stringify({ role: userRole, expiresAt, sig: signature }));

  sessionStorage.setItem('tb_auth_token', sessionToken);
  localStorage.setItem('tb_session_sig', signature);
  localStorage.setItem('is_logged_in', 'true');
  return sessionToken;
};

// Validate session token integrity & expiry
export const validateSecureSession = async () => {
  try {
    const token = sessionStorage.getItem('tb_auth_token');
    const storedSig = localStorage.getItem('tb_session_sig');
    const isLogged = localStorage.getItem('is_logged_in');

    if (!token || !storedSig || isLogged !== 'true') return false;

    const parsed = JSON.parse(atob(token));
    if (!parsed || !parsed.expiresAt || !parsed.sig || !parsed.role) return false;

    // 1. Check expiration
    if (Date.now() > parsed.expiresAt) {
      clearSecureSession();
      return false;
    }

    // 2. Re-verify signature to prevent tampering/DevTools manipulation
    const expectedPayload = `${parsed.role}:${parsed.expiresAt}:${SECRET_SALT}`;
    const expectedSig = await hashString(expectedPayload);

    if (parsed.sig !== expectedSig || storedSig !== expectedSig) {
      console.warn('⚠️ Xavfsizlik ogohlantirishi: Noqonuniy sessiya manipulyatsiyasi aniqlandi!');
      clearSecureSession();
      return false;
    }

    return true;
  } catch (e) {
    clearSecureSession();
    return false;
  }
};

// Clear session
export const clearSecureSession = () => {
  sessionStorage.removeItem('tb_auth_token');
  localStorage.removeItem('tb_session_sig');
  localStorage.removeItem('is_logged_in');
};

// Obfuscate / encrypt sensitive strings (e.g. Telegram Bot Tokens)
export const obfuscateSecret = (text) => {
  if (!text) return '';
  return btoa(text.split('').map((char, i) => 
    String.fromCharCode(char.charCodeAt(0) ^ SECRET_SALT.charCodeAt(i % SECRET_SALT.length))
  ).join(''));
};

export const deobfuscateSecret = (encoded) => {
  if (!encoded) return '';
  try {
    const decoded = atob(encoded);
    return decoded.split('').map((char, i) => 
      String.fromCharCode(char.charCodeAt(0) ^ SECRET_SALT.charCodeAt(i % SECRET_SALT.length))
    ).join('');
  } catch (e) {
    return encoded;
  }
};

export { TARGET_HASH };
