// TEXNO BOZOR ERP V2 — ROLE-BASED ACCESS CONTROL (RBAC)

export const ROLES = {
  ADMIN: 'admin',
  EMPLOYEE: 'employee'
};

export const ROLE_LABELS = {
  admin: 'Administrator',
  employee: 'Sotuvchi'
};

export const ALLOWED_MODULES_BY_ROLE = {
  admin: [
    'dashboard',
    'sotuv',
    'inventory',
    'sales',
    'expenses',
    'calculator',
    'debtors',
    'analytics',
    'settings',
    'users',
    'reports',
    'currency'
  ],
  employee: [
    'sotuv',
    'inventory',
    'calculator',
    'debtors'
  ]
};

export const hasPermission = (role = ROLES.ADMIN, moduleName) => {
  if (!moduleName) return true;
  if (role === ROLES.ADMIN) return true;
  const allowed = ALLOWED_MODULES_BY_ROLE[role] || ALLOWED_MODULES_BY_ROLE.employee;
  return allowed.includes(moduleName);
};

export const getInitialTabForRole = (role = ROLES.ADMIN) => {
  if (role === ROLES.EMPLOYEE) {
    return 'sotuv';
  }
  return 'dashboard';
};
