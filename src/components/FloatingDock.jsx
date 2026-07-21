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
    toast.info("📊 23:00 da Telegram'ga avtomatik hisobot yuboriladi!", 4000);
  };

  return (
    <div className="floating-dock-container no-print">
      {/* 1. Yangi Tovar */}
      <button className="dock-item" onClick={onOpenNewProduct} title="Yangi Tovar Qo'shish">
        <span>➕</span>
        <span className="dock-tooltip">Yangi Tovar</span>
      </button>

      {/* 2. Yangi Nasiya */}
      <button className="dock-item" onClick={onOpenNewDebtor} title="Yangi Nasiya Bitimi">
        <span>📝</span>
        <span className="dock-tooltip">Yangi Nasiya</span>
      </button>

      {/* 3. Excel Import */}
      <button className="dock-item" onClick={onTriggerExcelImport} title="Excel-dan Yuklash">
        <span>📥</span>
        <span className="dock-tooltip">Excel Import</span>
      </button>

      {/* 4. Kunlik Hisobot */}
      <button className="dock-item" onClick={handleQuickReport} title="Hisobot Holati">
        <span>📊</span>
        <span className="dock-tooltip">23:00 Hisobot</span>
      </button>

      {/* 5. Theme Toggle Switcher */}
      <button className="dock-item" onClick={onToggleTheme} title="Tema Almashtirish">
        <span>{theme === 'light' ? '🌙' : '☀️'}</span>
        <span className="dock-tooltip">{theme === 'light' ? 'Tungi Rejim' : 'Kunduzgi Rejim'}</span>
      </button>
    </div>
  );
}
