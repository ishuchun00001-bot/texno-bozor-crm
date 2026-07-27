// TEXNO BOZOR ERP V2 — ENTERPRISE SUPABASE SERVICE LAYER

import { supabase, isSupabaseConfigured } from '../supabaseClient';

export const productService = {
  async getAll() {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
    return [];
  },

  async updateStock(productId, newStock) {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('products').update({ stock: newStock }).eq('id', productId).select();
      if (error) throw error;
      return data;
    }
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
    }

    return newSaleId;
  }
};
