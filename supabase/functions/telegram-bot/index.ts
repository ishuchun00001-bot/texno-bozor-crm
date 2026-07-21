// Texno & Moto Bozor AI Telegram Bot
// Supabase Edge Function (Deno runtime)
// Qo'llab-quvvatlaydi: Matn, Ovoz (STT), Rasm (Vision) buyruqlari

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// === MUHIT O'ZGARUVCHILARI ===
const TELEGRAM_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? '';
const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

// Ruxsat etilgan adminlar (Chat ID)
const ALLOWED_CHAT_IDS = new Set(['658069248', '186055944']);

// Supabase client (service role - to'liq huquq)
const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ============================================================
// YORDAMCHI FUNKSIYALAR
// ============================================================

/** Telegramga xabar yuborish */
async function sendMessage(chatId: string | number, text: string, parseMode = 'HTML') {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: parseMode }),
  });
}

/** Telegram faylini yuklab olish */
async function getTelegramFileUrl(fileId: string): Promise<string> {
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getFile?file_id=${fileId}`);
  const data = await res.json();
  return `https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${data.result.file_path}`;
}

/** Ovozni matnga aylantirish — OpenAI Whisper */
async function transcribeVoice(fileUrl: string): Promise<string> {
  // Faylni yuklab olish
  const audioRes = await fetch(fileUrl);
  const audioBlob = await audioRes.blob();

  const form = new FormData();
  form.append('file', audioBlob, 'voice.ogg');
  form.append('model', 'whisper-1');
  form.append('language', 'uz'); // O'zbek tili (Whisper uni tushunadi)
  form.append('prompt', 'Texno Bozor, Moto Bozor, konditsioner, muzlatgich, kirmashina, televizor, noutbuk, telefon, sotildi, keldi, omborni ko\'rsat'); // Kontekst

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_KEY}` },
    body: form,
  });
  const data = await res.json();
  return data.text ?? '';
}

/** Rasmdan tovar ma'lumotlarini olish — GPT-4o Vision */
async function analyzeProductImage(imageUrl: string, caption: string): Promise<{
  name: string; brand: string; model: string; category: string; suggested_price_usd: number;
}> {
  const prompt = `Bu rasm Texno Bozor yoki Moto Bozorga tegishli tovarning rasmi.
${caption ? `Qo'shimcha ma'lumot: "${caption}"` : ''}

Rasmni tahlil qilib quyidagi JSON formatda javob ber (boshqa hech narsa yozma):
{
  "name": "Tovar nomi (o'zbekcha yoki ruscha)",
  "brand": "Brend nomi",
  "model": "Model raqami yoki kodi (bo'lsa)",
  "category": "Kategoriya (Smartfonlar/Noutbuklar/Televizorlar/Maishiy texnika/Konditsionerlar/Muzlatgichlar/Kirmashina/Skuterlar/Elektrobayklar/Mopedlar/Moto Aksessuarlar/Ehtiyot qismlar/Aksessuarlar)",
  "suggested_price_usd": 0
}`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageUrl } },
            { type: 'text', text: prompt },
          ],
        },
      ],
    }),
  });
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? '{}';
  try {
    // JSON ni ajratib olish (ba'zan GPT markdown bloklar bilan qaytaradi)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { name: 'Noma\'lum', brand: '', model: '', category: 'Boshqa', suggested_price_usd: 0 };
  } catch {
    return { name: 'Noma\'lum', brand: '', model: '', category: 'Boshqa', suggested_price_usd: 0 };
  }
}

/** Matndan niyatni aniqlash — GPT-4o mini */
async function detectIntent(text: string): Promise<{
  action: 'sell' | 'add_stock' | 'list' | 'report' | 'find' | 'unknown';
  product_query: string;
  quantity: number;
  store: 'texno' | 'moto' | 'all';
  price_usd?: number;
}> {
  const systemPrompt = `Sen Texno Bozor va Moto Bozor CRM tizimi uchun AI yordamchisan.
Foydalanuvchi o'zbek, rus yoki ingliz tilida buyruq yozadi.

Quyidagi JSON formatda javob ber (boshqa hech narsa yozma):
{
  "action": "sell" | "add_stock" | "list" | "report" | "find" | "unknown",
  "product_query": "qidiruv so'zi",
  "quantity": 1,
  "store": "texno" | "moto" | "all",
  "price_usd": null
}

action turlari:
- sell: tovar sotilganda (sotildi, sotdim, minus, -1, sold)
- add_stock: yangi tovar kelganda (keldi, qo'shildi, omborga, +, yangi)
- list: omborni ko'rish (ombor, list, tovarlar, mavjud)
- report: hisobot (hisobot, statistika, report, daromad, foyda)
- find: tovar qidirish (bor, bormi, qidir, narx)
- unknown: tushunarsiz buyruq`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 200,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text },
      ],
    }),
  });
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? '{}';
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { action: 'unknown', product_query: text, quantity: 1, store: 'all' };
  } catch {
    return { action: 'unknown', product_query: text, quantity: 1, store: 'all' };
  }
}

