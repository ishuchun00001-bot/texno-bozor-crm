import React, { useState, useEffect } from 'react';
import { Send } from 'lucide-react';
import { obfuscateSecret, deobfuscateSecret } from '../utils/security';
import Button from './ui/Button';
import Input from './ui/Input';
import Modal from './ui/Modal';

const DEFAULT_BOT_TOKEN = '8758536316:AAEYTolW74kyL_CB5HPvbxz1WPqC87qr-5U';
const DEFAULT_CHAT_IDS = '658069248, 186055944';

export const sendTelegramNotification = async (messageText) => {
  try {
    const saved = localStorage.getItem('telegram_bot_settings');
    let botToken = DEFAULT_BOT_TOKEN;
    let chatIdString = DEFAULT_CHAT_IDS;

    if (saved) {
      const settings = JSON.parse(saved);
      if (settings.botTokenEncrypted) {
        botToken = deobfuscateSecret(settings.botTokenEncrypted);
      } else if (settings.botToken) {
        botToken = settings.botToken;
      }
      if (settings.chatId) chatIdString = settings.chatId;
    }

    if (!botToken || !chatIdString) {
      return { success: false, reason: "Bot token yoki Admin Chat ID kiritilmagan" };
    }

    const chatIds = chatIdString.split(/[\s,]+/).filter(Boolean);
    if (chatIds.length === 0) {
      return { success: false, reason: "Kamida bitta Chat ID kiriting" };
    }

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const results = await Promise.all(chatIds.map(async (id) => {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: id,
            text: messageText,
            parse_mode: 'HTML'
          })
        });
        return await response.json();
      } catch (e) {
        return { ok: false, description: e.message };
      }
    }));

    const successCount = results.filter(r => r.ok).length;
    if (successCount > 0) {
      return { success: true, count: successCount, total: chatIds.length };
    } else {
      const firstError = results[0]?.description || "Telegram API xatoligi";
      return { success: false, reason: firstError };
    }
  } catch (err) {
    console.error("Telegram notification error:", err);
    return { success: false, reason: err.message };
  }
};

export const sendDailySummaryReport = async (sales = [], products = [], expenses = [], rates = {}, currency = 'USD') => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    const rate = rates[currency] || 1;
    const formatMoney = (valUsd) => {
      const numUsd = parseFloat(valUsd) || 0;
      if (currency === 'UZS') {
        const uzs = Math.round(numUsd * rate);
        return `${uzs.toLocaleString()} SO'M`;
      }
      return `$${numUsd.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    };

    // 1. Bugungi Sotuvlar
    const todaySales = sales.filter(s => {
      if (!s || !s.created_at) return false;
      const d = new Date(s.created_at);
      return d >= startOfDay && d <= endOfDay;
    });

    const totalSalesCount = todaySales.length;
    const totalSalesUsd = todaySales.reduce((sum, s) => sum + (parseFloat(s.total_amount) || 0), 0);
    const netRevenueUsd = todaySales.reduce((sum, s) => sum + (parseFloat(s.net_amount) || parseFloat(s.total_amount) || 0), 0);
    const salesProfitUsd = todaySales.reduce((sum, s) => sum + (parseFloat(s.profit) || 0), 0);

    // 2. Bugungi Harajatlar
    const todayExpenses = expenses.filter(e => {
      if (!e || !e.created_at) return false;
      const d = new Date(e.created_at);
      return d >= startOfDay && d <= endOfDay;
    });

    const totalExpensesUsd = todayExpenses.reduce((sum, e) => sum + (parseFloat(e.amount_usd) || parseFloat(e.amount) || 0), 0);
    const netProfitUsd = salesProfitUsd - totalExpensesUsd;

    // 3. Ombor Qoldig'i
    const totalProductsCount = products.length;
    const totalInventoryStock = products.reduce((sum, p) => sum + (parseInt(p.stock) || 0), 0);
    const totalInventoryCostUsd = products.reduce((sum, p) => sum + ((parseFloat(p.cost_price) || 0) * (parseInt(p.stock) || 0)), 0);

    // 4. Kam Qolgan Tovarlar (stock <= 3)
    const lowStockItems = products.filter(p => (parseInt(p.stock) || 0) <= 3);
    let lowStockText = '• Hamma tovar yetarli miqdorda ✅';
    if (lowStockItems.length > 0) {
      lowStockText = lowStockItems.map(p => `• <b>${p.name}</b> — ⚠️ ${p.stock} dona`).join('\n');
    }

    const dateStr = today.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const reportMsg =
      `📊 <b>TEXNO BOZOR ERP — KUNLIK SAVDO VA OMBOR HISOBOTI</b>\n` +
      `📅 <b>Sana:</b> ${dateStr} (⏰ 23:00)\n\n` +
      `💵 <b>BUGUNGI SAVDO VA SOF FOYDA:</b>\n` +
      `• 🛍️ <b>Jami sotuvlar soni:</b> ${totalSalesCount} ta\n` +
      `• 💰 <b>Jami savdo hajmi:</b> ${formatMoney(totalSalesUsd)}\n` +
      `• 🏢 <b>Sof tushum (bank/xizmat chegirilib):</b> ${formatMoney(netRevenueUsd)}\n` +
      `• 📈 <b>Sotuvdan foyda:</b> +${formatMoney(salesProfitUsd)}\n` +
      `• 💸 <b>Bugungi harajatlar:</b> -${formatMoney(totalExpensesUsd)}\n` +
      `• 💎 <b>KUNLIK SOF FOYDA:</b> <b>${netProfitUsd >= 0 ? '+' : ''}${formatMoney(netProfitUsd)}</b>\n\n` +
      `📦 <b>OMBOR QOLDIG'I HISOBOTI:</b>\n` +
      `• 📦 <b>Ombordagi tovar turlari:</b> ${totalProductsCount} xil\n` +
      `• 🔢 <b>Jami tovarlar soni:</b> ${totalInventoryStock} dona\n` +
      `• 💰 <b>Ombordagi tovarlar umumiy tannarxi:</b> ${formatMoney(totalInventoryCostUsd)}\n\n` +
      `⚠️ <b>KAM QOLGAN TOVARLAR (0 - 3 dona):</b>\n` +
      `${lowStockText}\n\n` +
      `------------------------------\n` +
      `🤖 <i>Texno & Moto Bozor ERP tizimi tomonidan avtomatik yuborildi.</i>`;

    return await sendTelegramNotification(reportMsg);
  } catch (err) {
    console.error("Daily Telegram report error:", err);
    return { success: false, reason: err.message };
  }
};

