// Telegram Webhook o'rnatish uchun Supabase Edge Function
// Bu funksiya faqat bir marta ishga tushiriladi

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

serve(async (req: Request) => {
  const TELEGRAM_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? '';
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';

  // telegram-bot funksiyasining URL manzili
  // Format: https://<project-ref>.supabase.co/functions/v1/telegram-bot
  const projectRef = SUPABASE_URL.replace('https://', '').replace('.supabase.co', '');
  const webhookUrl = `https://${projectRef}.supabase.co/functions/v1/telegram-bot`;

  const res = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_TOKEN}/setWebhook`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: webhookUrl }),
    }
  );

  const result = await res.json();

  return new Response(JSON.stringify({
    webhook_url: webhookUrl,
    telegram_response: result,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
