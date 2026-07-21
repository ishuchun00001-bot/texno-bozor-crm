-- Texno Bozor CRM Tizimi uchun Supabase SQL Jadval tuzilmalari

-- 1. Tovarlar jadvali (products)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    brand TEXT,
    model TEXT,
    sku TEXT UNIQUE,
    category TEXT,
    store_type TEXT DEFAULT 'texno',
    stock INTEGER DEFAULT 0,
    cost_price NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    selling_price NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Mavjud jadvallar uchun ustunlarni qo'shish (agar jadval allaqachon yaratilgan bo'lsa)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS store_type TEXT DEFAULT 'texno';

-- Row Level Security (RLS) ni yoqish (ixtiyoriy, agar kerak bo'lsa)
-- Biz hozircha jamoat uchun ruxsat beramiz yoki RLS ni o'chirib turamiz
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- 2. Sotuvlar jami hisoboti jadvali (sales)
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_type TEXT DEFAULT 'texno',
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_cost NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    profit NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS store_type TEXT DEFAULT 'texno';
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- 3. Sotilgan tovarlar tafsilotlari jadvali (sale_items)
CREATE TABLE IF NOT EXISTS public.sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    cost_price NUMERIC(15, 2) NOT NULL,
    selling_price NUMERIC(15, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

-- 4. Barcha foydalanuvchilar (anonim va autentifikatsiyadan o'tganlar) uchun to'liq ruxsat berish
-- (Lokal CRM bo'lgani uchun va RLS sozlashni osonlashtirish uchun)
CREATE POLICY "Allow all read to products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Allow all insert to products" ON public.products FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update to products" ON public.products FOR UPDATE USING (true);
CREATE POLICY "Allow all delete to products" ON public.products FOR DELETE USING (true);

CREATE POLICY "Allow all read to sales" ON public.sales FOR SELECT USING (true);
CREATE POLICY "Allow all insert to sales" ON public.sales FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update to sales" ON public.sales FOR UPDATE USING (true);
CREATE POLICY "Allow all delete to sales" ON public.sales FOR DELETE USING (true);

CREATE POLICY "Allow all read to sale_items" ON public.sale_items FOR SELECT USING (true);
CREATE POLICY "Allow all insert to sale_items" ON public.sale_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update to sale_items" ON public.sale_items FOR UPDATE USING (true);
CREATE POLICY "Allow all delete to sale_items" ON public.sale_items FOR DELETE USING (true);

-- 5. Storage (product-images bucket) sozlamalari
-- Supabase-da Storage bo'limiga kirib "product-images" nomli yangi PUBLIC bucket yaratishingiz kerak.
-- O'sha bucket uchun xavfsizlik qoidalarini (Policies) to'liq (Read/Write/Delete) ruxsat etib o'rnatish lozim.
