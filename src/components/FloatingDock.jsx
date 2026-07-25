import React, { useState } from 'react';
import { Plus, Users, FileSpreadsheet, Sun, Moon, Zap, BarChart2 } from 'lucide-react';
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
        zIndex: 400,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '10px',
      }}
    >
      {/* Speed Dial Menu */}
      {isOpen && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: '12px',
            background: 'var(--bg-elevated)',
            backdropFilter: 'var(--backdrop-blur)',
            border: '1px solid var(--glass-border-hover)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)'
          }}
        >
          <button
            onClick={() => { onOpenNewProduct(); setIsOpen(false); }}
            className="btn btn-primary btn-sm"
          >
            <Plus size={14} /> Yangi Tovar
          </button>

          <button
            onClick={() => { onOpenNewDebtor(); setIsOpen(false); }}
            className="btn btn-secondary btn-sm"
          >
            <Users size={14} /> Yangi Nasiya
          </button>

          <button
            onClick={() => { onTriggerExcelImport(); setIsOpen(false); }}
            className="btn btn-secondary btn-sm"
          >
            <FileSpreadsheet size={14} /> Excel Import
          </button>

          <button
            onClick={handleQuickReport}
            className="btn btn-secondary btn-sm"
          >
            <BarChart2 size={14} /> Telegram Hisobot
          </button>

          <button
            onClick={onToggleTheme}
            className="btn btn-secondary btn-sm"
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />} Mavzu ({theme === 'dark' ? 'Kunduzgi' : 'Tungi'})
          </button>
        </div>
      )}

      {/* Main Floating Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          border: '1px solid var(--gold-light)',
          background: 'linear-gradient(135deg, var(--gold) 0%, var(--accent) 100%)',
          color: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(212, 175, 55, 0.4)',
          transition: 'transform 0.2s ease'
        }}
        title="Tezkor amallar paneli"
      >
        <Zap size={22} style={{ color: '#000' }} />
      </button>
    </div>
  );
}
