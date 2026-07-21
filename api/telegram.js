// Texno & Moto Bozor AI Telegram Bot
// Vercel Serverless Function (Node.js)
// api/telegram.js

import { createClient } from '@supabase/supabase-js';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ALLOWED_CHAT_IDS = new Set(['658069248', '186055944']);

// Supabase client
const getDb = () => createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// === YORDAMCHI FUNKSIYALAR ===

async function sendMessage(chatId, text) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });
}

async function getTelegramFileUrl(fileId) {
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getFile?file_id=${fileId}`);
  const data = await res.json();
  return `https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${data.result.file_path}`;
}

// Ovozni matnga aylantirish — OpenAI Whisper
async function transcribeVoice(fileUrl) {
  const audioRes = await fetch(fileUrl);
  const audioBuffer = await audioRes.arrayBuffer();
  const audioBlob = new Blob([audioBuffer], { type: 'audio/ogg' });

  const form = new FormData();
  form.append('file', audioBlob, 'voice.ogg');
  form.append('model', 'whisper-1');
  form.append('language', 'uz');
  form.append('prompt', 'Texno Bozor Moto Bozor konditsioner muzlatgich kirmashina televizor noutbuk telefon sotildi keldi ombor hisobot');

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_KEY}` },
    body: form,
  });
  const data = await res.json();
  return data.text ?? '';
}

// Rasmdan tovar ma'lumotlarini olish — GPT-4o Vision
async function analyzeProductImage(imageUrl, caption) {
  const prompt = `Bu rasm do'kondagi tovarning rasmi. ${caption ? `Izoh: "${caption}"` : ''}
Faqat JSON qaytarsin:
{"name":"tovar nomi","brand":"brend","model":"model","category":"kategoriya","suggested_price_usd":0}
Kategoriyalar: Smartfonlar, Noutbuklar, Televizorlar, Konditsionerlar, Muzlatgichlar, Kirmashina, Maishiy texnika, Skuterlar, Elektrobayklar, Mopedlar, Moto Aksessuarlar, Ehtiyot qismlar, Aksessuarlar`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 300,
      messages: [{ role: 'user', content: [
        { type: 'image_url', image_url: { url: imageUrl } },
        { type: 'text', text: prompt },
      ]}],
    }),
  });
  const data = await res.json();
  try {
    const text = data.choices?.[0]?.message?.content ?? '{}';
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : { name: "Noma'lum", brand: '', model: '', category: 'Boshqa', suggested_price_usd: 0 };
  } catch { return { name: "Noma'lum", brand: '', model: '', category: 'Boshqa', suggested_price_usd: 0 }; }
}

// Matndan niyatni aniqlash — GPT-4o mini
async function detectIntent(text) {
  const system = `Sen Texno Bozor va Moto Bozor CRM uchun AI yordamchisan.
Faqat JSON qaytarsin:
{"action":"sell|add_stock|list|report|find|unknown","product_query":"qidiruv","quantity":1,"store":"texno|moto|all"}

action:
- sell: sotildi, sotdim, minus (tovar ketdi)
- add_stock: keldi, qoshildi, plus (yangi tovar)
- list: ombor, mavjud, tovarlar, list
- report: hisobot, statistika, daromad, foyda
- find: bor, bormi, qidir, narx
- unknown: boshqa`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 150,
      messages: [{ role: 'system', content: system }, { role: 'user', content: text }],
    }),
  });
  const data = await res.json();
  try {
    const content = data.choices?.[0]?.message?.content ?? '{}';
    const match = content.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : { action: 'unknown', product_query: text, quantity: 1, store: 'all' };
  } catch { return { action: 'unknown', product_query: text, quantity: 1, store: 'all' }; }
}

// Mahsulot qidirish
async function findProduct(query, store) {
  const db = getDb();
  const q = query.toLowerCase().trim();
  let req = db.from('products').select('*')
    .or(`name.ilike.%${q}%,brand.ilike.%${q}%,model.ilike.%${q}%,category.ilike.%${q}%`);
  if (store && store !== 'all') req = req.eq('store_type', store);
  const { data } = await req.order('name').limit(5);
  return data ?? [];
}

// Sotishni qayd etish
async function recordSale(product, qty) {
  const db = getDb();
  const totalAmount = product.selling_price * qty;
  const totalCost = product.cost_price * qty;
  const profit = totalAmount - totalCost;

  const { data } = await db.from('sales').insert([{
    total_amount: totalAmount,
    total_cost: totalCost,
    profit,
    store_type: product.store_type ?? 'texno',
  }]).select().single();

  await db.from('sale_items').insert([{
    sale_id: data.id,
    product_id: product.id,
    quantity: qty,
    cost_price: product.cost_price,
    selling_price: product.selling_price,
  }]);

  const newStock = Math.max(0, product.stock - qty);
  await db.from('products').update({ stock: newStock }).eq('id', product.id);
  return { newStock, profit };
}

