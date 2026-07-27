// Cryptographic security utility for Texno & Moto Bozor CRM

const SECRET_SALT = 'TB_CRM_SECURE_SALT_2026_V1';
const TARGET_HASH = 'e1d04334348d2f9bd3804a9e1424c5368174ae744ff654a5945ee3877cee63d7'; // 'Texnoilhom123'
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours session

// Default users seed
export const DEFAULT_USERS = [
  {
    username: 'admin',
    name: 'Administrator',
    role: 'admin',
    passwordHash: TARGET_HASH
  },
  {
    username: 'Texno555',
    name: 'Sotuvchi (Texno555)',
    role: 'employee',
    passwordHash: '8cb2237d0679ca88db6464eac60da96345513964ff025a17688006e8b4e724a2' // SHA-256 for 'Texno555'
  }
];

// SHA-256 hash helper
export const hashString = async (str) => {
  const utf8 = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', utf8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// Cryptographically signed session token generation
export const createSecureSession = async (userRole = 'admin', username = 'admin') => {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = `${username}:${userRole}:${expiresAt}:${SECRET_SALT}`;
  const signature = await hashString(payload);
  const sessionToken = btoa(JSON.stringify({ role: userRole, username, expiresAt, sig: signature }));

  sessionStorage.setItem('tb_auth_token', sessionToken);
  localStorage.setItem('tb_session_sig', signature);
  localStorage.setItem('tb_user_role', userRole);
  localStorage.setItem('tb_user_name', username);
  localStorage.setItem('is_logged_in', 'true');
  return sessionToken;
};

// Validate session token integrity & expiry
export const validateSecureSession = async () => {
  try {
    const token = sessionStorage.getItem('tb_auth_token');
    const storedSig = localStorage.getItem('tb_session_sig');
    const isLogged = localStorage.getItem('is_logged_in');

    if (!token || !storedSig || isLogged !== 'true') return { valid: false, role: 'admin', username: 'Guest' };

    const parsed = JSON.parse(atob(token));
    if (!parsed || !parsed.expiresAt || !parsed.sig || !parsed.role) return { valid: false, role: 'admin', username: 'Guest' };

    if (Date.now() > parsed.expiresAt) {
      clearSecureSession();
      return { valid: false, role: 'admin', username: 'Guest' };
    }

    const expectedPayload = `${parsed.username || 'admin'}:${parsed.role}:${parsed.expiresAt}:${SECRET_SALT}`;
    const expectedSig = await hashString(expectedPayload);

    if (parsed.sig !== expectedSig || storedSig !== expectedSig) {
      console.warn('⚠️ Xavfsizlik ogohlantirishi: Sessiya manipulyatsiyasi aniqlandi!');
      clearSecureSession();
      return { valid: false, role: 'admin', username: 'Guest' };
    }

    return { valid: true, role: parsed.role, username: parsed.username || 'admin' };
  } catch (_e) {
    clearSecureSession();
    return { valid: false, role: 'admin', username: 'Guest' };
  }
};

// Clear session
export const clearSecureSession = () => {
  sessionStorage.removeItem('tb_auth_token');
  localStorage.removeItem('tb_session_sig');
  localStorage.removeItem('tb_user_role');
  localStorage.removeItem('tb_user_name');
  localStorage.removeItem('is_logged_in');
};

// User management helpers
export const getUsers = () => {
  const saved = localStorage.getItem('tb_users_db');
  if (saved) {
    try { return JSON.parse(saved); } catch (_e) { return DEFAULT_USERS; }
  }
  return DEFAULT_USERS;
};

export const saveUser = (userObj) => {
  const users = getUsers();
  const index = users.findIndex(u => u.username.toLowerCase() === userObj.username.toLowerCase());
  if (index >= 0) {
    users[index] = { ...users[index], ...userObj };
  } else {
    users.push(userObj);
  }
  localStorage.setItem('tb_users_db', JSON.stringify(users));
  return users;
};

export const deleteUser = (username) => {
  let users = getUsers();
  users = users.filter(u => u.username.toLowerCase() !== username.toLowerCase());
  localStorage.setItem('tb_users_db', JSON.stringify(users));
  return users;
};

// Obfuscate / encrypt sensitive strings
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
  } catch (_e) {
    return encoded;
  }
};

export { TARGET_HASH };