/** Mahsulotni bazadan qidirish */
async function findProduct(query: string, store?: string) {
  const q = query.toLowerCase().trim();

  let supaQuery = db
    .from('products')
    .select('*')
    .or(`name.ilike.%${q}%,brand.ilike.%${q}%,model.ilike.%${q}%,category.ilike.%${q}%`);

  if (store && store !== 'all') {
    supaQuery = supaQuery.eq('store_type', store);
  }

  const { data, error } = await supaQuery.order('name').limit(5);
  if (error) throw error;
  return data ?? [];
}

/** Savdo tarixi qo'shish */
async function recordSale(product: Record<string, unknown>, qty: number) {
  const totalAmount = (product.selling_price as number) * qty;
  const totalCost = (product.cost_price as number) * qty;

  const { data, error: saleError } = await db
    .from('sales')
    .insert([{
      total_amount: totalAmount,
      total_cost: totalCost,
      profit: totalAmount - totalCost,
      store_type: product.store_type ?? 'texno',
    }])
    .select()
    .single();

  if (saleError) throw saleError;

  await db.from('sale_items').insert([{
    sale_id: data.id,
    product_id: product.id,
    quantity: qty,
    cost_price: product.cost_price,
    selling_price: product.selling_price,
  }]);

  // Ombordagi sonni kamaytirish
  const newStock = Math.max(0, (product.stock as number) - qty);
  await db.from('products').update({ stock: newStock }).eq('id', product.id);

  return { newStock, profit: totalAmount - totalCost };
}

// ============================================================
// BUYRUQ HANDLERLARI
// ============================================================

/** Sotildi — ombor kamaytirish */
async function handleSell(chatId: string, intent: ReturnType<typeof detectIntent> extends Promise<infer T> ? T : never) {
  if (!intent.product_query) {
    await sendMessage(chatId, '❓ Qaysi tovar sotildi? Masalan: <b>Samsung TV sotildi</b>');
    return;
  }

  const products = await findProduct(intent.product_query, intent.store !== 'all' ? intent.store : undefined);

  if (products.length === 0) {
    await sendMessage(chatId, `😕 <b>"${intent.product_query}"</b> — omborda topilmadi.\n\nTovar nomini to'liq yozing yoki omborni tekshiring: /ombor`);
    return;
  }

  if (products.length > 1) {
    const list = products.map((p, i) => `${i + 1}. ${p.name} (${p.stock} dona) — /sell_${p.id.replace(/-/g, '_')}`).join('\n');
    await sendMessage(chatId, `📦 Bir nechta tovar topildi, birini tanlang:\n\n${list}`);
    return;
  }

  const product = products[0];
  const qty = intent.quantity || 1;

  if ((product.stock as number) < qty) {
    await sendMessage(chatId, `⚠️ <b>${product.name}</b> uchun omborda faqat <b>${product.stock} dona</b> mavjud (so'ralgan: ${qty} ta)`);
    return;
  }

  const { newStock, profit } = await recordSale(product, qty);
  const profitUzs = Math.round((profit as number) * 12800);

  await sendMessage(chatId,
    `✅ <b>SOTUV AMALGA OSHDI!</b>\n\n` +
    `📦 Tovar: <b>${product.name}</b>\n` +
    `🏷️ Brend: ${product.brand || '—'}\n` +
    `🏪 Do'kon: ${product.store_type === 'moto' ? '🏍️ Moto Bozor' : '⚡ Texno Bozor'}\n` +
    `🔢 Miqdor: <b>${qty} dona</b>\n` +
    `📊 Ombor: ${(product.stock as number)} → <b>${newStock} dona</b>\n` +
    `💰 Sotish narxi: $${(product.selling_price as number).toFixed(2)}\n` +
    `📈 Sof foyda: <b>+$${(profit as number).toFixed(2)}</b> (~${profitUzs.toLocaleString()} so'm)\n` +
    `📅 Sana: ${new Date().toLocaleString('uz-UZ')}`
  );

  // Kam qolganini ogohlantirish
  if (newStock <= 3 && newStock > 0) {
    await sendMessage(chatId, `⚠️ <b>OGOHLANTIRISH:</b> ${product.name} omborda faqat <b>${newStock} ta</b> qoldi! Yangi buyurtma bering.`);
  } else if (newStock === 0) {
    await sendMessage(chatId, `🔴 <b>DIQQAT:</b> ${product.name} ombor tugadi! Darhol yangi buyurtma bering.`);
  }
}

