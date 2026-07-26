import React, { useState } from 'react';
import { 
  Search, 
  Sun, 
  Moon, 
  RefreshCw, 
  DollarSign, 
  Send, 
  LogOut, 
  ChevronDown, 
  Store,
  Layers,
  Zap
} from 'lucide-react';

export default function Topbar({
  activeTab,
  currentStore,
  setCurrentStore,
  theme,
  onToggleTheme,
  rates,
  ratesLoading,
  ratesStatus,
  refreshRates,
  currency,
  onCurrencyChange,
  onOpenTelegramModal,
  onOpenCommandPalette,
  onClearMockData,
  onLogout,
  userRole = "Texno Bozor"
}) {
  const [isRateMenuOpen, setIsRateMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const formatBreadcrumb = (tab) => {
    switch (tab) {
      case 'dashboard': return 'Asosiy Panel';
      case 'sotuv': return 'Sotuv';
      case 'inventory': return 'Tovarlar Ombori';
      case 'sales': return 'Sotuvlar Tarixi';
      case 'expenses': return 'Harajatlar';
      case 'calculator': return 'Kredit Kalkulyator';
      case 'debtors': return 'Nasiya va Qarzlar';
      case 'analytics': return 'Tahlillar';
      default: return 'Boshqaruv Paneli';
    }
  };

  return (
    <header className="topbar">
      {/* Breadcrumbs */}
      <div className="breadcrumb-container">
        <span className="breadcrumb-item" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Store size={14} style={{ color: 'var(--brand-accent)' }} />
          Texno Moto CRM
        </span>
        <span>/</span>
        <span className="breadcrumb-item active">{formatBreadcrumb(activeTab)}</span>
      </div>

      {/* Center Command Palette Search Trigger */}
      <div className="topbar-search-trigger" onClick={onOpenCommandPalette} title="Qidiruv va buyruqlar (Cmd+K)">
        <Search size={14} />
        <span>Tezkor qidiruv...</span>
        <span className="cmd-key">⌘K</span>
      </div>

      {/* Right Side Actions */}
      <div className="topbar-actions">
        {/* Do'kon Switcher Pill */}
        <div style={{ display: 'flex', background: 'var(--bg-secondary)', padding: '2px', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)' }}>
          <button
            type="button"
            onClick={() => setCurrentStore('texno')}
            style={{
              padding: '4px 10px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: currentStore === 'texno' ? 'var(--brand-accent)' : 'transparent',
              color: currentStore === 'texno' ? '#ffffff' : 'var(--text-muted)',
              fontSize: '11px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.15s ease'
            }}
          >
            <Zap size={11} /> Texno
          </button>

          <button
            type="button"
            onClick={() => setCurrentStore('moto')}
            style={{
              padding: '4px 10px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: currentStore === 'moto' ? 'var(--neon-pink)' : 'transparent',
              color: currentStore === 'moto' ? '#ffffff' : 'var(--text-muted)',
              fontSize: '11px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.15s ease'
            }}
          >
            🏍️ Moto
          </button>

          <button
            type="button"
            onClick={() => setCurrentStore('all')}
            style={{
              padding: '4px 10px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: currentStore === 'all' ? 'var(--bg-tertiary)' : 'transparent',
              color: currentStore === 'all' ? 'var(--text-primary)' : 'var(--text-muted)',
              fontSize: '11px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.15s ease'
            }}
          >
            <Layers size={11} /> Barchasi
          </button>
        </div>

        {/* Live Dollar Exchange Rate Pill Widget */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setIsRateMenuOpen(!isRateMenuOpen)}
            style={{
              padding: '5px 10px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--card-border)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: ratesStatus === 'synced' ? 'var(--success)' : ratesStatus === 'syncing' ? 'var(--warning)' : 'var(--danger)'
            }} />
            <DollarSign size={13} style={{ color: 'var(--brand-gold)' }} />
            <span>$1 = {Math.round(rates.UZS || 12800).toLocaleString()} SO'M</span>
            <ChevronDown size={12} style={{ color: 'var(--text-muted)' }} />
          </button>

          {isRateMenuOpen && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              right: 0,
              width: '230px',
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              borderRadius: 'var(--radius-md)',
              padding: '12px',
              boxShadow: 'var(--shadow-lg)',
              zIndex: 500
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Valyuta Kurslari</span>
                <button
                  onClick={refreshRates}
                  disabled={ratesLoading}
                  style={{ background: 'none', border: 'none', color: 'var(--brand-accent)', cursor: 'pointer' }}
                >
                  <RefreshCw size={12} className={ratesLoading ? 'spin' : ''} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>🇺🇸 USD ($1)</span>
                  <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{Math.round(rates.UZS || 12800).toLocaleString()} SO'M</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>🇪🇺 EUR (€1)</span>
                  <span style={{ fontWeight: '600' }}>{Math.round((rates.UZS / rates.EUR) || 13500).toLocaleString()} SO'M</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span>🇷🇺 RUB (₽1)</span>
                  <span style={{ fontWeight: '600' }}>{Math.round((rates.UZS / rates.RUB) || 140).toLocaleString()} SO'M</span>
                </div>
              </div>

              <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--card-border)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Faol Valyuta:</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                  {['USD', 'UZS', 'EUR', 'RUB'].map((c) => (
                    <button
                      key={c}
                      onClick={() => { onCurrencyChange(c); setIsRateMenuOpen(false); }}
                      style={{
                        padding: '4px',
                        fontSize: '10px',
                        fontWeight: '700',
                        borderRadius: '4px',
                        border: 'none',
                        background: currency === c ? 'var(--brand-accent)' : 'var(--bg-secondary)',
                        color: currency === c ? '#fff' : 'var(--text-muted)',
                        cursor: 'pointer'
                      }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Telegram Button */}
        <button
          onClick={onOpenTelegramModal}
          title="Telegram Bot"
          style={{
            padding: '5px 10px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--card-border)',
            background: 'var(--bg-secondary)',
            color: 'var(--brand-accent)',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Send size={13} /> Bot
        </button>

        {/* Theme Switcher Toggle */}
        <button
          onClick={onToggleTheme}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--card-border)',
            background: 'var(--bg-secondary)',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* User Profile */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--brand-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: '700',
              fontSize: '13px'
            }}>
              A
            </div>
          </button>

          {isProfileOpen && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              right: 0,
              width: '160px',
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              borderRadius: 'var(--radius-md)',
              padding: '6px',
              boxShadow: 'var(--shadow-lg)',
              zIndex: 500
            }}>
              <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--card-border)', marginBottom: '4px' }}>
                <div style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-primary)' }}>Admin</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{userRole}</div>
              </div>
              {onClearMockData && (
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    onClearMockData();
                  }}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--warning)',
                    fontSize: '11.5px',
                    fontWeight: '600',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '4px'
                  }}
                >
                  🧹 Demo Ma'lumotlarni O'chirish
                </button>
              )}

              <button
                onClick={onLogout}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 8px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--danger)',
                  fontSize: '12px',
                  fontWeight: '600',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer'
                }}
              >
                <LogOut size={13} /> Chiqish
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
