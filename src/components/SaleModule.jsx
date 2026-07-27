import React, { useState } from 'react';
import { 
  ShoppingCart, 
  Search, 
  Trash2, 
  UserCheck, 
  PackageCheck, 
  ShieldCheck
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { formatCurrency, DEFAULT_RATES } from '../utils/currency';
import { getCommissionRates, formatUzbekPhone, formatThousand, parseThousand } from '../constants';
import { sendTelegramNotification } from './TelegramSettingsModal';
import { useToast } from './Toast';
import Button from './ui/Button';
import Badge from './ui/Badge';
import Card from './ui/Card';
import Input from './ui/Input';

export const SALE_PAYMENT_METHODS = [
  { id: 'cash', label: 'Naqd', color: 'var(--success)' },
  { id: 'card', label: 'Karta (2% bank)', color: 'var(--brand-accent)' },
  { id: 'nasiya', label: 'Nasiya (5% xizmat)', color: 'var(--warning)' },
  { id: 'kredit', label: 'Kredit', color: 'var(--brand-gold)' },
  { id: 'uzum', label: 'Uzum', color: '#7c3aed' },
  { id: 'alif', label: 'Alif', color: '#2563eb' },
  { id: 'mixed', label: '🔀 Aralash', color: '#ec4899' }
];

export default function SaleModule({
  products = [],
  onRefresh,
  rates = DEFAULT_RATES,
  currency = 'USD',
  currentStore = 'all'
}) {
  const toast = useToast();

  // 1. Mijoz Ma'lumotlari
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // 2. Mahsulot Tanlash & Savat
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 3. To'lov va Aralash To'lov Sozlamalari
  const [paymentType, setPaymentType] = useState('cash');
  const [payments, setPayments] = useState({
    cash: 0,
    card: 0,
    nasiya: 0,
    kredit: 0,
    uzum: 0,
    alif: 0
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
    if (product.stock <= 0) {
      toast.warning("Ushbu mahsulot omborda tugagan!");
      return;
    }

    const existingItem = cart.find(item => item.id === product.id);
    const baseSellingPriceUsd = parseFloat(product.selling_price) || parseFloat(product.cost_price) || 0;

    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        toast.warning(`Omborda faqat ${product.stock} dona mahsulot mavjud!`);
        return;
      }
      setCart(cart.map(item => 
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setCart([...cart, {
        ...product,
        quantity: 1,
        selling_price_usd: baseSellingPriceUsd,
        discount_display: 0
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
      toast.warning(`Omborda faqat ${prod.stock} dona mahsulot bor!`);
    } else {
      setCart(cart.map(i => i.id === id ? { ...i, quantity: newQty } : i));
    }
  };

  const updateQuantityExact = (id, exactQty) => {
    const item = cart.find(i => i.id === id);
    const prod = products.find(p => p.id === id);
    if (!item || !prod) return;

    const validatedQty = Math.max(1, Math.min(exactQty, prod.stock));
    setCart(cart.map(i => i.id === id ? { ...i, quantity: validatedQty } : i));
  };

  const cleanNumericInput = (val) => {
    if (typeof val === 'string') {
      return val.replace(/^0+(?=\d)/, '');
    }
    return val;
  };

  const updateItemPrice = (id, displayVal) => {
    const rate = rates[currency] || 1;
    const clean = cleanNumericInput(displayVal);
    const valInDisplayCurrency = Math.max(0, parseFloat(clean) || 0);
    const usdVal = valInDisplayCurrency / rate;
    setCart(cart.map(item => item.id === id ? { ...item, selling_price_usd: usdVal } : item));
  };

  const updateItemDiscount = (id, displayVal) => {
    const clean = cleanNumericInput(displayVal);
    const valInDisplayCurrency = Math.max(0, parseFloat(clean) || 0);
    setCart(cart.map(item => item.id === id ? { ...item, discount_display: valInDisplayCurrency } : item));
  };

  const clearCart = () => {
    setCart([]);
    setPayments({ cash: 0, card: 0, nasiya: 0, kredit: 0, uzum: 0, alif: 0 });
  };

  const handleSelectPaymentType = (typeId) => {
    setPaymentType(typeId);
    if (typeId === 'mixed') {
      const rate = rates[currency] || 1;
      const subtotalDisplay = Math.round(getOrderTotals().subtotalUsd * rate);
      setPayments({ cash: subtotalDisplay, card: 0, nasiya: 0, kredit: 0, uzum: 0, alif: 0 });
    }
  };

  // Buyurtma hisob-kitoblari
  const getOrderTotals = () => {
    const rate = rates[currency] || 1;
    let subtotalUsd = 0;
    let totalCostUsd = 0;
    let totalDiscountUsd = 0;

    cart.forEach(item => {
      const priceUsd = parseFloat(item.selling_price_usd) || 0;
      const discountUsd = (parseFloat(item.discount_display) || 0) / rate;
      const costUsd = parseFloat(item.cost_price) || 0;

      const netPriceUsd = Math.max(0, priceUsd - discountUsd);

      subtotalUsd += netPriceUsd * item.quantity;
      totalCostUsd += costUsd * item.quantity;
      totalDiscountUsd += discountUsd * item.quantity;
    });

    const subtotalDisplay = Math.round(subtotalUsd * rate);

    // Aralash yoki yagona to'lov bo'yicha to'langan va qolgan summa
    let paidDisplay = 0;
    if (paymentType === 'mixed') {
      paidDisplay = Object.values(payments).reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
    } else {
      paidDisplay = subtotalDisplay;
    }

    const remainingDisplay = subtotalDisplay - paidDisplay;

    // Dynamic Settings Komissiyalari
    const { cardRate, nasiyaRate } = getCommissionRates();
    const cardPart = paymentType === 'card' ? subtotalDisplay : (paymentType === 'mixed' ? (payments.card || 0) : 0);
    const nasiyaPart = paymentType === 'nasiya' ? subtotalDisplay : (paymentType === 'mixed' ? (payments.nasiya || 0) : 0);

    const cardCommDisplay = Math.round(cardPart * cardRate);
    const nasiyaFeeDisplay = Math.round(nasiyaPart * nasiyaRate);

    const cardCommUsd = cardCommDisplay / rate;
    const nasiyaFeeUsd = nasiyaFeeDisplay / rate;

    const netRevenueUsd = subtotalUsd - cardCommUsd - nasiyaFeeUsd;
    const profitUsd = subtotalUsd - totalCostUsd - cardCommUsd - nasiyaFeeUsd;

    return {
      subtotalUsd,
      subtotalDisplay,
      totalCostUsd,
      totalDiscountUsd,
      paidDisplay,
      remainingDisplay,
      cardCommDisplay,
      cardCommUsd,
      nasiyaFeeDisplay,
      nasiyaFeeUsd,
      netRevenueUsd,
      profitUsd
    };
  };

  const totals = getOrderTotals();

  const handlePaymentChange = (methodId, val) => {
    const clean = cleanNumericInput(val);
    const num = Math.max(0, parseFloat(clean) || 0);
    setPayments(prev => ({ ...prev, [methodId]: clean === '' ? '' : num }));
  };

  const handleCompleteSale = async (e) => {
    e.preventDefault();
    if (cart.length === 0 || isSubmitting) return;

    if (paymentType === 'mixed' && Math.abs(totals.remainingDisplay) > 1) {
      toast.error(`To'lov to'liq amalga oshirilmadi! Qolgan summa: ${formatPrimary(totals.remainingDisplay / (rates[currency] || 1))}`);
      return;
    }

    setIsSubmitting(true);
    const rate = rates[currency] || 1;
    const nowIso = new Date().toISOString();
    let newSaleId = `sale-${Date.now()}`;

    try {
      const salePayload = {
        total_amount: totals.subtotalUsd,
        total_cost: totals.totalCostUsd,
        profit: totals.profitUsd,
        card_commission: totals.cardCommUsd,
        nasiya_fee: totals.nasiyaFeeUsd,
        net_amount: totals.netRevenueUsd,
        payment_method: paymentType,
        payment_details: paymentType === 'mixed' ? payments : { [paymentType]: totals.subtotalDisplay },
        customer_name: customerName || 'Noma\'lum mijoz',
        customer_phone: customerPhone || '—',
        store_type: currentStore === 'moto' ? 'moto' : 'texno',
        created_at: nowIso
      };

      if (isSupabaseConfigured()) {
        // 1. Sales jadvaliga saqlash
        const { data: saleData, error: saleErr } = await supabase
          .from('sales')
          .insert([salePayload])
          .select();

        if (saleErr) throw saleErr;
        newSaleId = saleData[0].id;

        // 2. Sale_items jadvaliga batafsil saqlash
        const saleItemsData = cart.map(item => ({
          sale_id: newSaleId,
          product_id: item.id,
          quantity: item.quantity,
          cost_price: item.cost_price,
          selling_price: (parseFloat(item.selling_price_usd) || 0) - ((parseFloat(item.discount_display) || 0) / rate)
        }));

        const { error: itemsErr } = await supabase.from('sale_items').insert(saleItemsData);
        if (itemsErr) throw itemsErr;

        // 3. Ombor qoldig'ini ayirish va inventory_movements jadvaliga saqlash
        for (const item of cart) {
          const newStock = Math.max(0, item.stock - item.quantity);
          await supabase.from('products').update({ stock: newStock }).eq('id', item.id);

          await supabase.from('inventory_movements').insert([{
            product_id: item.id,
            movement_type: 'sale',
            quantity: item.quantity,
            note: `Sotuv ID: #${newSaleId.toString().substring(0, 8)}`,
            created_at: nowIso
          }]);
        }
      }

      // Telegram Bot Bildirishnomasi
      const savedTg = localStorage.getItem('telegram_bot_settings');
      if (savedTg) {
        try {
          const tgSettings = JSON.parse(savedTg);
          if (tgSettings.notifySale !== false && tgSettings.botToken && tgSettings.chatId) {
            const itemsList = cart.map(i => `• <b>${i.name}</b> x${i.quantity} dona (${formatPrimary(((i.custom_selling_price || 0) - (i.discount || 0)) / rate * i.quantity)})`).join('\n');
            let paymentBreakdownText = `💳 <b>To'lov Turi:</b> ${SALE_PAYMENT_METHODS.find(m => m.id === paymentType)?.label || paymentType}\n`;
            if (paymentType === 'mixed') {
              const parts = [];
              if (payments.cash > 0) parts.push(`• Naqd: ${formatCurrency(payments.cash / rate, currency, rates)}`);
              if (payments.card > 0) parts.push(`• Karta (2%): ${formatCurrency(payments.card / rate, currency, rates)}`);
              if (payments.nasiya > 0) parts.push(`• Nasiya (5%): ${formatCurrency(payments.nasiya / rate, currency, rates)}`);
              if (payments.kredit > 0) parts.push(`• Kredit: ${formatCurrency(payments.kredit / rate, currency, rates)}`);
              if (payments.uzum > 0) parts.push(`• Uzum: ${formatCurrency(payments.uzum / rate, currency, rates)}`);
              if (payments.alif > 0) parts.push(`• Alif: ${formatCurrency(payments.alif / rate, currency, rates)}`);
              paymentBreakdownText += parts.join('\n') + '\n';
            }

            const tgMsg =
              `🛍️ <b>YANGI ERP SOTUV AMALGA OSHIRILDI!</b>\n\n` +
              `👤 Mijoz: <b>${customerName || 'Mijoz ko\'rsatilmadi'}</b> (${customerPhone || '—'})\n` +
              `🏪 Do'kon: ${currentStore === 'moto' ? '🏍️ Moto Bozor' : '⚡ Texno Bozor'}\n` +
              `📅 Sana: ${new Date().toLocaleString('uz-UZ')}\n\n` +
              `🛒 <b>Buyurtma Tarkibi:</b>\n${itemsList}\n\n` +
              `------------------------------\n` +
              paymentBreakdownText +
              `💵 <b>Jami Summa:</b> ${formatPrimary(totals.subtotalUsd)}\n` +
              `💳 <b>Karta Komissiyasi (2%):</b> -${formatPrimary(totals.cardCommUsd)}\n` +
              `⚠️ <b>Nasiya Xarajati (5%):</b> -${formatPrimary(totals.nasiyaFeeUsd)}\n` +
              `🏢 <b>Sof Tushum:</b> <b>${formatPrimary(totals.netRevenueUsd)}</b>\n` +
              `📈 <b>Sof Foyda:</b> +${formatPrimary(totals.profitUsd)}`;
            sendTelegramNotification(tgMsg);
          }
        } catch (e) {
          console.error("Telegram notification error:", e);
        }
      }

      toast.success("Sotuv muvaffaqiyatli yakunlandi! Ombor va hisobotlar yangilandi. ✅");
      clearCart();
      setCustomerName('');
      setCustomerPhone('');
      onRefresh();
    } catch (err) {
      console.error(err);
      toast.error("Sotuvni yakunlashda xatolik: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPrimary = (val) => formatCurrency(val, currency, rates);
  const formatSecondary = (val) => {
    const sec = currency === 'USD' ? 'UZS' : 'USD';
    return formatCurrency(val, sec, rates);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>
            Enterprise Sotuv Moduli
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Mijoz tanlash, ko'p mahsulotli buyurtma yaratish va to'lovlarni rasmiylashtirish
          </p>
        </div>
      </div>

      {/* Main Grid: Catalog vs Order & Payment Builder */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
        {/* Left Side: Product Browser */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Customer Selection Card */}
          <Card style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <UserCheck size={16} style={{ color: 'var(--brand-accent)' }} /> 1. Mijoz Ma'lumotlari (Ixtiyoriy)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <Input
                label="Mijoz Ismi"
                placeholder="Alisher Karimov"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
              <Input
                label="Telefon Raqam"
                placeholder="+998 90 123-45-67"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(formatUzbekPhone(e.target.value))}
                onFocus={() => {
                  if (!customerPhone) setCustomerPhone('+998 ');
                }}
              />
            </div>
          </Card>

          {/* Product Search & Catalog */}
          <Card style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <PackageCheck size={16} style={{ color: 'var(--brand-gold)' }} /> 2. Mahsulot Qo'shish & Ombor
            </div>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-control"
                placeholder="Tovar nomi, brend yoki SKU bo'yicha qidirish..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '38px' }}
              />
            </div>

            {/* Catalog Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px', maxHeight: '420px', overflowY: 'auto', marginTop: '4px' }}>
              {filteredProducts.map(p => {
                const isOutOfStock = p.stock <= 0;
                return (
                  <div
                    key={p.id}
                    onClick={() => addToCart(p)}
                    style={{
                      padding: '10px',
                      background: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--card-border)',
                      cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                      opacity: isOutOfStock ? 0.5 : 1,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div>
                      <div style={{ width: '100%', height: '84px', borderRadius: '6px', background: 'rgba(0, 0, 0, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', marginBottom: '6px' }}>
                        <img src={p.image_url} alt={p.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', lineHeight: 1.2 }}>{p.name}</div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '6px', borderTop: '1px solid var(--card-border)' }}>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--brand-gold)' }}>{formatPrimary(p.selling_price || p.cost_price)}</span>
                      <Badge variant={isOutOfStock ? 'danger' : 'info'}>{isOutOfStock ? '0 dona' : `${p.stock} dona`}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Right Side: Order Cart & Multi-Payment Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Card style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '520px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid var(--card-border)' }}>
                <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShoppingCart size={18} style={{ color: 'var(--brand-accent)' }} /> Buyurtma Tarkibi ({cart.length})
                </h2>
                {cart.length > 0 && (
                  <Button variant="danger" size="sm" onClick={clearCart}>Tozalash</Button>
                )}
              </div>

              {/* Cart Items Table */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '280px', overflowY: 'auto' }}>
                {cart.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0', fontSize: '12.5px' }}>
                    Buyurtmaga tovarlar qo'shilmadi! Chap tomondan tovarlarni tanlang. 🛒
                  </div>
                ) : (
                  cart.map(item => (
                    <div key={item.id} style={{ padding: '10px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-primary)' }}>{item.name}</div>
                        <button onClick={() => updateQuantity(item.id, -item.quantity)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.8fr', gap: '8px', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px', fontWeight: '600' }}>Narx ({currency}):</span>
                          <input
                            type="text"
                            className="form-control"
                            placeholder={`Sotish narxini kiriting (${currency})`}
                            value={formatThousand(Math.round((item.selling_price_usd || 0) * (rates[currency] || 1)))}
                            onChange={(e) => updateItemPrice(item.id, parseThousand(e.target.value))}
                            onFocus={(e) => e.target.select()}
                            style={{ padding: '3px 6px', fontSize: '11.5px', height: '32px', fontWeight: '600' }}
                          />
                        </div>

                        <div>
                          <span style={{ fontSize: '10px', color: 'var(--warning)', display: 'block', marginBottom: '2px', fontWeight: '600' }}>Chegirma ({currency}):</span>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="0"
                            value={formatThousand(item.discount_display)}
                            onChange={(e) => updateItemDiscount(item.id, parseThousand(e.target.value))}
                            onFocus={(e) => e.target.select()}
                            style={{ padding: '3px 6px', fontSize: '11.5px', height: '32px', fontWeight: '600' }}
                          />
                        </div>

                        <div>
                          <span style={{ fontSize: '10px', color: 'var(--text-primary)', display: 'block', marginBottom: '2px', fontWeight: '600', textAlign: 'center' }}>Miqdor:</span>
                          <input
                            type="number"
                            className="form-control"
                            min="1"
                            max={item.stock}
                            value={item.quantity}
                            onChange={(e) => {
                              const raw = e.target.value;
                              if (raw === '') return;
                              const val = parseInt(raw, 10);
                              if (isNaN(val) || val < 1) {
                                updateQuantityExact(item.id, 1);
                              } else if (val > item.stock) {
                                toast.warning(`Omborda faqat ${item.stock} dona mahsulot bor!`);
                                updateQuantityExact(item.id, item.stock);
                              } else {
                                updateQuantityExact(item.id, val);
                              }
                            }}
                            onWheel={(e) => e.target.blur()}
                            onKeyDown={(e) => {
                              if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                                e.preventDefault();
                              }
                            }}
                            onFocus={(e) => e.target.select()}
                            style={{ padding: '3px 4px', fontSize: '12px', height: '32px', textAlign: 'center', fontWeight: '700' }}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Payment Type Selection & Breakdown */}
              {cart.length > 0 && (
                <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--card-border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>To'lov Usulini Tanlang:</div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                    {SALE_PAYMENT_METHODS.map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleSelectPaymentType(m.id)}
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
                  </div>

                  {/* Aralash To'lov Balans Paneli */}
                  {paymentType === 'mixed' && (
                    <div style={{ padding: '10px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                      <div style={{ fontSize: '11.5px', fontWeight: '700', color: 'var(--text-primary)' }}>Aralash Summalarni Kiritish ({currency}):</div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                        <Input label="Naqd" type="text" value={formatThousand(payments.cash)} onChange={(e) => handlePaymentChange('cash', parseThousand(e.target.value))} />
                        <Input label="Karta (2% bank)" type="text" value={formatThousand(payments.card)} onChange={(e) => handlePaymentChange('card', parseThousand(e.target.value))} />
                        <Input label="Nasiya (5% xizmat)" type="text" value={formatThousand(payments.nasiya)} onChange={(e) => handlePaymentChange('nasiya', parseThousand(e.target.value))} />
                        <Input label="Kredit" type="text" value={formatThousand(payments.kredit)} onChange={(e) => handlePaymentChange('kredit', parseThousand(e.target.value))} />
                        <Input label="Uzum" type="text" value={formatThousand(payments.uzum)} onChange={(e) => handlePaymentChange('uzum', parseThousand(e.target.value))} />
                        <Input label="Alif" type="text" value={formatThousand(payments.alif)} onChange={(e) => handlePaymentChange('alif', parseThousand(e.target.value))} />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'var(--card-bg)', borderRadius: 'var(--radius-sm)', fontSize: '12px' }}>
                        <span>Qolgan Summa:</span>
                        <span style={{ fontWeight: '800', color: Math.abs(totals.remainingDisplay) <= 1 ? 'var(--success)' : 'var(--danger)' }}>
                          {formatPrimary(totals.remainingDisplay / (rates[currency] || 1))}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Checkout Trigger */}
            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--card-border)', paddingBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                <span>Jami Summa:</span>
                <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{formatPrimary(totals.subtotalUsd)}</span>
              </div>

              {(totals.cardCommDisplay > 0 || totals.nasiyaFeeDisplay > 0) && (
                <div style={{ fontSize: '11px', color: 'var(--warning)', marginBottom: '6px' }}>
                  {totals.cardCommDisplay > 0 && <div>• Bank 2% komissiya: -{formatPrimary(totals.cardCommUsd)}</div>}
                  {totals.nasiyaFeeDisplay > 0 && <div>• Nasiya 5% xizmat: -{formatPrimary(totals.nasiyaFeeUsd)}</div>}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', fontWeight: '800', marginBottom: '14px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Sof Foyda:</span>
                <span style={{ color: totals.profitUsd >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                  {totals.profitUsd >= 0 ? `+${formatPrimary(totals.profitUsd)}` : formatPrimary(totals.profitUsd)}
                </span>
              </div>

              <Button
                variant="primary"
                onClick={handleCompleteSale}
                loading={isSubmitting}
                disabled={cart.length === 0 || (paymentType === 'mixed' && Math.abs(totals.remainingDisplay) > 1)}
                style={{ width: '100%', padding: '12px', justifyContent: 'center' }}
              >
                <ShieldCheck size={18} /> Sotuvni Yakunlash
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