/** Ombor ko'rish */
async function handleList(chatId: string, store: string) {
  let query = db.from('products').select('*').order('stock', { ascending: true });
  if (store !== 'all') query = query.eq('store_type', store);

  const { data: products } = await query;
  if (!products || products.length === 0) {
    await sendMessage(chatId, '📦 Ombor bo\'sh yoki tovarlar topilmadi.');
    return;
  }

  const lowStock = products.filter(p => (p.stock as number) <= 3);
  const totalItems = products.reduce((s, p) => s + (p.stock as number), 0);
  const totalValue = products.reduce((s, p) => s + (p.stock as number) * (p.selling_price as number), 0);

  let msg = `📦 <b>OMBOR HOLATI</b>\n`;
  msg += `📊 Jami: ${products.length} xil tovar, ${totalItems} dona\n`;
  msg += `💰 Ombor qiymati: ~$${totalValue.toFixed(0)}\n\n`;

  if (lowStock.length > 0) {
    msg += `⚠️ <b>Kam qolganlar (≤3 dona):</b>\n`;
    lowStock.forEach(p => {
      msg += `• ${p.name}: <b>${p.stock} dona</b> 🔴\n`;
    });
    msg += '\n';
  }

  msg += `<b>Barcha tovarlar:</b>\n`;
  products.slice(0, 20).forEach(p => {
    const icon = (p.stock as number) === 0 ? '🔴' : (p.stock as number) <= 3 ? '🟡' : '🟢';
    msg += `${icon} ${p.name} — <b>${p.stock} dona</b> | $${(p.selling_price as number).toFixed(0)}\n`;
  });

  if (products.length > 20) {
    msg += `\n... va yana ${products.length - 20} ta tovar`;
  }

  await sendMessage(chatId, msg);
}

/** Kunlik hisobot */
async function handleReport(chatId: string, store: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let query = db.from('sales').select('*').gte('created_at', today.toISOString());
  if (store !== 'all') query = query.eq('store_type', store);

  const { data: sales } = await query;

  const totalRevenue = (sales ?? []).reduce((s, sale) => s + (parseFloat(sale.total_amount) || 0), 0);
  const totalProfit = (sales ?? []).reduce((s, sale) => s + (parseFloat(sale.profit) || 0), 0);
  const totalProfitUzs = Math.round(totalProfit * 12800);

  const msg =
    `📊 <b>BUGUNGI HISOBOT</b>\n` +
    `📅 ${today.toLocaleDateString('uz-UZ', { day: '2-digit', month: 'long', year: 'numeric' })}\n` +
    `🏪 Do'kon: ${store === 'moto' ? '🏍️ Moto Bozor' : store === 'texno' ? '⚡ Texno Bozor' : '🌐 Barcha'}\n\n` +
    `🧾 Savdolar soni: <b>${(sales ?? []).length} ta</b>\n` +
    `💵 Jami tushum: <b>$${totalRevenue.toFixed(2)}</b>\n` +
    `📈 Sof foyda: <b>+$${totalProfit.toFixed(2)}</b>\n` +
    `🏦 Foyda (so'm): <b>~${totalProfitUzs.toLocaleString()} so'm</b>`;

  await sendMessage(chatId, msg);
}

