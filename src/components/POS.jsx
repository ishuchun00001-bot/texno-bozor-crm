import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { formatCurrency, DEFAULT_RATES } from '../utils/currency';
import { sendTelegramNotification } from './TelegramSettingsModal';

export default function POS({ products = [], onRefresh, rates = DEFAULT_RATES, currency = 'USD' }) {
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [completedSale, setCompletedSale] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Qidiruv bo'yicha saralangan tovarlar (Nomi, Brendi, Modeli va SKU bo'yicha)
  const filteredProducts = products.filter(p => 
    (p.name && p.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (p.brand && p.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (p.model && p.model.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Savatga tovar qo'shish
  const addToCart = (product) => {
    if (product.stock <= 0) return;

    const existingItem = cart.find(item => item.id === product.id);

    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        alert("Omborda yetarli mahsulot mavjud emas!");
        return;
      }
      setCart(cart.map(item => 
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  // Savatdagi miqdorni o'zgartirish
  const updateQuantity = (id, amount) => {
    const item = cart.find(i => i.id === id);
    const prod = products.find(p => p.id === id);

    if (!item || !prod) return;

    const newQty = item.quantity + amount;

    if (newQty <= 0) {
      setCart(cart.filter(i => i.id !== id));
    } else if (newQty > prod.stock) {
      alert("Omborda jami bo'lib faqat " + prod.stock + " dona tovar mavjud!");
    } else {
      setCart(cart.map(i => i.id === id ? { ...i, quantity: newQty } : i));
    }
  };

  // Savatni tozalash
  const clearCart = () => {
    setCart([]);
  };

  // Hisob-kitoblar
  const getCartTotals = () => {
    let subtotal = 0;
    let totalCost = 0;
    
    cart.forEach(item => {
      subtotal += item.selling_price * item.quantity;
      totalCost += item.cost_price * item.quantity;
    });

    return {
      subtotal,
      totalCost,
      profit: subtotal - totalCost
    };
  };

  const { subtotal, totalCost, profit } = getCartTotals();

  // Sotuvni tasdiqlash va Supabase database-ga yozish
  const handleCheckout = async () => {
    if (cart.length === 0 || isSubmitting) return;

    setIsSubmitting(true);
    const totals = getCartTotals();

    try {
      if (isSupabaseConfigured()) {
        // 1. sales jadvaliga yangi sotuv qo'shish
        const { data: saleData, error: saleError } = await supabase
          .from('sales')
          .insert([{
            total_amount: totals.subtotal,
            total_cost: totals.totalCost,
            profit: totals.profit
          }])
          .select();

        if (saleError) throw saleError;
        const newSaleId = saleData[0].id;

        // 2. sale_items jadvaliga batafsil tovarlarni qo'shish
        const saleItemsData = cart.map(item => ({
          sale_id: newSaleId,
          product_id: item.id,
          quantity: item.quantity,
          cost_price: item.cost_price,
          selling_price: item.selling_price
        }));

        const { error: itemsError } = await supabase
          .from('sale_items')
          .insert(saleItemsData);

        if (itemsError) throw itemsError;

        // 3. products jadvalida ombor sonini yangilash
        for (const item of cart) {
          const updatedStock = Math.max(0, item.stock - item.quantity);
          const { error: updateError } = await supabase
            .from('products')
            .update({ stock: updatedStock })
            .eq('id', item.id);
          if (updateError) throw updateError;
        }

        setCompletedSale({
          id: newSaleId,
          items: cart,
          totals,
          date: new Date().toLocaleString('uz-UZ')
        });

      } else {
        // Offline Mock rejimda localStorage ishlatish
        let localSales = JSON.parse(localStorage.getItem('local_sales') || '[]');
        let localItems = JSON.parse(localStorage.getItem('local_sale_items') || '[]');
        let localProds = JSON.parse(localStorage.getItem('local_products') || '[]');

        if (localProds.length === 0) {
          localProds = [...products];
        }

        const newSaleId = `sale-${Date.now()}`;
        const saleDate = new Date().toISOString();

        // Savdoni qo'shish
        localSales.push({
          id: newSaleId,
          total_amount: totals.subtotal,
          total_cost: totals.totalCost,
          profit: totals.profit,
          created_at: saleDate
        });

        // Batafsil sotilgan tovarlarni qo'shish
        cart.forEach((item, index) => {
          localItems.push({
            id: `item-${newSaleId}-${index}`,
            sale_id: newSaleId,
            product_id: item.id,
            quantity: item.quantity,
            cost_price: item.cost_price,
            selling_price: item.selling_price,
            created_at: saleDate
          });

          // Omborni kamaytirish
          localProds = localProds.map(p => p.id === item.id ? { ...p, stock: Math.max(0, p.stock - item.quantity) } : p);
        });

        localStorage.setItem('local_sales', JSON.stringify(localSales));
        localStorage.setItem('local_sale_items', JSON.stringify(localItems));
        localStorage.setItem('local_products', JSON.stringify(localProds));

      }

      // Telegram Bot bildirishnomasi
      const savedTg = localStorage.getItem('telegram_bot_settings');
      if (savedTg) {
        try {
          const tgSettings = JSON.parse(savedTg);
          if (tgSettings.notifySale !== false && tgSettings.botToken && tgSettings.chatId) {
            const itemsList = cart.map(i => `• <b>${i.brand ? `[${i.brand}] ` : ''}${i.name}</b> x${i.quantity} (${formatPrimary(i.selling_price * i.quantity)})`).join('\n');
            const tgMsg = `⚡ <b>SOTUV AMALGA OSHIRILDI!</b>\n\n🆔 Sotuv ID: #${newSaleId.substring(0, 12)}\n📅 Sana: ${new Date().toLocaleString('uz-UZ')}\n\n🛒 <b>Tovarlar:</b>\n${itemsList}\n\n------------------------------\n💵 <b>Jami To'lov:</b> ${formatPrimary(totals.subtotal)} (${formatSecondary(totals.subtotal)})\n📈 <b>Sof Foyda:</b> +${formatPrimary(totals.profit)}`;
            sendTelegramNotification(tgMsg);
          }
        } catch (e) {
          console.error("Telegram notification error:", e);
        }
      }

      clearCart();
      onRefresh(); // Bosh sahifa va ombor sonlarini yangilash
      alert("⚡ Sotuv Muvaffaqiyatli Bajarildi! Ombor soni kamaytirildi va moliyaviy hisobotga qo'shildi. ✅");

    } catch (err) {
      console.error(err);
      alert("Xatolik yuz berdi: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPrimary = (val) => {
    return formatCurrency(val, currency, rates);
  };

  const formatSecondary = (val) => {
    const secondaryCurr = currency === 'USD' ? 'UZS' : 'USD';
    return formatCurrency(val, secondaryCurr, rates);
  };

  return (
    <div className="page-fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="page-header" style={{ marginBottom: '16px' }}>
        <div className="page-title">
          <h1>Sotuvlar Bo'limi (POS)</h1>
          <p>Mijozlarga tovarlarni tezkor sotish va chek chiqarish paneli</p>
        </div>
      </div>

      <div className="pos-layout">
        {/* Chap tomon: Tovarlar ro'yxati va qidiruv */}
        <div className="pos-products">
          <div className="pos-search-bar">
            <input
              type="text"
              className="form-control"
              placeholder="Mahsulot nomi yoki SKU bo'yicha qidirish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="pos-products-grid">
            {filteredProducts.map(p => {
              const isOutOfStock = p.stock <= 0;
              return (
                <div 
                  key={p.id} 
                  className={`pos-product-card ${isOutOfStock ? 'out-of-stock' : ''}`}
                  onClick={() => addToCart(p)}
                >
                  <img src={p.image_url} alt={p.name} className="pos-product-img" />
                  <div className="pos-product-name">{p.name}</div>
                  <div className="pos-product-meta">
                    <div className="pos-product-price">
                      {formatPrimary(p.selling_price)}
                      <span className="currency-subtext" style={{ fontSize: '11px' }}>
                        {formatSecondary(p.selling_price)}
                      </span>
                    </div>
                    <div className={`pos-product-stock ${isOutOfStock ? 'danger' : ''}`} style={{color: isOutOfStock ? 'var(--neon-red)' : 'var(--text-muted)'}}>
                      {isOutOfStock ? 'Zahira tugadi' : `${p.stock} dona`}
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredProducts.length === 0 && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
                Hech qanday mahsulot topilmadi.
              </div>
            )}
          </div>
        </div>

        {/* O'ng tomon: Savat paneli */}
        <div className="pos-cart">
          <div className="pos-cart-header">
            <h3>Savat ({cart.length} turdagi tovar)</h3>
            {cart.length > 0 && (
              <button onClick={clearCart} className="clear-cart-btn">Tozalash</button>
            )}
          </div>

          <div className="pos-cart-items">
            {cart.map(item => (
              <div key={item.id} className="cart-item">
                <img src={item.image_url} alt={item.name} className="cart-item-img" />
                <div className="cart-item-details">
                  <div className="cart-item-name" title={item.name}>{item.name}</div>
                  <div className="cart-item-price">
                    {formatPrimary(item.selling_price)}
                    <span className="currency-subtext" style={{ fontSize: '11px', display: 'inline', marginLeft: '6px' }}>
                      ({formatSecondary(item.selling_price)})
                    </span>
                  </div>
                </div>
                <div className="cart-item-qty">
                  <button onClick={() => updateQuantity(item.id, -1)} className="cart-qty-btn">-</button>
                  <span className="cart-item-quantity">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, 1)} className="cart-qty-btn">+</button>
                </div>
                <button onClick={() => updateQuantity(item.id, -item.quantity)} className="cart-item-remove">🗑️</button>
              </div>
            ))}
            {cart.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '60px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                <span>Savat bo'sh. Chap tomondan tovarlarni tanlang.</span>
              </div>
            )}
          </div>

          <div className="pos-cart-summary">
            <div className="summary-row">
              <span>Umumiy miqdor:</span>
              <span>{cart.reduce((acc, curr) => acc + curr.quantity, 0)} dona</span>
            </div>
            
            {/* Faqat admin uchun foyda prognozi */}
            <div className="summary-row" style={{ color: 'var(--neon-green)', fontWeight: '500' }}>
              <span>Sof foyda prognozi:</span>
              <span>
                +{formatPrimary(profit)} / +{formatSecondary(profit)}
              </span>
            </div>

            <div className="summary-row total">
              <span>Jami Summa:</span>
              <span style={{ textAlign: 'right' }}>
                {formatPrimary(subtotal)}
                <span className="currency-subtext" style={{ color: 'var(--text-secondary)', display: 'block' }}>
                  {formatSecondary(subtotal)}
                </span>
              </span>
            </div>

            <button 
              onClick={handleCheckout} 
              disabled={cart.length === 0 || isSubmitting} 
              className="btn-primary" 
              style={{ width: '100%', justifyContent: 'center', height: '48px', fontSize: '15px' }}
            >
              {isSubmitting ? "Yuborilmoqda..." : "⚡ Sotuvni tasdiqlash"}
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
