// TEXNO BOZOR ERP V2 — ENTERPRISE SUPABASE SERVICE LAYER

import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { mockProducts } from '../utils/mockData';

export const productService = {
  async getAll() {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
    let local = JSON.parse(localStorage.getItem('local_products') || '[]');
    if (local.length === 0 && !localStorage.getItem('local_db_seeded')) {
      local = [...mockProducts];
    }
    return local;
  },

  async updateStock(productId, newStock) {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('products').update({ stock: newStock }).eq('id', productId).select();
      if (error) throw error;
      return data;
    }
    let local = JSON.parse(localStorage.getItem('local_products') || '[]');
    local = local.map(p => p.id === productId ? { ...p, stock: newStock } : p);
    localStorage.setItem('local_products', JSON.stringify(local));
    return true;
  }
};

export const saleService = {
  async createSale(salePayload, cartItems, rate = 1) {
    const nowIso = new Date().toISOString();
    let newSaleId = `sale-${Date.now()}`;

    if (isSupabaseConfigured()) {
      const { data: saleData, error: saleErr } = await supabase
        .from('sales')
        .insert([salePayload])
        .select();

      if (saleErr) throw saleErr;
      newSaleId = saleData[0].id;

      const saleItemsData = cartItems.map(item => ({
        sale_id: newSaleId,
        product_id: item.id,
        quantity: item.quantity,
        cost_price: item.cost_price,
        selling_price: ((parseFloat(item.custom_selling_price) || 0) - (parseFloat(item.discount) || 0)) / rate
      }));

      const { error: itemsErr } = await supabase.from('sale_items').insert(saleItemsData);
      if (itemsErr) throw itemsErr;

      for (const item of cartItems) {
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
    } else {
      let localSales = JSON.parse(localStorage.getItem('local_sales') || '[]');
      let localItems = JSON.parse(localStorage.getItem('local_sale_items') || '[]');
      let localProds = JSON.parse(localStorage.getItem('local_products') || '[]');
      let localMovements = JSON.parse(localStorage.getItem('local_inventory_movements') || '[]');

      localSales.unshift({ id: newSaleId, ...salePayload });

      cartItems.forEach((item, idx) => {
        localItems.push({
          id: `item-${newSaleId}-${idx}`,
          sale_id: newSaleId,
          product_id: item.id,
          quantity: item.quantity,
          cost_price: item.cost_price,
          selling_price: ((parseFloat(item.custom_selling_price) || 0) - (parseFloat(item.discount) || 0)) / rate,
          created_at: nowIso
        });

        localProds = localProds.map(p => p.id === item.id ? { ...p, stock: Math.max(0, p.stock - item.quantity) } : p);

        localMovements.push({
          id: `mov-${Date.now()}-${idx}`,
          product_id: item.id,
          movement_type: 'sale',
          quantity: item.quantity,
          note: `Sotuv ID: #${newSaleId.substring(0, 8)}`,
          created_at: nowIso
        });
      });

      localStorage.setItem('local_sales', JSON.stringify(localSales));
      localStorage.setItem('local_sale_items', JSON.stringify(localItems));
      localStorage.setItem('local_products', JSON.stringify(localProds));
      localStorage.setItem('local_inventory_movements', JSON.stringify(localMovements));
    }

    return newSaleId;
  }
};
