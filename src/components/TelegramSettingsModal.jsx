import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { obfuscateSecret, deobfuscateSecret } from '../utils/security';

const DEFAULT_BOT_TOKEN = '8758536316:AAEYTolW74kyL_CB5HPvbxz1WPqC87qr-5U';
const DEFAULT_CHAT_IDS = '658069248, 186055944'; // Salomov & Ilhom

// Helper function: Telegram bot xabari yuborish (Bir nechta admin chat ID lariga)
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

    // Bir nechta Chat ID larni vergul bilan ajratib olish
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
      const firstError = results[0]?.description || "Telegram API xatoligi (Botga /start bosilganini va Chat ID to'g'riligini tekshiring)";
      return { success: false, reason: firstError };
    }
  } catch (err) {
    console.error("Telegram notification error:", err);
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
    } else {
      setBotToken(DEFAULT_BOT_TOKEN);
      setChatId(DEFAULT_CHAT_IDS);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    const rawToken = botToken.trim() || DEFAULT_BOT_TOKEN;
    const settings = {
      botTokenEncrypted: obfuscateSecret(rawToken),
      chatId: chatId.trim(),
      notifySale,
      notifyLowStock
    };
    localStorage.setItem('telegram_bot_settings', JSON.stringify(settings));
    setStatusMsg({ text: "Sozlamalar saqlandi! ✅", type: 'success' });
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const handleTest = async () => {
    if (!chatId.trim()) {
      setStatusMsg({ text: "Iltimos, kamida bitta admin Chat ID sini kiriting!", type: 'error' });
      return;
    }

    setIsTesting(true);
    setStatusMsg({ text: "Test xabari adminlarga yuborilmoqda...", type: 'info' });

    localStorage.setItem('telegram_bot_settings', JSON.stringify({
      botToken: (botToken.trim() || DEFAULT_BOT_TOKEN),
      chatId: chatId.trim(),
      notifySale,
      notifyLowStock
    }));

    const testMsg = `⚡ <b>TEXNO BOZOR CRM</b>\n\nTelegram Bot integratsiyasi muvaffaqiyatli ulindi! ✅\n👑 Adminlar: @salomov_2502 hamda @Ilhommurodov\n📅 Sana: ${new Date().toLocaleString('uz-UZ')}`;
    const res = await sendTelegramNotification(testMsg);

    setIsTesting(false);
    if (res.success) {
      setStatusMsg({ text: `Test xabari Telegramga muvaffaqiyatli yuborildi! (${res.count} ta admimga yetib bordi) 🚀`, type: 'success' });
    } else {
      setStatusMsg({ text: `Xatolik: ${res.reason}`, type: 'error' });
    }
  };

  return createPortal(
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '540px' }}>
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            ✈️ Telegram Bot Sozlamalari
          </h3>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>

        <form onSubmit={handleSave}>
          <div className="modal-body">
            {/* Adminlar eslatmasi */}
            <div style={{ background: 'rgba(0, 242, 254, 0.08)', borderLeft: '4px solid var(--neon-blue)', padding: '10px 14px', borderRadius: '6px', marginBottom: '16px', fontSize: '12px', color: 'var(--text-primary)' }}>
              👑 <strong>Adminlar (@salomov_2502 & @Ilhommurodov):</strong><br />
              1. Telegram botga kiring va kamida 1 marta <code>/start</code> bosib qo'ying.<br />
              2. O'zingizning Chat ID laringizni (masalan: <code>@userinfobot</code> orqali bilish mumkin) vergul bilan ajratib kiriting (masalan: <code>12345678, 987654321</code>).
            </div>

            {statusMsg.text && (
              <div style={{
                padding: '10px 14px',
                borderRadius: '6px',
                marginBottom: '16px',
                fontSize: '13px',
                background: statusMsg.type === 'error' ? 'rgba(255, 56, 96, 0.12)' : statusMsg.type === 'success' ? 'rgba(0, 245, 212, 0.12)' : 'rgba(0, 187, 249, 0.12)',
                borderLeft: `4px solid ${statusMsg.type === 'error' ? 'var(--neon-red)' : statusMsg.type === 'success' ? 'var(--neon-green)' : 'var(--neon-blue)'}`,
                color: statusMsg.type === 'error' ? 'var(--neon-red)' : statusMsg.type === 'success' ? 'var(--neon-green)' : 'var(--neon-blue)'
              }}>
                {statusMsg.text}
              </div>
            )}

            <div className="form-group">
              <label>Bot Token *</label>
              <input
                type="text"
                className="form-control"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                required
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Telegram BotFather kaliti o'rnatilgan
              </span>
            </div>

            <div className="form-group">
              <label>Admin Chat ID (Bir nechta admin uchun vergul bilan ajrating) *</label>
              <input
                type="text"
                className="form-control"
                placeholder="Masalan: 12345678, 87654321 yoki -10012345678"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                required
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                @salomov_2502 va @Ilhommurodov chat IDlarini vergul bilan ajratib yozing
              </span>
            </div>

            <div className="form-group" style={{ marginTop: '16px' }}>
              <label style={{ marginBottom: '10px', display: 'block' }}>Bildirishnoma Turlari:</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                  <input
                    type="checkbox"
                    checked={notifySale}
                    onChange={(e) => setNotifySale(e.target.checked)}
                  />
                  <span>⚡ Har bir sotuv amalga oshganda chekni adminlarga yuborish</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                  <input
                    type="checkbox"
                    checked={notifyLowStock}
                    onChange={(e) => setNotifyLowStock(e.target.checked)}
                  />
                  <span>⚠️ Ombor zahirasida tovar tugayotganda ogohlantirish</span>
                </label>
              </div>
            </div>
          </div>

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
            <button
              type="button"
              onClick={handleTest}
              className="btn-secondary"
              disabled={isTesting}
              style={{ padding: '8px 14px', fontSize: '13px' }}
            >
              {isTesting ? "Yuborilmoqda..." : "🧪 Adminlarga Test Yuborish"}
            </button>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" onClick={onClose} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '13px' }}>
                Bekor qilish
              </button>
              <button type="submit" className="btn-primary" style={{ padding: '8px 18px', fontSize: '13px' }}>
                💾 Saqlash
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