// === BUYRUQ HANDLERLARI ===

async function handleSell(chatId, intent) {
  if (!intent.product_query) {
    await sendMessage(chatId, '❓ Qaysi tovar sotildi? Masalan: <b>Samsung TV sotildi</b>');
    return;
  }
  const store = intent.store !== 'all' ? intent.store : undefined;
  const products = await findProduct(intent.product_query, store);

  if (products.length === 0) {
    await sendMessage(chatId, `😕 <b>"${intent.product_query}"</b> omborda topilmadi.\nTovar nomini to'liq yozing yoki /ombor ni tekshiring.`);
    return;
  }
  if (products.length > 1) {
    const list = products.map((p, i) => `${i + 1}. ${p.name} (${p.stock} dona)`).join('\n');
    await sendMessage(chatId, `📦 Bir nechta topildi:\n\n${list}\n\nTo'liqroq nom yozing.`);
    return;
  }

  const product = products[0];
  const qty = intent.quantity || 1;

  if (product.stock < qty) {
    await sendMessage(chatId, `⚠️ <b>${product.name}</b> omborda faqat <b>${product.stock} dona</b> bor (so'ralgan: ${qty})`);
    return;
  }

  const { newStock, profit } = await recordSale(product, qty);
  const profitUzs = Math.round(profit * 12800);
  const storeIcon = product.store_type === 'moto' ? '🏍️ Moto Bozor' : '⚡ Texno Bozor';

  await sendMessage(chatId,
    `✅ <b>SOTUV AMALGA OSHDI!</b>\n\n` +
    `📦 <b>${product.name}</b>\n` +
    `🏪 ${storeIcon}\n` +
    `🔢 Miqdor: <b>${qty} dona</b>\n` +
    `📊 Ombor: ${product.stock} → <b>${newStock} dona</b>\n` +
    `💰 Narx: $${product.selling_price.toFixed(2)}\n` +
    `📈 Foyda: <b>+$${profit.toFixed(2)}</b> (~${profitUzs.toLocaleString()} so'm)\n` +
    `🕐 ${new Date().toLocaleString('uz-UZ')}`
  );

  if (newStock === 0) {
    await sendMessage(chatId, `🔴 <b>DIQQAT!</b> ${product.name} ombor TUGADI! Yangi buyurtma bering.`);
  } else if (newStock <= 3) {
    await sendMessage(chatId, `🟡 <b>OGOHLANTIRISH:</b> ${product.name} faqat <b>${newStock} ta</b> qoldi!`);
  }
}

async function handleAddStock(chatId, intent) {
  if (!intent.product_query) {
    await sendMessage(chatId, '❓ Qaysi tovar keldi? Masalan: <b>iPhone 15 5 ta keldi</b>');
    return;
  }
  const store = intent.store !== 'all' ? intent.store : undefined;
  const products = await findProduct(intent.product_query, store);

  if (products.length === 0) {
    await sendMessage(chatId, `❓ <b>"${intent.product_query}"</b> topilmadi.\n\nYangi tovar bo'lsa rasm yuboring — AI avtomatik qo'shadi! 📷`);
    return;
  }

  const product = products[0];
  const qty = intent.quantity || 1;
  const newStock = product.stock + qty;
  const db = getDb();
  await db.from('products').update({ stock: newStock }).eq('id', product.id);

  await sendMessage(chatId,
    `✅ <b>OMBOR YANGILANDI!</b>\n\n` +
    `📦 <b>${product.name}</b>\n` +
    `➕ Qo'shildi: <b>+${qty} dona</b>\n` +
    `📊 Yangi zahira: ${product.stock} → <b>${newStock} dona</b>\n` +
    `🕐 ${new Date().toLocaleString('uz-UZ')}`
  );
}