/** Yangi tovar qo'shish */
async function handleAddStock(chatId: string, intent: ReturnType<typeof detectIntent> extends Promise<infer T> ? T : never) {
  if (!intent.product_query) {
    await sendMessage(chatId, '❓ Qaysi tovar keldi? Masalan: <b>Samsung TV 3 ta keldi</b>');
    return;
  }

  const products = await findProduct(intent.product_query, intent.store !== 'all' ? intent.store : undefined);

  if (products.length === 0) {
    await sendMessage(chatId, `❓ <b>"${intent.product_query}"</b> topilmadi.\n\nYangi tovar sifatida qo'shish uchun rasm yuboring yoki to'liq ma'lumot kiriting:\n<code>Tovar nomi | Brend | Narx$ | Miqdor</code>`);
    return;
  }

  const product = products[0];
  const qty = intent.quantity || 1;
  const newStock = (product.stock as number) + qty;

  await db.from('products').update({ stock: newStock }).eq('id', product.id);

  await sendMessage(chatId,
    `✅ <b>OMBOR YANGILANDI!</b>\n\n` +
    `📦 Tovar: <b>${product.name}</b>\n` +
    `🏷️ Brend: ${product.brand || '—'}\n` +
    `🔢 Qo'shildi: <b>+${qty} dona</b>\n` +
    `📊 Yangi zahira: ${(product.stock as number)} → <b>${newStock} dona</b>\n` +
    `📅 Sana: ${new Date().toLocaleString('uz-UZ')}`
  );
}

/** Rasm orqali yangi tovar qo'shish */
async function handlePhotoProduct(chatId: string, photoFileId: string, caption: string) {
  await sendMessage(chatId, '🔍 Rasm tahlil qilinmoqda, biroz kuting...');

  const fileUrl = await getTelegramFileUrl(photoFileId);
  const info = await analyzeProductImage(fileUrl, caption);

  // Foydalanuvchi tasdiqlashi uchun preview
  const previewMsg =
    `🤖 <b>AI tovar ma'lumotlarini aniqladi:</b>\n\n` +
    `📦 Nomi: <b>${info.name}</b>\n` +
    `🏷️ Brend: <b>${info.brand || 'Noma\'lum'}</b>\n` +
    `🔢 Model: <b>${info.model || '—'}</b>\n` +
    `📁 Kategoriya: <b>${info.category}</b>\n` +
    `💲 Taxminiy narx: <b>$${info.suggested_price_usd}</b>\n\n` +
    `✏️ Qo'shimcha ma'lumot kiriting yoki tasdiqlang:\n` +
    `<code>tasdiq | Soni | Kirim narxi$ | Sotish narxi$</code>\n\n` +
    `Misol: <code>tasdiq | 5 | 280 | 350</code>`;

  // Vaqtinchalik ma'lumotni saqlash (keyingi xabarda qayta ishlatish uchun)
  await db.from('products').insert([{
    name: info.name,
    brand: info.brand,
    model: info.model,
    category: info.category,
    store_type: info.category.toLowerCase().includes('moto') || info.category.toLowerCase().includes('skuter') || info.category.toLowerCase().includes('moped') ? 'moto' : 'texno',
    stock: 0, // Hali kiritilmagan
    cost_price: info.suggested_price_usd * 0.8,
    selling_price: info.suggested_price_usd,
    image_url: fileUrl,
    sku: `SKU-${Date.now().toString().slice(-6)}`,
  }]);

  await sendMessage(chatId, previewMsg + '\n\n✅ Tovar bazaga qo\'shildi (zahira: 0). Miqdor va narxni yangilash uchun quyida ko\'rsatilgan formatda yuboring.');
}

