import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import SalesHistory from './components/SalesHistory';
import Debtors from './components/Debtors';
import CreditCalculator from './components/CreditCalculator';
import Analytics from './components/Analytics';
import TelegramSettingsModal from './components/TelegramSettingsModal';
import FloatingDock from './components/FloatingDock';
import { ToastProvider, useToast } from './components/Toast';

import { supabase, isSupabaseConfigured } from './supabaseClient';
import { mockProducts, generateMockSales } from './utils/mockData';
import { DEFAULT_RATES, fetchExchangeRates } from './utils/currency';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    localStorage.removeItem('local_products');
    localStorage.removeItem('local_sales');
    localStorage.removeItem('local_sale_items');
    localStorage.removeItem('local_db_seeded');
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '20px',
          background: '#07080f',
          color: '#fff',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚡ Texno Bozor CRM</div>
          <h2 style={{ fontSize: '22px', marginBottom: '12px', color: 'var(--neon-red, #ff3860)' }}>
            Tizim keshida vaqtinchalik ziddiyat aniqlandi
          </h2>
          <p style={{ color: '#94a3b8', maxWidth: '500px', marginBottom: '24px', fontSize: '14px', lineHeight: '1.6' }}>
            Do'konlar keshi va ma'lumotlarni qayta tiklash hamda tizimni avtomatik ishga tushirish uchun quyidagi tugmani bosing:
          </p>
          <button
            onClick={this.handleReset}
            style={{
              padding: '14px 32px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)',
              color: '#000',
              fontWeight: 'bold',
              fontSize: '15px',
              cursor: 'pointer',
              boxShadow: '0 10px 30px rgba(0, 242, 254, 0.4)'
            }}
          >
            🔄 Tizimni Qayta Tiklash
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [currentStore, setCurrentStore] = useState('all'); // 'all', 'texno', 'moto'
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'inventory', 'sales', 'debtors', 'calculator', 'analytics'
  const [theme, setTheme] = useState(() => localStorage.getItem('app_theme') || 'dark');
  const [rates, setRates] = useState(DEFAULT_RATES);
  const [currency, setCurrency] = useState('USD'); // 'USD', 'UZS', 'RUB', 'EUR'
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesStatus, setRatesStatus] = useState('syncing'); // 'syncing', 'synced', 'error'
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);

  // Theme almashtirish handler
  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('app_theme', nextTheme);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  
  // Ma'lumotlar bazasi holati (State)
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [saleItems, setSaleItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState('');

  // Login va Valyuta kurslari holatini tekshirish
  useEffect(() => {
    const loggedIn = localStorage.getItem('is_logged_in') === 'true';
    if (loggedIn) {
      setIsAuthenticated(true);
    }
    const savedCurrency = localStorage.getItem('active_currency');
    if (savedCurrency) {
      setCurrency(savedCurrency);
    }

    const loadRates = async () => {
      setRatesLoading(true);
      setRatesStatus('syncing');
      
      // LocalStorage dan yuklash
      const savedRatesStr = localStorage.getItem('exchange_rates');
      if (savedRatesStr) {
        try {
          setRates(JSON.parse(savedRatesStr));
        } catch (e) {
          console.error(e);
        }
      }

      try {
        const fetchedRates = await fetchExchangeRates();
        setRates(fetchedRates);
        localStorage.setItem('exchange_rates', JSON.stringify(fetchedRates));
        setRatesStatus('synced');
      } catch (err) {
        console.warn("Kurslarni yuklashda xatolik. Avvalgi kurslar saqlanadi:", err.message);
        setRatesStatus('error');
      } finally {
        setRatesLoading(false);
      }
    };

    loadRates();
  }, []);

  const handleLoginSuccess = () => {
    localStorage.setItem('is_logged_in', 'true');
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('is_logged_in');
    setIsAuthenticated(false);
  };

  const handleRateChange = (currKey, valInUZS) => {
    const val = parseFloat(valInUZS) || 0;
    if (val <= 0) return;

    setRates(prev => {
      const updated = { ...prev };
      if (currKey === 'USD') {
        updated.UZS = val;
      } else {
        // EUR yoki RUB rate nisbati: USD_to_UZS / CURR_to_UZS
        updated[currKey] = prev.UZS / val;
      }
      localStorage.setItem('exchange_rates', JSON.stringify(updated));
      return updated;
    });
  };

  const refreshRates = async () => {
    setRatesLoading(true);
    setRatesStatus('syncing');
    try {
      const fetchedRates = await fetchExchangeRates();
      setRates(fetchedRates);
      localStorage.setItem('exchange_rates', JSON.stringify(fetchedRates));
      setRatesStatus('synced');
    } catch (err) {
      alert("Valyuta kurslarini yangilashda xatolik yuz berdi: " + err.message);
      setRatesStatus('error');
    } finally {
      setRatesLoading(false);
    }
  };

  const handleCurrencyChange = (cur) => {
    setCurrency(cur);
    localStorage.setItem('active_currency', cur);
  };

  // LocalStorage dan yuklash
  const loadLocalStorageData = () => {
    let localProds = [];
    let localSales = [];
    let localItems = [];

    try {
      localProds = JSON.parse(localStorage.getItem('local_products') || '[]');
      localSales = JSON.parse(localStorage.getItem('local_sales') || '[]');
      localItems = JSON.parse(localStorage.getItem('local_sale_items') || '[]');
    } catch (e) {
      console.error("LocalStorage parse error:", e);
    }

    // Agar Moto tovarlari bo'lmasa yoki ro'yxat bo'sh bo'lsa, yangidan seed qilish
    const hasMoto = Array.isArray(localProds) && localProds.some(p => p && p.store_type === 'moto');
    if (!hasMoto || localProds.length === 0) {
      const mockSalesData = generateMockSales();
      localProds = [...mockProducts];
      localSales = mockSalesData.sales;
      localItems = mockSalesData.items;

      localStorage.setItem('local_products', JSON.stringify(localProds));
      localStorage.setItem('local_sales', JSON.stringify(localSales));
      localStorage.setItem('local_sale_items', JSON.stringify(localItems));
      localStorage.setItem('local_db_seeded', 'true');
    }

    setProducts(localProds);
    setSales(localSales);
    setSaleItems(localItems);
  };

  // Ma'lumotlarni yuklash (Supabase yoki LocalStorage)
  const fetchData = async () => {
    setLoading(true);
    try {
      if (isSupabaseConfigured()) {
        try {
          // 1. Supabase-dan yuklash
          const { data: prods, error: err1 } = await supabase.from('products').select('*').order('created_at', { ascending: false });
          const { data: sls, error: err2 } = await supabase.from('sales').select('*').order('created_at', { ascending: false });
          const { data: items, error: err3 } = await supabase.from('sale_items').select('*');

          if (err1 || err2 || err3) throw err1 || err2 || err3;

          setProducts(prods || []);
          setSales(sls || []);
          setSaleItems(items || []);
          setDbError(''); // Xatolik yo'q
        } catch (supabaseErr) {
          console.warn('Supabase-dan yuklashda xatolik yuz berdi. Lokal rejimga o\'tiladi:', supabaseErr.message);
          setDbError('Supabase ma\'lumotlar bazasida xatolik (Jadvallar topilmadi yoki ulanish uzildi). Tizim vaqtinchalik lokal (Offline) rejimda ishlamoqda. Iltimos, SQL scriptini Supabase-da ishga tushiring.');
          loadLocalStorageData();
        }
      } else {
        // Supabase sozlanmagan bo'lsa
        loadLocalStorageData();
      }
    } catch (error) {
      console.error('Ma\'lumotlarni yuklashda umumiy xatolik:', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Kirgandan keyin va refresh tugmasi bosilganda ma'lumotlarni yuklash
  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  // Tanlangan do'kon bo'yicha ma'lumotlarni filtrlash
  const filteredProducts = (products || []).filter(p => p && (currentStore === 'all' || (p.store_type || 'texno') === currentStore));
  const filteredSales = (sales || []).filter(s => s && (currentStore === 'all' || (s.store_type || 'texno') === currentStore));

  // Tab bo'yicha tegishli sahifani tanlash
  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            products={filteredProducts}
            sales={filteredSales}
            saleItems={saleItems}
            loading={loading}
            rates={rates}
            currency={currency}
            currentStore={currentStore}
          />
        );
      case 'inventory':
        return (
          <Inventory
            products={filteredProducts}
            onRefresh={fetchData}
            loading={loading}
            rates={rates}
            currency={currency}
            currentStore={currentStore}
          />
        );
      case 'sales':
        return (
          <SalesHistory
            sales={filteredSales}
            saleItems={saleItems}
            products={products}
            onRefresh={fetchData}
            rates={rates}
            currency={currency}
            currentStore={currentStore}
          />
        );
      case 'calculator':
        return (
          <CreditCalculator
            products={filteredProducts}
            rates={rates}
            currency={currency}
            currentStore={currentStore}
          />
        );
      case 'debtors':
        return (
          <Debtors
            products={filteredProducts}
            rates={rates}
            currency={currency}
            currentStore={currentStore}
          />
        );
      case 'analytics':
        return (
          <Analytics
            products={filteredProducts}
            sales={filteredSales}
            saleItems={saleItems}
            onRefresh={fetchData}
            rates={rates}
            currency={currency}
            currentStore={currentStore}
          />
        );
      default:
        return <Dashboard products={filteredProducts} sales={filteredSales} loading={loading} rates={rates} currency={currency} currentStore={currentStore} />;
    }
  };

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="app-container">
      {/* Background glowing bubbles */}
      <div className="ambient-glow glow-1"></div>
      <div className="ambient-glow glow-2"></div>
      <div className="ambient-glow glow-3"></div>

      {/* Sidebar Navigatsiya */}
      <aside className="sidebar no-print">
        <div>
          <div className="sidebar-logo">
            <span>⚡ Texno & 🏍️ Moto</span>
          </div>

          {/* Do'kon Almashtirgich (Store Switcher) */}
          <div style={{ padding: '0 12px 14px 12px', borderBottom: '1px solid var(--card-border)', marginBottom: '14px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Bo'lim / Do'kon:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setCurrentStore('texno')}
                style={{
                  padding: '7px 4px',
                  borderRadius: '8px',
                  border: currentStore === 'texno' ? '1px solid var(--neon-blue)' : '1px solid var(--card-border)',
                  background: currentStore === 'texno' ? 'rgba(0, 242, 254, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                  color: currentStore === 'texno' ? 'var(--neon-blue)' : 'var(--text-secondary)',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
              >
                ⚡ Texno
              </button>

              <button
                type="button"
                onClick={() => setCurrentStore('moto')}
                style={{
                  padding: '7px 4px',
                  borderRadius: '8px',
                  border: currentStore === 'moto' ? '1px solid var(--neon-pink)' : '1px solid var(--card-border)',
                  background: currentStore === 'moto' ? 'rgba(241, 91, 181, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                  color: currentStore === 'moto' ? 'var(--neon-pink)' : 'var(--text-secondary)',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
              >
                🏍️ Moto
              </button>
            </div>
            <button
              type="button"
              onClick={() => setCurrentStore('all')}
              style={{
                width: '100%',
                marginTop: '6px',
                padding: '6px 4px',
                borderRadius: '8px',
                border: currentStore === 'all' ? '1px solid var(--neon-purple)' : '1px solid var(--card-border)',
                background: currentStore === 'all' ? 'rgba(155, 93, 229, 0.15)' : 'transparent',
                color: currentStore === 'all' ? 'var(--neon-purple)' : 'var(--text-muted)',
                fontSize: '11px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              🌐 Barcha do'konlar (Umumiy)
            </button>
          </div>

          <ul className="sidebar-menu">
            <li
              className={`sidebar-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
              <span>Asosiy Panel</span>
            </li>
            <li
              className={`sidebar-item ${activeTab === 'inventory' ? 'active' : ''}`}
              onClick={() => setActiveTab('inventory')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
              <span>Tovarlar Ombori</span>
            </li>
            <li
              className={`sidebar-item ${activeTab === 'sales' ? 'active' : ''}`}
              onClick={() => setActiveTab('sales')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="15" y2="11"/><line x1="9" y1="15" x2="13" y2="15"/></svg>
              <span>Sotuvlar Tarixi</span>
            </li>
            <li
              className={`sidebar-item ${activeTab === 'calculator' ? 'active' : ''}`}
              onClick={() => setActiveTab('calculator')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="9" y1="22" x2="9" y2="16"></line><line x1="15" y1="22" x2="15" y2="16"></line><line x1="9" y1="16" x2="15" y2="16"></line><path d="M8 6h8M8 10h8M8 14h8"></path></svg>
              <span>Kredit Kalkulyator</span>
            </li>
            <li
              className={`sidebar-item ${activeTab === 'debtors' ? 'active' : ''}`}
              onClick={() => setActiveTab('debtors')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              <span>Nasiya / Qarzlar</span>
            </li>
            <li
              className={`sidebar-item ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>
              <span>Tahlillar</span>
            </li>
            <li
              className="sidebar-item"
              onClick={() => setIsTelegramModalOpen(true)}
              style={{ color: 'var(--neon-blue)' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
              <span>Telegram Bot</span>
            </li>
          </ul>
        </div>

        <div className="sidebar-rate" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className={`status-dot ${ratesStatus}`} style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                display: 'inline-block',
                background: ratesStatus === 'synced' ? 'var(--neon-green)' : ratesStatus === 'syncing' ? '#fee440' : 'var(--neon-red)',
                boxShadow: ratesStatus === 'synced' ? '0 0 8px var(--neon-green)' : ratesStatus === 'syncing' ? '0 0 8px #fee440' : '0 0 8px var(--neon-red)'
              }}></span>
              Valyuta Kurslari
            </span>
            <button 
              onClick={refreshRates}
              disabled={ratesLoading}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--neon-blue)',
                cursor: 'pointer',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                animation: ratesLoading ? 'spin 1s linear infinite' : 'none'
              }}
              title="Kurslarni yangilash"
            >
              🔄
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>🇺🇸 USD ($1)</span>
              <input
                type="number"
                className="form-control"
                value={Math.round(rates.UZS)}
                onChange={(e) => handleRateChange('USD', e.target.value)}
                style={{ width: '80px', padding: '3px 6px', fontSize: '11px', textAlign: 'right', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)', color: '#fff', borderRadius: '4px' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>🇪🇺 EUR (€1)</span>
              <input
                type="number"
                className="form-control"
                value={Math.round(rates.UZS / rates.EUR)}
                onChange={(e) => handleRateChange('EUR', e.target.value)}
                style={{ width: '80px', padding: '3px 6px', fontSize: '11px', textAlign: 'right', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)', color: '#fff', borderRadius: '4px' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>🇷🇺 RUB (₽1)</span>
              <input
                type="number"
                className="form-control"
                value={Math.round(rates.UZS / rates.RUB)}
                onChange={(e) => handleRateChange('RUB', e.target.value)}
                style={{ width: '80px', padding: '3px 6px', fontSize: '11px', textAlign: 'right', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)', color: '#fff', borderRadius: '4px' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>Faol Valyuta:</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', background: 'rgba(0, 0, 0, 0.2)', padding: '2px', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
              {['USD', 'UZS', 'EUR', 'RUB'].map((currKey) => (
                <button 
                  key={currKey}
                  onClick={() => handleCurrencyChange(currKey)}
                  style={{
                    padding: '5px 2px',
                    borderRadius: '6px',
                    border: 'none',
                    background: currency === currKey ? 'linear-gradient(135deg, var(--neon-blue) 0%, var(--neon-purple) 100%)' : 'transparent',
                    color: currency === currKey ? '#fff' : 'var(--text-secondary)',
                    fontWeight: '700',
                    fontSize: '10px',
                    cursor: 'pointer',
                    transition: 'var(--transition-smooth)'
                  }}
                >
                  {currKey}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="user-profile" style={{ justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="user-avatar">A</div>
              <div className="user-info">
                <div className="user-name">Admin</div>
                <div className="user-role">Texno Bozor</div>
              </div>
            </div>
            
            <button 
              onClick={handleLogout} 
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '18px',
                padding: '4px',
                transition: 'var(--transition-smooth)'
              }}
              title="Chiqish"
            >
              🚪
            </button>
          </div>
        </div>
      </aside>

      {/* Asosiy ishchi oyna */}
      <main className="main-content">
        {dbError && (
          <div style={{
            background: 'rgba(254, 228, 64, 0.1)',
            borderLeft: '4px solid #fee440',
            color: '#fee440',
            padding: '12px 18px',
            borderRadius: '8px',
            marginBottom: '24px',
            fontSize: '14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(254, 228, 64, 0.2)'
          }}>
            <span>⚠️ {dbError}</span>
            <button onClick={() => setDbError('')} style={{ background: 'transparent', border: 'none', color: '#fee440', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold' }}>&times;</button>
          </div>
        )}
        {renderActiveScreen()}
      </main>

      {/* Floating macOS-style Quick Action Dock */}
      <FloatingDock
        onOpenNewProduct={() => setActiveTab('inventory')}
        onOpenNewDebtor={() => setActiveTab('debtors')}
        onTriggerExcelImport={() => setActiveTab('inventory')}
        onNavigateTab={(tab) => setActiveTab(tab)}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Mobile Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav">
        <button className={`mobile-nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          <span>Asosiy</span>
        </button>
        <button className={`mobile-nav-btn ${activeTab === 'inventory' ? 'active' : ''}`} onClick={() => setActiveTab('inventory')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
          <span>Ombor</span>
        </button>
        <button className={`mobile-nav-btn ${activeTab === 'sales' ? 'active' : ''}`} onClick={() => setActiveTab('sales')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="9" y1="7" x2="15" y2="7"/></svg>
          <span>Sotuvlar</span>
        </button>
        <button className={`mobile-nav-btn ${activeTab === 'debtors' ? 'active' : ''}`} onClick={() => setActiveTab('debtors')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
          <span>Qarzlar</span>
        </button>
        <button className={`mobile-nav-btn ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
          <span>Tahlillar</span>
        </button>
      </nav>

      <TelegramSettingsModal
        isOpen={isTelegramModalOpen}
        onClose={() => setIsTelegramModalOpen(false)}
      />
    </div>
  );
}

export default function RootApp() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ErrorBoundary>
  );
}
