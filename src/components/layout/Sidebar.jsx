import React from 'react';
import { 
  LayoutDashboard, 
  ShoppingCart,
  Package, 
  Receipt, 
  Calculator, 
  Users, 
  Wallet,
  BarChart3, 
  Send, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';

import { hasPermission } from '../../utils/rbac';

export default function Sidebar({
  activeTab,
  setActiveTab,
  isCollapsed,
  setIsCollapsed,
  onOpenTelegramModal,
  userRole = 'admin'
}) {
  const allMenuItems = [
    { id: 'dashboard', label: 'Asosiy Panel', icon: LayoutDashboard },
    { id: 'sotuv', label: 'Sotuv', icon: ShoppingCart },
    { id: 'inventory', label: 'Tovarlar Ombori', icon: Package },
    { id: 'sales', label: 'Sotuvlar Tarixi', icon: Receipt },
    { id: 'expenses', label: 'Harajatlar', icon: Wallet },
    { id: 'calculator', label: 'Kredit Kalkulyator', icon: Calculator },
    { id: 'debtors', label: 'Nasiya va Qarzlar', icon: Users },
    { id: 'analytics', label: 'Tahlillar', icon: BarChart3 }
  ];

  const menuItems = allMenuItems.filter(item => hasPermission(userRole, item.id));

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''} no-print`}>
      <div>
        {/* Brand Logo Header */}
        <div className="sidebar-logo">
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '8px',
            overflow: 'hidden',
            flexShrink: 0,
            background: '#050810'
          }}>
            <img
              src="/logo.png"
              alt="Texno Moto Bozor"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          </div>

          {!isCollapsed && (
            <div style={{ lineHeight: 1.2 }}>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: '13px',
                fontWeight: '800',
                color: 'var(--text-primary)'
              }}>TEXNO MOTO</div>
              <div style={{
                fontSize: '9.5px',
                color: 'var(--text-muted)',
                fontWeight: '600',
                letterSpacing: '1px'
              }}>BOZOR CRM</div>
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <ul className="sidebar-menu">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <li
                key={item.id}
                className={`sidebar-item ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id)}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon size={17} />
                {!isCollapsed && <span>{item.label}</span>}
              </li>
            );
          })}

          {/* Telegram Action Item (Admin only) */}
          {userRole === 'admin' && (
            <li
              className="sidebar-item"
              onClick={onOpenTelegramModal}
              style={{ color: 'var(--brand-accent)' }}
              title={isCollapsed ? "Telegram Bot" : undefined}
            >
              <Send size={17} />
              {!isCollapsed && <span>Telegram Bot</span>}
            </li>
          )}
        </ul>
      </div>

      {/* Collapse Toggle Footer */}
      <div style={{ paddingTop: '12px', borderTop: '1px solid var(--card-border)', display: 'flex', justifyContent: isCollapsed ? 'center' : 'flex-end' }}>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          style={{
            background: 'transparent',
            border: '1px solid var(--card-border)',
            color: 'var(--text-muted)',
            borderRadius: 'var(--radius-sm)',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
          title={isCollapsed ? "Menyuni kengaytirish" : "Menyuni yig'ish"}
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>
    </aside>
  );
}