async function handleList(chatId, store) {
  const db = getDb();
  let q = db.from('products').select('*').order('stock', { ascending: true });
  if (store !== 'all') q = q.eq('store_type', store);
  const { data: products } = await q;

  if (!products?.length) { await sendMessage(chatId, '📦 Ombor bo\'sh.'); return; }

  const totalItems = products.reduce((s, p) => s + (p.stock || 0), 0);
  const totalValue = products.reduce((s, p) => s + (p.stock || 0) * (p.selling_price || 0), 0);
  const lowStock = products.filter(p => p.stock <= 3);

  let msg = `📦 <b>OMBOR HOLATI</b>\n`;
  msg += `📊 ${products.length} xil tovar | ${totalItems} dona jami\n`;
  msg += `💰 Qiymat: ~$${totalValue.toFixed(0)}\n\n`;

  if (lowStock.length > 0) {
    msg += `⚠️ <b>Kam qolganlar:</b>\n`;
    lowStock.forEach(p => { msg += `• ${p.name}: <b>${p.stock} dona</b> 🔴\n`; });
    msg += '\n';
  }

  msg += `<b>Tovarlar:</b>\n`;
  products.slice(0, 20).forEach(p => {
    const icon = p.stock === 0 ? '🔴' : p.stock <= 3 ? '🟡' : '🟢';
    msg += `${icon} ${p.name} — <b>${p.stock} dona</b> | $${(p.selling_price || 0).toFixed(0)}\n`;
  });
  if (products.length > 20) msg += `\n...va yana ${products.length - 20} ta tovar`;

  await sendMessage(chatId, msg);
}

async function handleReport(chatId, store) {
  const db = getDb();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let q = db.from('sales').select('*').gte('created_at', today.toISOString());
  if (store !== 'all') q = q.eq('store_type', store);
  const { data: sales } = await q;

  const rev = (sales ?? []).reduce((s, x) => s + (parseFloat(x.total_amount) || 0), 0);
  const profit = (sales ?? []).reduce((s, x) => s + (parseFloat(x.profit) || 0), 0);
  const storeLabel = store === 'moto' ? '🏍️ Moto Bozor' : store === 'texno' ? '⚡ Texno Bozor' : '🌐 Barcha';

  await sendMessage(chatId,
    `📊 <b>BUGUNGI HISOBOT</b>\n` +
    `📅 ${today.toLocaleDateString('uz-UZ', { day: '2-digit', month: 'long' })}\n` +
    `🏪 ${storeLabel}\n\n` +
    `🧾 Savdolar: <b>${(sales ?? []).length} ta</b>\n` +
    `💵 Tushum: <b>$${rev.toFixed(2)}</b>\n` +
    `📈 Foyda: <b>+$${profit.toFixed(2)}</b> (~${Math.round(profit * 12800).toLocaleString()} so'm)`
  );
}

async function handlePhoto(chatId, fileId, caption) {
  await sendMessage(chatId, '🔍 Rasm tahlil qilinmoqda...');
  const fileUrl = await getTelegramFileUrl(fileId);
  const info = await analyzeProductImage(fileUrl, caption);
  const db = getDb();

  const isMoto = ['skuterlar','mopedlar','elektrobayklar','moto'].some(k => (info.category || '').toLowerCase().includes(k));

  await db.from('products').insert([{
    name: info.name,
    brand: info.brand || info.name.split(' ')[0],
    model: info.model || '',
    category: info.category,
    store_type: isMoto ? 'moto' : 'texno',
    stock: 1,
    cost_price: (info.suggested_price_usd || 0) * 0.8,
    selling_price: info.suggested_price_usd || 0,
    image_url: fileUrl,
    sku: `SKU-${Date.now().toString().slice(-6)}`,
  }]);

  await sendMessage(chatId,
    `✅ <b>TOVAR QOSHILDI!</b>\n\n` +
    `📦 <b>${info.name}</b>\n` +
    `🏷️ Brend: ${info.brand || '—'}\n` +
    `📁 Kategoriya: ${info.category}\n` +
    `🏪 Do'kon: ${isMoto ? '🏍️ Moto Bozor' : '⚡ Texno Bozor'}\n` +
    `💲 Taxminiy narx: $${info.suggested_price_usd}\n` +
    `📦 Zahira: 1 dona\n\n` +
    `✏️ Narx yoki miqdorni o'zgartirish uchun CRM ga kiring.`
  );
}

