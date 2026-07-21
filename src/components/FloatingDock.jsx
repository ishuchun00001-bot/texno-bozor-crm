import React from 'react';
import { useToast } from './Toast';

export default function FloatingDock({
  onOpenNewProduct,
  onOpenNewDebtor,
  onTriggerExcelImport,
  onNavigateTab,
  theme,
  onToggleTheme,
}) {
  const toast = useToast();

  const handleQuickReport = () => {
    toast.info("📊 Har kuni soat 23:00 da Telegram'ga avtomatik hisobot yuboriladi!", 4000);
  };

  return (
    <div
      className="floating-dock-container no-print"
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        background: theme === 'light' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: theme === 'light' ? '1px solid rgba(0, 0, 0, 0.12)' : '1px solid rgba(0, 242, 254, 0.25)',
        borderRadius: '30px',
        boxShadow: theme === 'light' ? '0 10px 30px rgba(0, 0, 0, 0.15)' : '0 10px 30px rgba(0, 0, 0, 0.6), 0 0 20px rgba(0, 242, 254, 0.15)',
        flexDirection: 'row',
        flexWrap: 'nowrap',
        whiteSpace: 'nowrap',
      }}
    >
      {/* 1. Yangi Tovar */}
      <button
        onClick={onOpenNewProduct}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '7px 14px',
          borderRadius: '20px',
          border: 'none',
          background: 'linear-gradient(135deg, var(--neon-blue), var(--neon-purple))',
          color: '#fff',
          fontSize: '12px',
          fontWeight: '700',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0, 242, 254, 0.25)',
          whiteSpace: 'nowrap',
        }}
      >
        ➕ Yangi Tovar
      </button>

      {/* 2. Yangi Nasiya */}
      <button
        onClick={onOpenNewDebtor}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '7px 14px',
          borderRadius: '20px',
          border: 'none',
          background: 'linear-gradient(135deg, var(--neon-purple), var(--neon-pink))',
          color: '#fff',
          fontSize: '12px',
          fontWeight: '700',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(155, 93, 229, 0.25)',
          whiteSpace: 'nowrap',
        }}
      >
        📝 Yangi Nasiya
      </button>

      {/* 3. Excel Import */}
      <button
        onClick={onTriggerExcelImport}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '7px 14px',
          borderRadius: '20px',
          border: theme === 'light' ? '1px solid rgba(0,0,0,0.15)' : '1px solid rgba(255,255,255,0.15)',
          background: theme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)',
          color: 'var(--text-primary)',
          fontSize: '12px',
          fontWeight: '600',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        📥 Excel
      </button>

      {/* 4. 23:00 Hisobot */}
      <button
        onClick={handleQuickReport}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '7px 14px',
          borderRadius: '20px',
          border: theme === 'light' ? '1px solid rgba(0,0,0,0.15)' : '1px solid rgba(255,255,255,0.15)',
          background: theme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)',
          color: 'var(--text-primary)',
          fontSize: '12px',
          fontWeight: '600',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        📊 23:00 Hisobot
      </button>

      {/* 5. Theme Switcher */}
      <button
        onClick={onToggleTheme}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '7px 14px',
          borderRadius: '20px',
          border: '1px solid var(--neon-green)',
          background: 'rgba(0, 245, 212, 0.15)',
          color: 'var(--neon-green)',
          fontSize: '12px',
          fontWeight: '700',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        {theme === 'light' ? '🌙 Tungi Rejim' : '☀️ Kunduzgi Rejim'}
      </button>
    </div>
  );
}
