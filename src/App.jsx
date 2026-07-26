import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import SaleModule from './components/SaleModule';
import Inventory from './components/Inventory';
import SalesHistory from './components/SalesHistory';
import Debtors from './components/Debtors';
import Expenses from './components/Expenses';
import CreditCalculator from './components/CreditCalculator';
import Analytics from './components/Analytics';
import TelegramSettingsModal from './components/TelegramSettingsModal';
import FloatingDock from './components/FloatingDock';
import Topbar from './components/layout/Topbar';
import Sidebar from './components/layout/Sidebar';
import CommandPalette from './components/layout/CommandPalette';
import { ToastProvider, useToast } from './components/Toast';

import { supabase, isSupabaseConfigured } from './supabaseClient';
import { mockProducts, generateMockSales } from './utils/mockData';
import { DEFAULT_RATES, fetchExchangeRates } from './utils/currency';
import { validateSecureSession, clearSecureSession } from './utils/security';

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
    clearSecureSession();
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
          background: '#090c15',
          color: '#fff',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '32px', fontWeight: '800', marginBottom: '16px' }}>Texno Bozor CRM</div>
          <h2 style={{ fontSize: '18px', marginBottom: '12px', color: 'var(--danger, #ef4444)' }}>
            Tizim keshida vaqtinchalik ziddiyat aniqlandi
          </h2>
          <p style={{ color: '#94a3b8', maxWidth: '460px', marginBottom: '24px', fontSize: '13.5px', lineHeight: '1.6' }}>
            Do'konlar keshi va ma'lumotlarni qayta tiklash uchun quyidagi tugmani bosing:
          </p>
          <button
            onClick={this.handleReset}
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              border: 'none',
              background: 'var(--brand-accent, #6366f1)',
              color: '#ffffff',
              fontWeight: '700',
              fontSize: '14px',
              cursor: 'pointer'
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
  const toast = useToast();
  const [currentStore, setCurrentStore] = useState('all'); // 'all', 'texno', 'moto'
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'inventory', 'sales', 'debtors', 'calculator', 'analytics'
  const [theme, setTheme] = useState(() => localStorage.getItem('app_theme') || 'dark');
  const [rates, setRates] = useState(DEFAULT_RATES);
  const [currency, setCurrency] = useState('USD'); // 'USD', 'UZS', 'RUB', 'EUR'
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesStatus, setRatesStatus] = useState('syncing'); // 'syncing', 'synced', 'error'
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('app_theme', nextTheme);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [saleItems, setSaleItems] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState('');

  useEffect(() => {
    const checkAuth = async () => {
      const isValid = await validateSecureSession();
      setIsAuthenticated(isValid);
    };
    checkAuth();

    const savedCurrency = localStorage.getItem('active_currency');
    if (savedCurrency) {
      setCurrency(savedCurrency);
    }

    const loadRates = async () => {
      setRatesLoading(true);
      setRatesStatus('syncing');
      
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
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    clearSecureSession();
    setIsAuthenticated(false);
  };

  const refreshRates = async () => {
    setRatesLoading(true);
    setRatesStatus('syncing');
    try {
      const fetchedRates = await fetchExchangeRates();
      setRates(fetchedRates);
      localStorage.setItem('exchange_rates', JSON.stringify(fetchedRates));
      setRatesStatus('synced');
      if (toast && toast.success) toast.success("Valyuta kurslari muvaffaqiyatli yangilandi");
    } catch (err) {
      if (toast && toast.error) toast.error("Valyuta kurslarini yangilashda xatolik yuz berdi: " + err.message);
      setRatesStatus('error');
    } finally {
      setRatesLoading(false);
    }
  };

  const handleCurrencyChange = (cur) => {
    setCurrency(cur);
    localStorage.setItem('active_currency', cur);
  };

  const loadLocalStorageData = () => {
    let localProds = [];
    let localSales = [];
    let localItems = [];
    let localExps = [];

    try {
      localProds = JSON.parse(localStorage.getItem('local_products') || '[]');
      localSales = JSON.parse(localStorage.getItem('local_sales') || '[]');
      localItems = JSON.parse(localStorage.getItem('local_sale_items') || '[]');
      localExps = JSON.parse(localStorage.getItem('local_expenses') || '[]');
    } catch (e) {
      console.error("LocalStorage parse error:", e);
    }

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
    setExpenses(localExps);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      if (isSupabaseConfigured()) {
        try {
          const { data: prods, error: err1 } = await supabase.from('products').select('*').order('created_at', { ascending: false });
          const { data: sls, error: err2 } = await supabase.from('sales').select('*').order('created_at', { ascending: false });
          const { data: items, error: err3 } = await supabase.from('sale_items').select('*');
          const { data: exps } = await supabase.from('expenses').select('*').order('created_at', { ascending: false });

          if (err1 || err2 || err3) throw err1 || err2 || err3;

          setProducts(prods || []);
          setSales(sls || []);
          setSaleItems(items || []);
          setExpenses(exps || JSON.parse(localStorage.getItem('local_expenses') || '[]'));
          setDbError('');
        } catch (supabaseErr) {
          console.warn('Supabase-dan yuklashda xatolik yuz berdi. Lokal rejimga o\'tiladi:', supabaseErr.message);
          setDbError('Supabase ma\'lumotlar bazasida xatolik. Tizim vaqtinchalik offline (lokal) rejimda ishlamoqda.');
          loadLocalStorageData();
        }
      } else {
        loadLocalStorageData();
      }
    } catch (error) {
      console.error('Ma\'lumotlarni yuklashda umumiy xatolik:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  const filteredProducts = (products || []).filter(p => p && (currentStore === 'all' || (p.store_type || 'texno') === currentStore));
  const filteredSales = (sales || []).filter(s => s && (currentStore === 'all' || (s.store_type || 'texno') === currentStore));

  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            products={filteredProducts}
            sales={filteredSales}
            saleItems={saleItems}
            expenses={expenses}
            loading={loading}
            rates={rates}
            currency={currency}
            currentStore={currentStore}
          />
        );
      case 'sotuv':
        return (
          <SaleModule
            products={filteredProducts}
            onRefresh={fetchData}
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
      case 'expenses':
        return (
          <Expenses
            expenses={expenses}
            onRefresh={fetchData}
            loading={loading}
            rates={rates}
            currency={currency}
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
            expenses={expenses}
            onRefresh={fetchData}
            rates={rates}
            currency={currency}
            currentStore={currentStore}
          />
        );
      default:
        return <Dashboard products={filteredProducts} sales={filteredSales} expenses={expenses} loading={loading} rates={rates} currency={currency} currentStore={currentStore} />;
    }
  };

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="app-container">
      {/* Clean Collapsible Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        onOpenTelegramModal={() => setIsTelegramModalOpen(true)}
      />

      {/* Main Wrapper Layout */}
      <div className={`main-wrapper ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {/* Sticky Topbar */}
        <Topbar
          activeTab={activeTab}
          currentStore={currentStore}
          setCurrentStore={setCurrentStore}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          rates={rates}
          ratesLoading={ratesLoading}
          ratesStatus={ratesStatus}
          refreshRates={refreshRates}
          currency={currency}
          onCurrencyChange={handleCurrencyChange}
          onOpenTelegramModal={() => setIsTelegramModalOpen(true)}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onLogout={handleLogout}
        />

        {/* Dynamic Content Body */}
        <main className="main-content">
          {dbError && (
            <div style={{
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              color: 'var(--warning)',
              padding: '10px 16px',
              borderRadius: 'var(--radius-md)',
              marginBottom: '20px',
              fontSize: '13px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>⚠️ {dbError}</span>
              <button onClick={() => setDbError('')} style={{ background: 'transparent', border: 'none', color: 'var(--warning)', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>&times;</button>
            </div>
          )}

          {renderActiveScreen()}
        </main>
      </div>

      {/* Quick Action Dock */}
      <FloatingDock
        onOpenNewProduct={() => setActiveTab('inventory')}
        onOpenNewDebtor={() => setActiveTab('debtors')}
        onTriggerExcelImport={() => setActiveTab('inventory')}
        onNavigateTab={(tab) => setActiveTab(tab)}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Telegram Configuration Modal */}
      <TelegramSettingsModal
        isOpen={isTelegramModalOpen}
        onClose={() => setIsTelegramModalOpen(false)}
      />

      {/* Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        products={products}
        onNavigateTab={(tab) => setActiveTab(tab)}
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
