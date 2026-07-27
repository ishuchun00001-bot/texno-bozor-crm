// TEXNO BOZOR ERP V2 — AUDIT LOGGING SERVICE

import { supabase, isSupabaseConfigured } from '../supabaseClient';

export const logAuditEvent = async ({ user = 'Admin', role = 'admin', action = '', details = '' }) => {
  const logEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    username: user,
    role: role,
    action: action,
    details: details,
    timestamp: new Date().toISOString()
  };

  try {
    let localLogs = JSON.parse(localStorage.getItem('tb_audit_logs') || '[]');
    localLogs.unshift(logEntry);
    if (localLogs.length > 200) localLogs = localLogs.slice(0, 200);
    localStorage.setItem('tb_audit_logs', JSON.stringify(localLogs));

    if (isSupabaseConfigured()) {
      await supabase.from('audit_logs').insert([{
        username: user,
        role: role,
        action: action,
        details: details,
        created_at: logEntry.timestamp
      }]);
    }
  } catch (err) {
    console.warn('Audit log saving warning:', err);
  }

  return logEntry;
};

export const getAuditLogs = async () => {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && data) return data;
    } catch (e) {
      console.warn('Error fetching audit logs from Supabase:', e);
    }
  }

  return JSON.parse(localStorage.getItem('tb_audit_logs') || '[]');
};