// ============================================================
// ASOSIY HANDLER
// ============================================================

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('OK', { status: 200 });
  }

  try {
    const body = await req.json();
    const message = body?.message || body?.edited_message;
    if (!message) return new Response('OK', { status: 200 });

    const chatId = String(message.chat?.id ?? '');
    const fromId = String(message.from?.id ?? '');
    const text = message.text ?? message.caption ?? '';

    // Ruxsat tekshirish
    if (!ALLOWED_CHAT_IDS.has(chatId) && !ALLOWED_CHAT_IDS.has(fromId)) {
      await sendMessage(chatId, '⛔ Kechirasiz, bu bot faqat do\'kon adminlari uchun!');
      return new Response('OK', { status: 200 });
    }

    // /start yoki /help
    if (text === '/start' || text === '/help') {
      await sendMessage(chatId,
        `⚡ <b>Texno & Moto Bozor AI Bot</b> 🏍️\n\n` +
        `<b>Matnli buyruqlar:</b>\n` +
        `📦 <code>Samsung TV sotildi</code> — ombor -1\n` +
        `📦 <code>Artel konditsioner 2 ta sotildi</code> — ombor -2\n` +
        `📥 <code>iPhone 15 3 ta keldi</code> — ombor +3\n` +
        `📋 <code>ombor</code> — barcha tovarlar ro'yxati\n` +
        `📊 <code>hisobot</code> — bugungi savdo hisoboti\n` +
        `🔍 <code>Samsung bormi</code> — tovar qidirish\n\n` +
        `<b>Ovozli buyruq:</b>\n` +
        `🎤 Mikrofon tugmasini bosib gapiring!\n\n` +
        `<b>Rasm orqali qo'shish:</b>\n` +
        `📷 Tovar rasmini yuboring — AI avtomatik taniydi!`
      );
      return new Response('OK', { status: 200 });
    }

    // /ombor shortcut
    if (text === '/ombor' || text === '/list') {
      await handleList(chatId, 'all');
      return new Response('OK', { status: 200 });
    }

    // /hisobot shortcut
    if (text === '/hisobot' || text === '/report') {
      await handleReport(chatId, 'all');
      return new Response('OK', { status: 200 });
    }

    // Rasm yuborilsa
    if (message.photo) {
      const bestPhoto = message.photo[message.photo.length - 1]; // Eng yuqori sifatli
      await handlePhotoProduct(chatId, bestPhoto.file_id, text);
      return new Response('OK', { status: 200 });
    }

    // Ovozli xabar
    if (message.voice || message.audio) {
      const fileId = message.voice?.file_id ?? message.audio?.file_id;
      await sendMessage(chatId, '🎤 Ovoz tahlil qilinmoqda...');

      try {
        const fileUrl = await getTelegramFileUrl(fileId);
        const transcribedText = await transcribeVoice(fileUrl);

        if (!transcribedText.trim()) {
          await sendMessage(chatId, '😕 Ovoz aniq eshitilmadi. Iltimos, qayta gapiring yoki yozing.');
          return new Response('OK', { status: 200 });
        }

        await sendMessage(chatId, `🗣️ Eshitildi: <i>"${transcribedText}"</i>`);

        // Matn kabi davom etish
        const intent = await detectIntent(transcribedText);
        await processIntent(chatId, intent, transcribedText);

      } catch (err) {
        await sendMessage(chatId, `❌ Ovoz tahlilida xatolik: ${(err as Error).message}`);
      }

      return new Response('OK', { status: 200 });
    }

    // Matnli xabar
    if (text.trim()) {
      const intent = await detectIntent(text);
      await processIntent(chatId, intent, text);
    }

  } catch (err) {
    console.error('Bot xatolik:', err);
  }

  return new Response('OK', { status: 200 });
});

/** Niyatni bajarish */
async function processIntent(
  chatId: string,
  intent: { action: string; product_query: string; quantity: number; store: string; price_usd?: number },
  originalText: string
) {
  switch (intent.action) {
    case 'sell':
      await handleSell(chatId, intent as Parameters<typeof handleSell>[1]);
      break;
    case 'add_stock':
      await handleAddStock(chatId, intent as Parameters<typeof handleAddStock>[1]);
      break;
    case 'list':
      await handleList(chatId, intent.store || 'all');
      break;
    case 'report':
      await handleReport(chatId, intent.store || 'all');
      break;
    case 'find': {
      const found = await findProduct(intent.product_query, intent.store !== 'all' ? intent.store : undefined);
      if (found.length === 0) {
        await sendMessage(chatId, `😕 <b>"${intent.product_query}"</b> omborda topilmadi.`);
      } else {
        const list = found.map(p =>
          `${p.stock === 0 ? '🔴' : p.stock <= 3 ? '🟡' : '🟢'} <b>${p.name}</b>\n` +
          `   💰 $${(p.selling_price as number).toFixed(0)} | 📦 ${p.stock} dona | ${p.store_type === 'moto' ? '🏍️ Moto' : '⚡ Texno'}`
        ).join('\n\n');
        await sendMessage(chatId, `🔍 <b>Topildi:</b>\n\n${list}`);
      }
      break;
    }
    default:
      await sendMessage(chatId,
        `❓ Tushunmadim: "<i>${originalText}</i>"\n\n` +
        `📌 Misollar:\n` +
        `• <code>Samsung TV sotildi</code>\n` +
        `• <code>Artel konditsioner 2 ta keldi</code>\n` +
        `• <code>ombor</code> yoki <code>hisobot</code>\n` +
        `• Yoki 🎤 ovozli xabar yuboring`
      );
  }
}
