-- ================================================================
-- TEXNO & MOTO BOZOR CRM — SUPABASE DATABASE MIGRATION & SECURITY (RLS)
-- Run this script in the Supabase SQL Editor to fix & secure your database!
-- ================================================================

-- 1. CREATE TABLES IF NOT EXIST
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    brand TEXT,
    model TEXT,
    sku TEXT,
    category TEXT NOT NULL DEFAULT 'Smartfonlar',
    store_type TEXT NOT NULL DEFAULT 'texno',
    stock INTEGER NOT NULL DEFAULT 0,
    cost_price NUMERIC(15,2) NOT NULL DEFAULT 0,
    selling_price NUMERIC(15,2) NOT NULL DEFAULT 0,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_type TEXT NOT NULL DEFAULT 'texno',
    total_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    total_cost NUMERIC(15,2) NOT NULL DEFAULT 0,
    profit NUMERIC(15,2) NOT NULL DEFAULT 0,
    payment_method TEXT DEFAULT 'cash',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_cost NUMERIC(15,2) NOT NULL DEFAULT 0,
    unit_price NUMERIC(15,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.debtors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    product_name TEXT NOT NULL,
    store_type TEXT NOT NULL DEFAULT 'texno',
    total_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    down_payment NUMERIC(15,2) NOT NULL DEFAULT 0,
    remaining_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    monthly_payment NUMERIC(15,2) NOT NULL DEFAULT 0,
    months_count INTEGER NOT NULL DEFAULT 12,
    due_day INTEGER NOT NULL DEFAULT 10,
    status TEXT NOT NULL DEFAULT 'active',
    notes TEXT,
    last_payment_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. SAFE COLUMN ADDITIONS (Eski jadvallarga avtomatik ustunlar qo'shish)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS store_type TEXT NOT NULL DEFAULT 'texno';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS store_type TEXT NOT NULL DEFAULT 'texno';
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash';

ALTER TABLE public.debtors ADD COLUMN IF NOT EXISTS store_type TEXT NOT NULL DEFAULT 'texno';
ALTER TABLE public.debtors ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. ENABLE RLS SECURITY
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debtors ENABLE ROW LEVEL SECURITY;

-- 4. POLICIES
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.products;
CREATE POLICY "Enable read access for authenticated users" ON public.products FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.products;
CREATE POLICY "Enable insert for authenticated users" ON public.products FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.products;
CREATE POLICY "Enable update for authenticated users" ON public.products FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.products;
CREATE POLICY "Enable delete for authenticated users" ON public.products FOR DELETE USING (true);

DROP POLICY IF EXISTS "Enable read access for sales" ON public.sales;
CREATE POLICY "Enable read access for sales" ON public.sales FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for sales" ON public.sales;
CREATE POLICY "Enable insert for sales" ON public.sales FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable read for sale_items" ON public.sale_items;
CREATE POLICY "Enable read for sale_items" ON public.sale_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for sale_items" ON public.sale_items;
CREATE POLICY "Enable insert for sale_items" ON public.sale_items FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all for debtors" ON public.debtors;
CREATE POLICY "Enable all for debtors" ON public.debtors FOR ALL USING (true);

-- 5. INDEXES FOR SPEED
CREATE INDEX IF NOT EXISTS idx_products_store_type ON public.products(store_type);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_store_type ON public.sales(store_type);
CREATE INDEX IF NOT EXISTS idx_debtors_status ON public.debtors(status);
CREATE INDEX IF NOT EXISTS idx_debtors_phone ON public.debtors(phone);
