import React, { useState } from 'react';
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
  const [isOpen, setIsOpen] = useState(false);

  const handleQuickReport = () => {
    toast.info("📊 Har kuni soat 23:00 da Telegram'ga avtomatik hisobot yuboriladi!", 4000);
  };

  return (
    <div
      className="floating-dock-container no-print"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      style={{
        position: 'fixed',
        bottom: '28px',
        right: '28px',
        left: 'auto',
        transform: 'none',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '10px',
      }}
    >
      {/* Expanded Actions Popover Menu */}
      {isOpen && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: '12px',
            background: theme === 'light' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(10, 14, 26, 0.95)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(212, 175, 55, 0.25)',
            borderRadius: '18px',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.7), 0 0 30px rgba(212, 175, 55, 0.15)',
            animation: 'speedDialIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) both',
          }}
        >
          {/* 1. Yangi Tovar */}
          <button
            onClick={() => { onOpenNewProduct(); setIsOpen(false); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 16px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, var(--gold) 0%, #b8941f 100%)',
              color: '#000',
              fontSize: '12.5px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(212, 175, 55, 0.3)',
              whiteSpace: 'nowrap',
              transition: 'transform 0.2s',
            }}
          >
            ➕ Yangi Tovar
          </button>

          {/* 2. Yangi Nasiya */}
          <button
            onClick={() => { onOpenNewDebtor(); setIsOpen(false); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 16px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'var(--text-primary)',
              fontSize: '12.5px',
              fontWeight: '600',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s',
            }}
          >
            📝 Yangi Nasiya
          </button>

          {/* 3. Excel Import */}
          <button
            onClick={() => { onTriggerExcelImport(); setIsOpen(false); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 16px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'var(--text-primary)',
              fontSize: '12.5px',
              fontWeight: '600',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s',
            }}
          >
            📥 Excel Import
          </button>

          {/* 4. 23:00 Hisobot */}
          <button
            onClick={() => { handleQuickReport(); setIsOpen(false); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 16px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'var(--text-primary)',
              fontSize: '12.5px',
              fontWeight: '600',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s',
            }}
          >
            📊 23:00 Telegram Hisobot
          </button>

          {/* 5. Theme Switcher */}
          <button
            onClick={onToggleTheme}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 16px',
              borderRadius: '12px',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              background: 'rgba(16, 185, 129, 0.12)',
              color: 'var(--success)',
              fontSize: '12.5px',
              fontWeight: '700',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s',
            }}
          >
            {theme === 'light' ? '🌙 Tungi Rejim' : '☀️ Kunduzgi Rejim'}
          </button>
        </div>
      )}

      {/* Main Trigger Floating Action Button (FAB) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 20px',
          borderRadius: '30px',
          border: '1px solid rgba(212, 175, 55, 0.35)',
          background: 'linear-gradient(135deg, rgba(20, 26, 44, 0.95) 0%, rgba(8, 12, 24, 0.95) 100%)',
          color: 'var(--gold)',
          fontSize: '13px',
          fontWeight: '700',
          cursor: 'pointer',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.7), 0 0 20px rgba(212, 175, 55, 0.2)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          transition: 'all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        }}
      >
        <span style={{
          display: 'inline-flex',
          transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
          transition: 'transform 0.25s ease',
          fontSize: '16px'
        }}>
          ⚡
        </span>
        <span>{isOpen ? 'Yopish' : 'Tezkor Harakatlar'}</span>
      </button>

      <style>{`
        @keyframes speedDialIn {
          from { opacity: 0; transform: translateY(12px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