async function processIntent(chatId, intent, originalText) {
  switch (intent.action) {
    case 'sell': await handleSell(chatId, intent); break;
    case 'add_stock': await handleAddStock(chatId, intent); break;
    case 'list': await handleList(chatId, intent.store || 'all'); break;
    case 'report': await handleReport(chatId, intent.store || 'all'); break;
    case 'find': {
      const found = await findProduct(intent.product_query);
      if (!found.length) { await sendMessage(chatId, `😕 <b>"${intent.product_query}"</b> topilmadi.`); break; }
      const list = found.map(p =>
        `${p.stock === 0 ? '🔴' : p.stock <= 3 ? '🟡' : '🟢'} <b>${p.name}</b> — ${p.stock} dona | $${(p.selling_price || 0).toFixed(0)}`
      ).join('\n');
      await sendMessage(chatId, `🔍 <b>Topildi:</b>\n\n${list}`);
      break;
    }
    default:
      await sendMessage(chatId,
        `❓ Tushunmadim: "<i>${originalText}</i>"\n\n` +
        `Misollar:\n• <code>Samsung TV sotildi</code>\n• <code>iPhone 3 ta keldi</code>\n• <code>ombor</code> yoki <code>hisobot</code>\n• 🎤 Ovozli xabar\n• 📷 Tovar rasmi`
      );
  }
}

// === ASOSIY HANDLER ===
export default async function handler(req, res) {
  // Avtomatik Kunlik Hisobot (Har kuni soat 23:00 da Vercel Cron orqali)
  const isCron = req.query?.cron === 'daily_report' || (req.url && req.url.includes('cron=daily_report'));
  if (isCron) {
    try {
      for (const id of Array.from(ALLOWED_CHAT_IDS)) {
        await handleReport(id, 'all');
      }
      res.status(200).json({ ok: true, message: "23:00 Kunlik hisobot yuborildi." });
      return;
    } catch (e) {
      console.error("Cron report error:", e);
      res.status(500).json({ ok: false, error: e.message });
      return;
    }
  }

  if (req.method !== 'POST') { res.status(200).json({ ok: true }); return; }

  try {
    const body = req.body;
    const message = body?.message || body?.edited_message;
    if (!message) { res.status(200).json({ ok: true }); return; }

    const chatId = String(message.chat?.id ?? '');
    const text = message.text ?? message.caption ?? '';

    if (!ALLOWED_CHAT_IDS.has(chatId)) {
      await sendMessage(chatId, '⛔ Bu bot faqat do\'kon adminlari uchun!');
      res.status(200).json({ ok: true }); return;
    }

    // /start yoki /help
    if (text === '/start' || text === '/help') {
      await sendMessage(chatId,
        `⚡ <b>Texno & Moto Bozor AI Bot</b> 🏍️\n\n` +
        `<b>Matn buyruqlari:</b>\n` +
        `📦 <code>Samsung TV sotildi</code>\n` +
        `📦 <code>Artel 2 ta sotildi</code>\n` +
        `📥 <code>iPhone 5 ta keldi</code>\n` +
        `📋 <code>ombor</code> — barcha tovarlar\n` +
        `📊 <code>hisobot</code> — bugungi savdo\n` +
        `🔍 <code>Samsung bormi</code>\n\n` +
        `🎤 <b>Ovozli xabar</b> — gapiring, AI eshitadi!\n` +
        `📷 <b>Rasm</b> — AI tovarni taniydi va qo'shadi!`
      );
      res.status(200).json({ ok: true }); return;
    }

    if (text === '/ombor' || text === '/list') { await handleList(chatId, 'all'); res.status(200).json({ ok: true }); return; }
    if (text === '/hisobot' || text === '/report') { await handleReport(chatId, 'all'); res.status(200).json({ ok: true }); return; }

    // Rasm
    if (message.photo) {
      const photo = message.photo[message.photo.length - 1];
      await handlePhoto(chatId, photo.file_id, text);
      res.status(200).json({ ok: true }); return;
    }

    // Ovoz
    if (message.voice || message.audio) {
      const fileId = message.voice?.file_id ?? message.audio?.file_id;
      await sendMessage(chatId, '🎤 Ovoz tahlil qilinmoqda...');
      try {
        const fileUrl = await getTelegramFileUrl(fileId);
        const transcribed = await transcribeVoice(fileUrl);
        if (!transcribed.trim()) { await sendMessage(chatId, '😕 Ovoz aniq eshitilmadi. Qayta gapiring.'); res.status(200).json({ ok: true }); return; }
        await sendMessage(chatId, `🗣️ Eshitildi: <i>"${transcribed}"</i>`);
        const intent = await detectIntent(transcribed);
        await processIntent(chatId, intent, transcribed);
      } catch (e) { await sendMessage(chatId, `❌ Xatolik: ${e.message}`); }
      res.status(200).json({ ok: true }); return;
    }

    // Matn
    if (text.trim()) {
      const intent = await detectIntent(text);
      await processIntent(chatId, intent, text);
    }

  } catch (err) { console.error('Bot xatolik:', err); }

  res.status(200).json({ ok: true });
}
