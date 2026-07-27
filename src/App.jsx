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
import TelegramSettingsModal, { sendDailySummaryReport } from './components/TelegramSettingsModal';
import FloatingDock from './components/FloatingDock';
import Topbar from './components/layout/Topbar';
import Sidebar from './components/layout/Sidebar';
import CommandPalette from './components/layout/CommandPalette';
import { ToastProvider, useToast } from './components/Toast';

import { supabase, isSupabaseConfigured } from './supabaseClient';
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
    try {
      localStorage.clear();
    } catch (e) {
      console.error(e);
    }
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
          <p style={{ color: '#94a3b8', maxWidth: '460px', marginBottom: '16px', fontSize: '13.5px', lineHeight: '1.6' }}>
            Do'konlar keshi va ma'lumotlarni qayta tiklash uchun quyidagi tugmani bosing:
          </p>
          {this.state.error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              padding: '12px 16px',
              maxWidth: '600px',
              width: '100%',
              marginBottom: '20px',
              color: '#f87171',
              fontSize: '12px',
              fontFamily: 'monospace',
              textAlign: 'left',
              overflowX: 'auto'
            }}>
              <strong>Xatolik ma'lumoti:</strong>
              <pre style={{ marginTop: '6px', whiteSpace: 'pre-wrap', margin: 0 }}>
                {this.state.error.toString()}
              </pre>
            </div>
          )}
          <button
            onClick={this.handleReset}
            style={{
              padding: '12px 28px',
              borderRadius: '8px',
              border: 'none',
              background: 'var(--brand-accent, #6366f1)',
              color: '#ffffff',
              fontWeight: '700',
              fontSize: '14px',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)'
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => window.innerWidth < 1100);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1100) {
        setIsSidebarCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // ⏰ Har kuni soat 23:00 da Telegramga avtomatik kunlik savdo va ombor hisobotini yuborish
  useEffect(() => {
    const checkSchedule = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();

      // Soat 23:00 bo'lganda (23:00 - 23:01 oralig'i)
      if (hours === 23 && minutes === 0) {
        const todayDateStr = now.toISOString().split('T')[0];
        const lastSentDate = localStorage.getItem('last_daily_tg_report_date');

        if (lastSentDate !== todayDateStr) {
          localStorage.setItem('last_daily_tg_report_date', todayDateStr);
          sendDailySummaryReport(sales, products, expenses, rates, currency)
            .then(res => {
              if (res && res.success) {
                console.log("⏰ 23:00 Kunlik Telegram hisoboti muvaffaqiyatli yuborildi!");
              }
            })
            .catch(err => console.error("23:00 Telegram scheduler error:", err));
        }
      }
    };

    const intervalId = setInterval(checkSchedule, 25000); // Har 25 soniyada tekshiradi
    return () => clearInterval(intervalId);
  }, [sales, products, expenses, rates, currency]);

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

  const fetchData = async () => {
    setLoading(true);
    try {
      if (isSupabaseConfigured()) {
        const [prodsRes, slsRes, itemsRes, expsRes] = await Promise.all([
          supabase.from('products').select('*').order('created_at', { ascending: false }),
          supabase.from('sales').select('*').order('created_at', { ascending: false }),
          supabase.from('sale_items').select('*'),
          supabase.from('expenses').select('*').order('created_at', { ascending: false })
        ]);

        if (prodsRes.error) {
          console.error("Products fetch error:", prodsRes.error);
          setDbError('Products: ' + prodsRes.error.message);
        }
        if (slsRes.error) console.error("Sales fetch error:", slsRes.error);
        if (itemsRes.error) console.error("Sale items fetch error:", itemsRes.error);
        if (expsRes.error) console.error("Expenses fetch error:", expsRes.error);

        setProducts(prodsRes.data || []);
        setSales(slsRes.data || []);
        setSaleItems(itemsRes.data || []);
        setExpenses(expsRes.data || []);
        if (!prodsRes.error && !slsRes.error) {
          setDbError('');
        }
      } else {
        setDbError('Supabase API kalitlari sozlanmagan!');
      }
    } catch (error) {
      console.error('Ma\'lumotlarni yuklashda umumiy xatolik:', error.message);
      setDbError('Supabase ma\'lumotlar bazasiga ulanishda xatolik yuz berdi: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    // Legacy business cache purge
    const LEGACY_KEYS = [
      'local_products',
      'local_sales',
      'local_sale_items',
      'local_expenses',
      'local_debtors',
      'local_inventory_movements',
      'local_db_seeded'
    ];
    LEGACY_KEYS.forEach(k => localStorage.removeItem(k));

    fetchData();

    // Supabase Realtime Channel for instant cross-device data synchronization
    if (isSupabaseConfigured()) {
      const channel = supabase
        .channel('cross-device-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => fetchData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => fetchData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'sale_items' }, () => fetchData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => fetchData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'debtors' }, () => fetchData())
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('⚡ Supabase Realtime active for cross-device sync');
          }
        });

      return () => {
        supabase.removeChannel(channel);
      };
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
