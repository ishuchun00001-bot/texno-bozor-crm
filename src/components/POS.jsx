import React, { useState } from 'react';
import { 
  ShoppingCart, 
  Search, 
  Trash2, 
  Check, 
  CreditCard
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { formatCurrency, DEFAULT_RATES } from '../utils/currency';
import { sendTelegramNotification } from './TelegramSettingsModal';
import { useToast } from './Toast';
import Button from './ui/Button';
import Badge from './ui/Badge';
import Card from './ui/Card';
import Input from './ui/Input';
import Modal from './ui/Modal';

export const PAYMENT_METHODS = [
  { id: 'cash', label: 'Naqd', color: 'var(--success)' },
  { id: 'card', label: 'Karta (2% bank)', color: 'var(--brand-accent)' },
  { id: 'nasiya', label: 'Nasiya (5% xizmat)', color: 'var(--warning)' },
  { id: 'kredit', label: 'Kredit', color: 'var(--brand-gold)' },
  { id: 'uzum', label: 'Uzum', color: '#7c3aed' },
  { id: 'alif', label: 'Alif', color: '#2563eb' },
  { id: 'other', label: 'Boshqa', color: 'var(--text-muted)' }
];

export default function POS({ products = [], onRefresh, rates = DEFAULT_RATES, currency = 'USD', currentStore = 'all' }) {
  const toast = useToast();
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // To'lov turlari va aralash to'lov qiymatlari (USD yoki Joriy Valyutada)
  const [paymentType, setPaymentType] = useState('cash'); // 'cash', 'card', 'mixed', etc.
  const [payments, setPayments] = useState({
    cash: 0,
    card: 0,
    nasiya: 0,
    kredit: 0,
    uzum: 0,
    alif: 0,
    other: 0
  });

  const filteredProducts = products.filter(p => {
    const matchesStore = currentStore === 'all' || (p.store_type || 'texno') === currentStore;
    const matchesQuery = 
      (p.name && p.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.brand && p.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.model && p.model.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesStore && matchesQuery;
  });

  const addToCart = (product) => {
    if (product.stock <= 0) return;

    const existingItem = cart.find(item => item.id === product.id);
    const rate = rates[currency] || 1;
    const initialSellingPrice = Math.round((product.selling_price || product.cost_price || 0) * rate);

    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        toast.warning("Omborda yetarli mahsulot mavjud emas!");
        return;
      }
      setCart(cart.map(item => 
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setCart([...cart, { 
        ...product, 
        quantity: 1, 
        custom_selling_price: initialSellingPrice
      }]);
    }
  };

  const updateQuantity = (id, amount) => {
    const item = cart.find(i => i.id === id);
    const prod = products.find(p => p.id === id);

    if (!item || !prod) return;

    const newQty = item.quantity + amount;

    if (newQty <= 0) {
      setCart(cart.filter(i => i.id !== id));
    } else if (newQty > prod.stock) {
      toast.warning("Omborda jami bo'lib faqat " + prod.stock + " dona tovar mavjud!");
    } else {
      setCart(cart.map(i => i.id === id ? { ...i, quantity: newQty } : i));
    }
  };

  const updateItemDiscount = (id, newDiscount) => {
    const d = Math.max(0, parseFloat(newDiscount) || 0);
    setCart(cart.map(item => item.id === id ? { ...item, discount: d } : item));
  };

  const clearCart = () => {
    setCart([]);
  };

  // Cart Subtotals
  const getCartTotals = () => {
    const rate = rates[currency] || 1;
    let subtotal = 0;
    let totalCost = 0;
    let totalDiscount = 0;
    
    cart.forEach(item => {
      const priceUsd = (parseFloat(item.custom_selling_price) || 0) / rate;
      const discountUsd = (parseFloat(item.discount) || 0) / rate;
      const costUsd = parseFloat(item.cost_price) || 0;

      const netPriceUsd = Math.max(0, priceUsd - discountUsd);

      subtotal += netPriceUsd * item.quantity;
      totalCost += costUsd * item.quantity;
      totalDiscount += discountUsd * item.quantity;
    });

    return {
      subtotalUsd: subtotal,
      totalCostUsd: totalCost,
      totalDiscountUsd: totalDiscount,
      profitUsd: subtotal - totalCost
    };
  };

  const { subtotalUsd, totalCostUsd, profitUsd } = getCartTotals();

  // Modal Ochilganda To'lovlarni Standartlash
  const openCheckoutModal = () => {
    if (cart.length === 0) {
      toast.warning("Savat bo'sh! Avval tovar tanlang.");
      return;
    }

    const rate = rates[currency] || 1;
    const subtotalDisplay = Math.round(subtotalUsd * rate);

    setPaymentType('cash');
    setPayments({
      cash: subtotalDisplay,
      card: 0,
      nasiya: 0,
      kredit: 0,
      uzum: 0,
      alif: 0,
      other: 0
    });
    setIsCheckoutModalOpen(true);
  };

  const handlePaymentChange = (methodId, val) => {
    const num = Math.max(0, parseFloat(val) || 0);
    setPayments(prev => ({ ...prev, [methodId]: num }));
  };

  // Komissiyalar va Qolgan Summa Kalkulyatsiyasi
  const getCheckoutCalculations = () => {
    const rate = rates[currency] || 1;
    const subtotalDisplay = Math.round(subtotalUsd * rate);

    let totalPaidDisplay = 0;
    if (paymentType === 'mixed') {
      totalPaidDisplay = Object.values(payments).reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
    } else {
      totalPaidDisplay = subtotalDisplay;
    }

    const remainingDisplay = subtotalDisplay - totalPaidDisplay;

    // Karta komissiyasi (2%) va Nasiya xarajati (5%)
    let cardAmountDisplay = paymentType === 'card' ? subtotalDisplay : (payments.card || 0);
    let nasiyaAmountDisplay = paymentType === 'nasiya' ? subtotalDisplay : (payments.nasiya || 0);

    const cardCommissionDisplay = Math.round(cardAmountDisplay * 0.02);
    const nasiyaFeeDisplay = Math.round(nasiyaAmountDisplay * 0.05);

    const netRevenueDisplay = subtotalDisplay - cardCommissionDisplay - nasiyaFeeDisplay;

    return {
      subtotalDisplay,
      totalPaidDisplay,
      remainingDisplay,
      cardCommissionDisplay,
      nasiyaFeeDisplay,
      netRevenueDisplay,
      cardCommissionUsd: cardCommissionDisplay / rate,
      nasiyaFeeUsd: nasiyaFeeDisplay / rate,
      netRevenueUsd: netRevenueDisplay / rate
    };
  };

  const calc = getCheckoutCalculations();

  const handleCheckout = async () => {
    if (cart.length === 0 || isSubmitting) return;

    if (paymentType === 'mixed' && Math.abs(calc.remainingDisplay) > 1) {
      toast.error("To'langan jami summa umumiy summaq teng bo'lishi kerak! Qolgan summa: " + formatPrimary(calc.remainingDisplay / (rates[currency] || 1)));
      return;
    }

    setIsSubmitting(true);
    const rate = rates[currency] || 1;

    try {
      const salePayload = {
        total_amount: subtotalUsd,
        total_cost: totalCostUsd,
        profit: profitUsd - calc.cardCommissionUsd - calc.nasiyaFeeUsd,
        card_commission: calc.cardCommissionUsd,
        nasiya_fee: calc.nasiyaFeeUsd,
        net_amount: calc.netRevenueUsd,
        payment_method: paymentType,
        payment_details: paymentType === 'mixed' ? payments : { [paymentType]: Math.round(subtotalUsd * rate) },
        store_type: currentStore === 'moto' ? 'moto' : 'texno',
        created_at: new Date().toISOString()
      };

      if (!isSupabaseConfigured()) {
        toast.error("Supabase bilan ulanish mavjud emas. Sotuv amalga oshirilmadi.");
        setIsSubmitting(false);
        return;
      }

      const { data: saleData, error: saleError } = await supabase
          .from('sales')
          .insert([salePayload])
          .select();

        if (saleError) throw saleError;
        newSaleId = saleData[0].id;

        const saleItemsData = cart.map(item => ({
          sale_id: newSaleId,
          product_id: item.id,
          quantity: item.quantity,
          cost_price: item.cost_price,
          selling_price: (parseFloat(item.custom_selling_price) || 0) / rate
        }));

        const { error: itemsError } = await supabase
          .from('sale_items')
          .insert(saleItemsData);

        if (itemsError) throw itemsError;

        for (const item of cart) {
          const updatedStock = Math.max(0, item.stock - item.quantity);
          await supabase.from('products').update({ stock: updatedStock }).eq('id', item.id);
        }

      // Telegram Bot Notification
      const savedTg = localStorage.getItem('telegram_bot_settings');
      if (savedTg) {
        try {
          const tgSettings = JSON.parse(savedTg);
          if (tgSettings.notifySale !== false && tgSettings.botToken && tgSettings.chatId) {
            const itemsList = cart.map(i => `• <b>${i.name}</b> x${i.quantity} (${formatPrimary((i.custom_selling_price || 0) / rate * i.quantity)})`).join('\n');
            const tgMsg =
              `⚡ <b>SOTUV AMALGA OSHIRILDI!</b>\n\n` +
              `🆔 Sotuv ID: #${newSaleId.toString().substring(0, 12)}\n` +
              `🏪 Do'kon: ${currentStore === 'moto' ? '🏍️ Moto Bozor' : '⚡ Texno Bozor'}\n` +
              `📅 Sana: ${new Date().toLocaleString('uz-UZ')}\n\n` +
              `🛒 <b>Tovarlar:</b>\n${itemsList}\n\n` +
              `------------------------------\n` +
              `💵 <b>Jami Summa:</b> ${formatPrimary(subtotalUsd)}\n` +
              `💳 <b>Karta Komissiyasi (2%):</b> -${formatPrimary(calc.cardCommissionUsd)}\n` +
              `⚠️ <b>Nasiya Xarajati (5%):</b> -${formatPrimary(calc.nasiyaFeeUsd)}\n` +
              `🏢 <b>Sof Tushum:</b> <b>${formatPrimary(calc.netRevenueUsd)}</b>\n` +
              `📈 <b>Sof Foyda:</b> +${formatPrimary(profitUsd - calc.cardCommissionUsd - calc.nasiyaFeeUsd)}`;
            sendTelegramNotification(tgMsg);
          }
        } catch (e) {
          console.error("Telegram notification error:", e);
        }
      }

      clearCart();
      setIsCheckoutModalOpen(false);
      toast.success("Sotuv muvaffaqiyatli bajarildi! Ombor va hisobotlar yangilandi. ✅");
      onRefresh();
    } catch (err) {
      console.error(err);
      toast.error("Xatolik yuz berdi: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPrimary = (val) => formatCurrency(val, currency, rates);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>
            Sotuvlar Bo'limi (POS)
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Tovar tanlash, narx kiritish va aralash to'lovlarni amalga oshirish
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        {/* Left Side: Product Grid & Search */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Card style={{ padding: '12px 16px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-control"
                placeholder="Mahsulot nomi, brend yoki SKU bo'yicha qidirish..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '38px' }}
              />
            </div>
          </Card>

          {/* Products Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px', maxHeight: '560px', overflowY: 'auto' }}>
            {filteredProducts.map(p => {
              const isOutOfStock = p.stock <= 0;
              const priceDisplay = formatPrimary(p.selling_price || p.cost_price);

              return (
                <div
                  key={p.id}
                  onClick={() => addToCart(p)}
                  style={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--card-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px',
                    cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                    opacity: isOutOfStock ? 0.5 : 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justify: 'space-between',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div>
                    <div style={{ width: '100%', height: '90px', borderRadius: '6px', background: 'rgba(0, 0, 0, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px', marginBottom: '8px' }}>
                      <img 
                        src={p.image_url} 
                        alt={p.name} 
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} 
                      />
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', lineHeight: 1.3 }}>{p.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Tannarx: {formatPrimary(p.cost_price)}</div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--card-border)' }}>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--brand-gold)' }}>{priceDisplay}</span>
                    <Badge variant={isOutOfStock ? 'danger' : 'info'}>{isOutOfStock ? 'Tugagan' : `${p.stock} dona`}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Cart & Checkout Panel */}
        <Card style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '20px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '10px', borderBottom: '1px solid var(--card-border)' }}>
              <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShoppingCart size={18} style={{ color: 'var(--brand-accent)' }} /> Savat ({cart.length})
              </h2>
              {cart.length > 0 && (
                <Button variant="danger" size="sm" onClick={clearCart}>Tozalash</Button>
              )}
            </div>

            {/* Cart Items List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '340px', overflowY: 'auto' }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0', fontSize: '12.5px' }}>
                  Savat bo'sh! Chap tomondan tovarlarni tanlang. 🛒
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '10px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-primary)' }}>{item.name}</div>
                      <button onClick={() => updateQuantity(item.id, -item.quantity)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', alignItems: 'center' }}>
                      {/* Sotuv narxini tahrirlash */}
                      <div>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>Narx ({currency}):</span>
                        <input
                          type="number"
                          className="form-control"
                          value={item.custom_selling_price}
                          onChange={(e) => updateItemPrice(item.id, e.target.value)}
                          style={{ padding: '3px 4px', fontSize: '11px', height: '26px' }}
                        />
                      </div>

                      {/* Chegirma tahrirlash */}
                      <div>
                        <span style={{ fontSize: '10px', color: 'var(--warning)', display: 'block' }}>Chegirma ({currency}):</span>
                        <input
                          type="number"
                          className="form-control"
                          value={item.discount || 0}
                          onChange={(e) => updateItemDiscount(item.id, e.target.value)}
                          style={{ padding: '3px 4px', fontSize: '11px', height: '26px' }}
                        />
                      </div>

                      {/* Quantity controls */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                        <button onClick={() => updateQuantity(item.id, -1)} style={{ width: '22px', height: '22px', borderRadius: '4px', border: '1px solid var(--card-border)', background: 'var(--card-bg)', color: '#fff', cursor: 'pointer' }}>-</button>
                        <span style={{ fontSize: '12px', fontWeight: '700', width: '18px', textAlign: 'center' }}>{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} style={{ width: '22px', height: '22px', borderRadius: '4px', border: '1px solid var(--card-border)', background: 'var(--card-bg)', color: '#fff', cursor: 'pointer' }}>+</button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Cart Summary & Checkout Trigger */}
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--card-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              <span>Jami Tushum:</span>
              <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{formatPrimary(subtotalUsd)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: '800', color: 'var(--success)', marginBottom: '14px' }}>
              <span>Kutilayotgan Foyda:</span>
              <span>+{formatPrimary(profitUsd)}</span>
            </div>

            <Button variant="primary" style={{ width: '100%', padding: '12px', justifyContent: 'center' }} onClick={openCheckoutModal} disabled={cart.length === 0}>
              <CreditCard size={18} /> Sotuvni Rasmiylashtirish
            </Button>
          </div>
        </Card>
      </div>

      {/* Aralash va Ko'p Tizimli To'lov Modali */}
      <Modal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        title="To'lov Usullari va Rasmiylashtirish"
        maxWidth="540px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Summary Box */}
          <div style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--bg-secondary)', padding: '12px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Umumiy Summa</div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--brand-gold)' }}>{formatPrimary(subtotalUsd)}</div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Sof Tushum (Komissiyasiz)</div>
              <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--success)' }}>{formatPrimary(calc.netRevenueUsd)}</div>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="form-group">
            <label className="form-label">To'lov Turi</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
              {PAYMENT_METHODS.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentType(m.id)}
                  style={{
                    padding: '6px 4px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--card-border)',
                    background: paymentType === m.id ? m.color : 'var(--bg-secondary)',
                    color: paymentType === m.id ? '#ffffff' : 'var(--text-secondary)',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  {m.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPaymentType('mixed')}
                style={{
                  padding: '6px 4px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--card-border)',
                  background: paymentType === 'mixed' ? 'var(--brand-accent)' : 'var(--bg-secondary)',
                  color: paymentType === 'mixed' ? '#ffffff' : 'var(--text-secondary)',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                🔀 Aralash To'lov
              </button>
            </div>
          </div>

          {/* Aralash To'lov Kiritish Paneli */}
          {paymentType === 'mixed' && (
            <div style={{ padding: '14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>Aralash Summalarni Kiritish ({currency}):</div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <Input label="Naqd" type="number" value={payments.cash} onChange={(e) => handlePaymentChange('cash', e.target.value)} />
                <Input label="Karta (2% bank)" type="number" value={payments.card} onChange={(e) => handlePaymentChange('card', e.target.value)} />
                <Input label="Nasiya (5% xizmat)" type="number" value={payments.nasiya} onChange={(e) => handlePaymentChange('nasiya', e.target.value)} />
                <Input label="Kredit" type="number" value={payments.kredit} onChange={(e) => handlePaymentChange('kredit', e.target.value)} />
                <Input label="Uzum" type="number" value={payments.uzum} onChange={(e) => handlePaymentChange('uzum', e.target.value)} />
                <Input label="Alif" type="number" value={payments.alif} onChange={(e) => handlePaymentChange('alif', e.target.value)} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: 'var(--card-bg)', borderRadius: 'var(--radius-sm)', fontSize: '12.5px', marginTop: '4px' }}>
                <span>Qolgan Summa:</span>
                <span style={{ fontWeight: '800', color: Math.abs(calc.remainingDisplay) <= 1 ? 'var(--success)' : 'var(--danger)' }}>
                  {formatPrimary(calc.remainingDisplay / (rates[currency] || 1))}
                </span>
              </div>
            </div>
          )}

          {/* Automatic Commissions Notice */}
          {(calc.cardCommissionDisplay > 0 || calc.nasiyaFeeDisplay > 0) && (
            <div style={{ padding: '10px 12px', background: 'rgba(234, 179, 8, 0.1)', border: '1px solid var(--warning)', borderRadius: 'var(--radius-sm)', fontSize: '11.5px', color: 'var(--warning)' }}>
              {calc.cardCommissionDisplay > 0 && <div>• Karta 2% bank komissiyasi: -{formatPrimary(calc.cardCommissionUsd)}</div>}
              {calc.nasiyaFeeDisplay > 0 && <div>• Nasiya 5% xizmat xarajati: -{formatPrimary(calc.nasiyaFeeUsd)}</div>}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <Button variant="secondary" onClick={() => setIsCheckoutModalOpen(false)}>Bekor qilish</Button>
            <Button 
              variant="primary" 
              onClick={handleCheckout} 
              loading={isSubmitting}
              disabled={paymentType === 'mixed' && Math.abs(calc.remainingDisplay) > 1}
            >
              <Check size={16} /> Sotuvni Yakunlash
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
