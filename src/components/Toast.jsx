import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const ToastContext = createContext(null);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, leaving: true } : t));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 400);
  }, []);

  const showToast = useCallback((message, type = 'success', duration = 3500) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type, leaving: false }]);
    setTimeout(() => removeToast(id), duration);
    return id;
  }, [removeToast]);

  const toast = {
    success: (msg, dur) => showToast(msg, 'success', dur),
    error: (msg, dur) => showToast(msg, 'error', dur || 5000),
    warning: (msg, dur) => showToast(msg, 'warning', dur),
    info: (msg, dur) => showToast(msg, 'info', dur),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

const ICONS = {
  success: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  error: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="15" y1="9" x2="9" y2="15"/>
      <line x1="9" y1="9" x2="15" y2="15"/>
    </svg>
  ),
  warning: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  info: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="16" x2="12" y2="12"/>
      <line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
  ),
};

const COLORS = {
  success: { bg: 'rgba(0, 245, 212, 0.12)', border: 'rgba(0, 245, 212, 0.4)', icon: '#00f5d4', bar: '#00f5d4' },
  error:   { bg: 'rgba(255, 56, 96, 0.12)',  border: 'rgba(255, 56, 96, 0.4)',  icon: '#ff3860', bar: '#ff3860' },
  warning: { bg: 'rgba(254, 228, 64, 0.12)', border: 'rgba(254, 228, 64, 0.4)', icon: '#fee440', bar: '#fee440' },
  info:    { bg: 'rgba(0, 242, 254, 0.12)',  border: 'rgba(0, 242, 254, 0.4)',  icon: '#00f2fe', bar: '#00f2fe' },
};

function ToastItem({ toast, onRemove }) {
  const c = COLORS[toast.type] || COLORS.info;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '14px 16px',
        borderRadius: '14px',
        background: c.bg,
        border: `1px solid ${c.border}`,
        backdropFilter: 'blur(20px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        minWidth: '280px',
        maxWidth: '380px',
        position: 'relative',
        overflow: 'hidden',
        animation: toast.leaving
          ? 'toastLeave 0.4s cubic-bezier(0.4,0,1,1) forwards'
          : 'toastEnter 0.4s cubic-bezier(0,0,0.2,1) forwards',
        cursor: 'pointer',
      }}
      onClick={() => onRemove(toast.id)}
    >
      {/* Progress bar */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        height: '3px',
        background: c.bar,
        borderRadius: '0 0 0 14px',
        animation: 'toastProgress 3.5s linear forwards',
        width: '100%',
        transformOrigin: 'left',
      }} />

      {/* Icon */}
      <div style={{ color: c.icon, flexShrink: 0, marginTop: '1px' }}>
        {ICONS[toast.type]}
      </div>

      {/* Message */}
      <div style={{
        fontSize: '13px',
        lineHeight: '1.5',
        color: '#f8fafc',
        fontWeight: '500',
        flex: 1,
      }}>
        {toast.message}
      </div>

      {/* Close */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(toast.id); }}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'rgba(255,255,255,0.4)',
          cursor: 'pointer',
          fontSize: '16px',
          padding: '0',
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}

function ToastContainer({ toasts, onRemove }) {
  return (
    <>
      <style>{`
        @keyframes toastEnter {
          from { opacity: 0; transform: translateX(120%) scale(0.9); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes toastLeave {
          from { opacity: 1; transform: translateX(0) scale(1); max-height: 120px; margin-bottom: 8px; }
          to   { opacity: 0; transform: translateX(120%) scale(0.9); max-height: 0; margin-bottom: 0; padding: 0; }
        }
        @keyframes toastProgress {
          from { transform: scaleX(1); }
          to   { transform: scaleX(0); }
        }
      `}</style>
      <div style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 999999,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        alignItems: 'flex-end',
        pointerEvents: 'none',
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{ pointerEvents: 'all' }}>
            <ToastItem toast={t} onRemove={onRemove} />
          </div>
        ))}
      </div>
    </>
  );
}