export default function TelegramSettingsModal({ isOpen, onClose }) {
  const [botToken, setBotToken] = useState(DEFAULT_BOT_TOKEN);
  const [chatId, setChatId] = useState(DEFAULT_CHAT_IDS);
  const [notifySale, setNotifySale] = useState(true);
  const [notifyLowStock, setNotifyLowStock] = useState(true);

  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('telegram_bot_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const token = parsed.botTokenEncrypted ? deobfuscateSecret(parsed.botTokenEncrypted) : (parsed.botToken || DEFAULT_BOT_TOKEN);
        setBotToken(token);
        setChatId(parsed.chatId || DEFAULT_CHAT_IDS);
        setNotifySale(parsed.notifySale !== false);
        setNotifyLowStock(parsed.notifyLowStock !== false);
      } catch (e) {
        console.error(e);
      }
    }
  }, [isOpen]);

  const handleSave = (e) => {
    e.preventDefault();
    const settings = {
      botTokenEncrypted: obfuscateSecret(botToken),
      chatId,
      notifySale,
      notifyLowStock
    };
    localStorage.setItem('telegram_bot_settings', JSON.stringify(settings));
    setStatusMsg({ text: "Telegram Bot sozlamalari muvaffaqiyatli saqlandi! ✅", type: 'success' });
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setStatusMsg({ text: "Telegram serverlariga ulanish tekshirilmoqda...", type: 'info' });

    const testMsg =
      `🚀 <b>TEXNO MOTO BOZOR CRM — BILDIRISHNOMA TESTI</b>\n\n` +
      `✅ Telegram Bot ulanishi muvaffaqiyatli o'rnatildi!\n` +
      `⏰ Vaqt: ${new Date().toLocaleString('uz-UZ')}\n` +
      `⚡ Endi barcha yangi sotuvlar va nasiya to'lovlari ushbu chatga avtomatik kelib tushadi.`;

    const res = await sendTelegramNotification(testMsg);
    setIsTesting(false);

    if (res.success) {
      setStatusMsg({
        text: `Test xabari ${res.count} ta admin chatiga muvaffaqiyatli yuborildi! 🎉`,
        type: 'success'
      });
    } else {
      setStatusMsg({
        text: `Xatolik: ${res.reason}`,
        type: 'error'
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Telegram Bot Integratsiyasi"
      maxWidth="480px"
    >
      {statusMsg.text && (
        <div style={{
          padding: '10px 14px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '16px',
          fontSize: '12.5px',
          background: statusMsg.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : statusMsg.type === 'error' ? 'rgba(239, 68, 68, 0.12)' : 'var(--bg-secondary)',
          color: statusMsg.type === 'success' ? 'var(--success)' : statusMsg.type === 'error' ? 'var(--danger)' : 'var(--brand-accent)',
          border: `1px solid ${statusMsg.type === 'success' ? 'var(--success)' : statusMsg.type === 'error' ? 'var(--danger)' : 'var(--card-border)'}`
        }}>
          {statusMsg.text}
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <Input
          label="Telegram Bot Token"
          type="password"
          value={botToken}
          onChange={(e) => setBotToken(e.target.value)}
          placeholder="Botfather tokenini kiriting"
          required
        />

        <Input
          label="Admin Chat ID lar (Vergul bilan ajrating)"
          value={chatId}
          onChange={(e) => setChatId(e.target.value)}
          placeholder="658069248, 186055944"
          required
        />

        <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
            <input type="checkbox" checked={notifySale} onChange={(e) => setNotifySale(e.target.checked)} style={{ accentColor: 'var(--brand-accent)' }} />
            Har bir yangi sotuv va nasiya haqida bildirishnoma
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
            <input type="checkbox" checked={notifyLowStock} onChange={(e) => setNotifyLowStock(e.target.checked)} style={{ accentColor: 'var(--brand-accent)' }} />
            Omborda tovar kam qolganda ogohlantirish
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
          <Button
            type="button"
            variant="secondary"
            onClick={handleTestConnection}
            loading={isTesting}
          >
            <Send size={14} /> Test Xabarini Yuborish
          </Button>

          <Button type="submit" variant="primary">
            Sozlamalarni Saqlash
          </Button>
        </div>
      </form>
    </Modal>
  );
}
