import React, { useState, useEffect } from 'react';
import { Search, X, Package, Users, Receipt, Calculator, BarChart3, ArrowRight } from 'lucide-react';
import { hasPermission } from '../../utils/rbac';

export default function CommandPalette({
  isOpen,
  onClose,
  products = [],
  onNavigateTab,
  userRole = 'admin'
}) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery('');
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredProducts = products
    .filter(p => p && p.name && p.name.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 5);

  const allQuickNav = [
    { label: "Asosiy Panelga o'tish", tab: 'dashboard', icon: BarChart3 },
    { label: "Sotuvga o'tish", tab: 'sotuv', icon: Package },
    { label: "Tovarlar Omboriga o'tish", tab: 'inventory', icon: Package },
    { label: "Sotuvlar Tarixiga o'tish", tab: 'sales', icon: Receipt },
    { label: "Kredit Kalkulyatoriga o'tish", tab: 'calculator', icon: Calculator },
    { label: "Nasiyachilarga o'tish", tab: 'debtors', icon: Users }
  ];

  const quickNav = allQuickNav
    .filter(item => hasPermission(userRole, item.tab))
    .filter(item => item.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '620px', padding: 0, overflow: 'hidden' }}
      >
        {/* Search Input Field */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--card-border)', gap: '12px' }}>
          <Search size={18} style={{ color: 'var(--gold)' }} />
          <input
            type="text"
            placeholder="Tovarlar, nasiyachilar yoki buyruqlarni qidirish..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: '15px',
              outline: 'none'
            }}
          />
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Results Stream */}
        <div style={{ maxHeight: '360px', overflowY: 'auto', padding: '12px' }}>
          {query.trim() === '' && (
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', padding: '6px 10px' }}>
              Tezkor Navigatsiya
            </div>
          )}

          {quickNav.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.tab}
                onClick={() => {
                  onNavigateTab(item.tab);
                  onClose();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  fontSize: '13.5px',
                  transition: 'background 0.15s ease'
                }}
                className="command-item"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Icon size={16} style={{ color: 'var(--accent-light)' }} />
                  <span>{item.label}</span>
                </div>
                <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
              </div>
            );
          })}

          {filteredProducts.length > 0 && (
            <>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', padding: '12px 10px 6px 10px' }}>
                Topilgan Tovarlar
              </div>
              {filteredProducts.map((prod) => (
                <div
                  key={prod.id}
                  onClick={() => {
                    onNavigateTab('inventory');
                    onClose();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                    fontSize: '13.5px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Package size={16} style={{ color: 'var(--gold)' }} />
                    <div>
                      <div style={{ fontWeight: '600' }}>{prod.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Qoldiq: {prod.quantity} ta</div>
                    </div>
                  </div>
                  <div style={{ fontWeight: '700', color: 'var(--gold-light)' }}>
                    ${parseFloat(prod.price_usd || 0).toLocaleString()}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
