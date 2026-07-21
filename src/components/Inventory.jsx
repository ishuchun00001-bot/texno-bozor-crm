import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { techIcons, mockProducts } from '../utils/mockData';
import { formatCurrency, DEFAULT_RATES } from '../utils/currency';
import { useToast } from './Toast';

export default function Inventory({ products = [], onRefresh, loading, rates = DEFAULT_RATES, currency = 'USD', currentStore = 'all' }) {
  const toast = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('Smartfonlar');
  const [storeType, setStoreType] = useState('texno');
  const [stock, setStock] = useState(0);
  const [costPrice, setCostPrice] = useState(0);
  const [sellingPrice, setSellingPrice] = useState(0);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Modalni ochish (Qo'shish yoki Tahrirlash)
  const openModal = (product = null) => {
    setErrorMsg('');
    const rate = rates[currency] || 1;
    const defaultStore = currentStore === 'moto' ? 'moto' : 'texno';

    if (product) {
      setEditingProduct(product);
      setName(product.name || '');
      setBrand(product.brand || '');
      setModel(product.model || '');
      setSku(product.sku || '');
      setCategory(product.category || (product.store_type === 'moto' ? 'Skuterlar' : 'Smartfonlar'));
      setStoreType(product.store_type || 'texno');
      setStock(product.stock || 0);
      setCostPrice(Math.round((product.cost_price || 0) * rate));
      setSellingPrice(Math.round((product.selling_price || 0) * rate));
      setImagePreview(product.image_url || techIcons.phone);
      setImageFile(null);
    } else {
      setEditingProduct(null);
      setName('');
      setBrand('');
      setModel('');
      setSku('');
      setStoreType(defaultStore);
      setCategory(defaultStore === 'moto' ? 'Skuterlar' : 'Smartfonlar');
      setStock(0);
      setCostPrice(0);
      setSellingPrice(0);
      setImagePreview(techIcons.phone);
      setImageFile(null);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  // Rasmni tanlash / Yuklash
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Rasm yuklash
  const uploadImage = async () => {
    if (!imageFile) return imagePreview;

    if (isSupabaseConfigured()) {
      try {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error } = await supabase.storage
          .from('product-images')
          .upload(fileName, imageFile, { cacheControl: '3600', upsert: false });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);

        return publicUrl;
      } catch (err) {
        console.error('Rasm yuklashda xatolik:', err.message);
      }
    }

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(imageFile);
    });
  };

  // Mahsulotni saqlash
  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg('');

    if (sellingPrice < costPrice) {
      setErrorMsg("Ogohlantirish: Sotish narxi sotib olingan narxdan kam bo'lmasligi kerak!");
      setIsSaving(false);
      return;
    }

    try {
      const finalImageUrl = await uploadImage();
      const rate = rates[currency] || 1;
      
      const productData = {
        name,
        brand: brand || name.split(' ')[0] || 'Brendsiz',
        model: model || name || '',
        sku: sku || `SKU-${Date.now().toString().substring(8)}`,
        category,
        store_type: storeType,
        stock: parseInt(stock, 10) || 0,
        cost_price: (parseFloat(costPrice) || 0) / rate,
        selling_price: (parseFloat(sellingPrice) || 0) / rate,
        image_url: finalImageUrl
      };

      if (isSupabaseConfigured()) {
        if (editingProduct) {
          const { error } = await supabase
            .from('products')
            .update(productData)
            .eq('id', editingProduct.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('products')
            .insert([productData]);
          if (error) throw error;
        }
      } else {
        let localProds = JSON.parse(localStorage.getItem('local_products') || '[]');
        if (localProds.length === 0 && !localStorage.getItem('local_db_seeded')) {
          localProds = [...mockProducts];
        }

        if (editingProduct) {
          localProds = localProds.map(p => p.id === editingProduct.id ? { ...p, ...productData } : p);
        } else {
          localProds.push({
            id: `prod-${Date.now()}`,
            ...productData,
            created_at: new Date().toISOString()
          });
        }
        localStorage.setItem('local_products', JSON.stringify(localProds));
        localStorage.setItem('local_db_seeded', 'true');
      }

      closeModal();
      toast.success(editingProduct ? 'Mahsulot muvaffaqiyatli yangilandi! ✅' : 'Yangi mahsulot qo\'shildi! ✅');
      onRefresh();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Saqlashda xatolik yuz berdi.');
    } finally {
      setIsSaving(false);
    }
  };

  // Mahsulotni o'chirish
  const handleDelete = async (id) => {
    if (!window.confirm("Haqiqatan ham ushbu mahsulotni o'chirmoqchisiz?")) return;

    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase
          .from('products')
          .delete()
          .eq('id', id);
        if (error) throw error;
      } else {
        let localProds = JSON.parse(localStorage.getItem('local_products') || '[]');
        localProds = localProds.filter(p => p.id !== id);
        localStorage.setItem('local_products', JSON.stringify(localProds));
      }
      toast.success('Mahsulot muvaffaqiyatli o\'chirildi.');
      onRefresh();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "O'chirishda xatolik yuz berdi.");
    }
  };

  // EXCEL EXPORT
  const handleExportExcel = () => {
    if (products.length === 0) {
      toast.warning('Export qilish uchun omborda tovarlar mavjud emas!');
      return;
    }

    const exportData = products.map((p, idx) => ({
      "№": idx + 1,
      "Tovar Nomi": p.name || "",
      "Brend": p.brand || "",
      "Model Nomi": p.model || "",
      "SKU / Shtrix Kod": p.sku || "",
      "Kategoriya": p.category || "",
      "Zahira Soni (Dona)": p.stock || 0,
      "Kirim Narxi ($)": p.cost_price || 0,
      "Sotish Narxi ($)": p.selling_price || 0,
      "Kirim Narxi (SO'M)": Math.round((p.cost_price || 0) * (rates['UZS'] || 12800)),
      "Sotish Narxi (SO'M)": Math.round((p.selling_price || 0) * (rates['UZS'] || 12800))
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ombor Tovarlari");
    XLSX.writeFile(workbook, `Texno_Bozor_Ombor_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // EXCEL SHABLON YUKLAB OLISH
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        "Tovar Nomi": "Artel Kirmashina 7kg Inverter",
        "Brend": "Artel",
        "Model Nomi": "ART-WM-70",
        "SKU": "ARTWM70",
        "Kategoriya": "Maishiy texnika",
        "Zahira Soni": 10,
        "Kirim Narxi ($)": 280,
        "Sotish Narxi ($)": 360
      },
      {
        "Tovar Nomi": "Samsung NoFrost Muzlatgich 320L",
        "Brend": "Samsung",
        "Model Nomi": "RB34T600SA",
        "SKU": "SAMRB34",
        "Kategoriya": "Maishiy texnika",
        "Zahira Soni": 5,
        "Kirim Narxi ($)": 520,
        "Sotish Narxi ($)": 680
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Tovarlar Shablon");
    XLSX.writeFile(workbook, "Texno_Bozor_Tovarlar_Shablon.xlsx");
  };

  // EXCEL IMPORT
  const handleImportExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const wsname = workbook.SheetNames[0];
        const ws = workbook.Sheets[wsname];
        const rawData = XLSX.utils.sheet_to_json(ws);

        if (rawData.length === 0) {
          toast.warning('Excel fayl ichida tovarlar topilmadi!');
          return;
        }

        const importedItems = rawData.map(row => {
          const nameVal = row["Tovar Nomi"] || row["Name"] || row["Mahsulot"] || "Noma'lum tovar";
          const brandVal = row["Brend"] || row["Brand"] || nameVal.split(' ')[0] || "Brendsiz";
          const modelVal = row["Model Nomi"] || row["Model"] || "";
          const skuVal = row["SKU / Shtrix Kod"] || row["SKU"] || row["Kod"] || `SKU-${Math.random().toString(36).substring(7).toUpperCase()}`;
          const categoryVal = row["Kategoriya"] || row["Category"] || "Maishiy texnika";
          const stockVal = parseInt(row["Zahira Soni (Dona)"] || row["Zahira Soni"] || row["Stock"] || 0, 10);
          const costVal = parseFloat(row["Kirim Narxi ($)"] || row["Kirim Narxi"] || row["Cost Price"] || 0);
          const sellVal = parseFloat(row["Sotish Narxi ($)"] || row["Sotish Narxi"] || row["Selling Price"] || 0);

          return {
            name: nameVal,
            brand: brandVal,
            model: modelVal,
            sku: skuVal,
            category: categoryVal,
            stock: isNaN(stockVal) ? 0 : stockVal,
            cost_price: isNaN(costVal) ? 0 : costVal,
            selling_price: isNaN(sellVal) ? 0 : sellVal,
            image_url: techIcons.power
          };
        });

        if (isSupabaseConfigured()) {
          const { error } = await supabase.from('products').insert(importedItems);
          if (error) throw error;
        } else {
          let localProds = JSON.parse(localStorage.getItem('local_products') || '[]');
          const newEntries = importedItems.map(item => ({
            id: `prod-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            ...item,
            created_at: new Date().toISOString()
          }));
          localProds = [...localProds, ...newEntries];
          localStorage.setItem('local_products', JSON.stringify(localProds));
          localStorage.setItem('local_db_seeded', 'true');
        }

        toast.success(`Muvaffaqiyatli! ${importedItems.length} ta tovar Excel'dan import qilindi. 🎉`);
        onRefresh();
      } catch (err) {
        console.error(err);
        toast.error("Excel faylini o'qishda xatolik: " + err.message);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = ''; // Inputni tozalash
  };

  const formatPrimary = (val) => formatCurrency(val, currency, rates);
  const formatSecondary = (val) => {
    const secondaryCurr = currency === 'USD' ? 'UZS' : 'USD';
    return formatCurrency(val, secondaryCurr, rates);
  };

  // Qidiruv bo'yicha saralangan tovarlar
  const filteredProducts = products.filter(p => {
    const q = searchQuery.toLowerCase();
    return (
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.brand && p.brand.toLowerCase().includes(q)) ||
      (p.model && p.model.toLowerCase().includes(q)) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q))
    );
  });

  return (
    <div className="page-fade-in">
      <div className="page-header" style={{ flexWrap: 'wrap', gap: '16px' }}>
        <div className="page-title">
          <h1>Mahsulotlar Ombori</h1>
          <p>Maishiy texnika va elektronikalarni rasmi, brendi, modeli va zahirasi bilan boshqarish paneli</p>
        </div>

        {/* Amallar tugmalari */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={handleDownloadTemplate} className="btn-secondary" title="Excel Shablonini yuklab olish" style={{ fontSize: '13px', padding: '8px 12px' }}>
            📄 Shablon (.xlsx)
          </button>

          <label className="btn-secondary" style={{ fontSize: '13px', padding: '8px 12px', cursor: 'pointer', margin: 0, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            📥 Exceldan yuklash
            <input type="file" accept=".xlsx, .xls, .csv" onChange={handleImportExcel} style={{ display: 'none' }} />
          </label>

          <button onClick={handleExportExcel} className="btn-secondary" style={{ fontSize: '13px', padding: '8px 12px' }}>
            📤 Excelga yuklash
          </button>

          <button onClick={() => openModal()} className="btn-primary" style={{ fontSize: '13px', padding: '8px 16px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            + Yangi tovar
          </button>
        </div>
      </div>

      {/* Mahsulotlar jadvali va Qidiruv */}
      <div className="glass-card">
        {/* Search bar */}
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Brend, Model, Tovar nomi yoki SKU bo'yicha qidirish..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ maxWidth: '380px' }}
          />
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Jami: <strong style={{ color: 'var(--neon-blue)' }}>{filteredProducts.length}</strong> ta tovar
          </div>
        </div>

        <div className="table-container">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              Ombor yuklanmoqda...
            </div>
          ) : (
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Bo'lim</th>
                  <th>Rasm</th>
                  <th>Brend</th>
                  <th>Model Nomi</th>
                  <th>Tovar Nomi</th>
                  <th>SKU / Kod</th>
                  <th>Kategoriya</th>
                  <th>Zahira (Soni)</th>
                  <th>Sotib Olingan</th>
                  <th>Sotilayotgan</th>
                  <th>Sof Foyda (dona)</th>
                  <th style={{ textAlign: 'right' }}>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => {
                  const unitProfit = p.selling_price - p.cost_price;
                  const isLowStock = p.stock <= 5;
                  const isMoto = (p.store_type || 'texno') === 'moto';
                  return (
                    <tr key={p.id}>
                      <td>
                        <span className="badge-category" style={{
                          background: isMoto ? 'rgba(241, 91, 181, 0.15)' : 'rgba(0, 242, 254, 0.15)',
                          color: isMoto ? 'var(--neon-pink)' : 'var(--neon-blue)',
                          border: `1px solid ${isMoto ? 'var(--neon-pink)' : 'var(--neon-blue)'}`
                        }}>
                          {isMoto ? "🏍️ Moto" : "⚡ Texno"}
                        </span>
                      </td>
                      <td>
                        <img className="table-img" src={p.image_url || techIcons.phone} alt={p.name} />
                      </td>
                      <td>
                        <span className="badge-category" style={{ background: 'rgba(0, 242, 254, 0.12)', color: 'var(--neon-blue)', border: '1px solid var(--neon-blue)' }}>
                          {p.brand || "Brendsiz"}
                        </span>
                      </td>
                      <td style={{ fontWeight: '500', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                        {p.model || "-"}
                      </td>
                      <td style={{ fontWeight: '600', minWidth: '180px', whiteSpace: 'normal', color: '#fff' }}>
                        {p.name}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '13px', whiteSpace: 'nowrap' }}>{p.sku}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span className="badge-category">{p.category}</span>
                      </td>
                      <td style={{ fontWeight: '700', whiteSpace: 'nowrap', color: isLowStock ? 'var(--neon-red)' : 'var(--text-primary)' }}>
                        {p.stock} dona {isLowStock && '⚠️'}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {formatPrimary(p.cost_price)}
                        <span className="currency-subtext">
                          {formatSecondary(p.cost_price)}
                        </span>
                      </td>
                      <td style={{ color: 'var(--neon-blue)', fontWeight: '600', whiteSpace: 'nowrap' }}>
                        {formatPrimary(p.selling_price)}
                        <span className="currency-subtext" style={{ color: 'var(--text-secondary)' }}>
                          {formatSecondary(p.selling_price)}
                        </span>
                      </td>
                      <td style={{ color: 'var(--neon-green)', fontWeight: '600', whiteSpace: 'nowrap' }}>
                        +{formatPrimary(unitProfit)}
                        <span className="currency-subtext" style={{ color: 'var(--text-secondary)' }}>
                          +{formatSecondary(unitProfit)}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button onClick={() => openModal(p)} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '13px' }}>
                            ✏️ Tahrirlash
                          </button>
                          <button onClick={() => handleDelete(p.id)} className="btn-danger" style={{ padding: '6px 12px', fontSize: '13px' }}>
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan="11" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
                      {searchQuery ? "Qidiruv bo'yicha hech qanday tovar topilmadi." : "Omborda tovarlar topilmadi. Yangi tovar qo'shing yoki Exceldan yuklang."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Mahsulot qo'shish / tahrirlash Modal oynasi */}
      {isModalOpen && createPortal(
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <h3>{editingProduct ? "Mahsulotni Tahrirlash" : "Yangi Mahsulot Qo'shish"}</h3>
              <button onClick={closeModal} className="close-btn">&times;</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                {errorMsg && (
                  <div style={{ color: 'var(--neon-red)', background: 'rgba(255,56,96,0.08)', padding: '12px', borderLeft: '3px solid var(--neon-red)', borderRadius: '4px', marginBottom: '16px', fontSize: '13px' }}>
                    {errorMsg}
                  </div>
                )}

                <div className="form-group">
                  <label>Mahsulot Nomi *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Masalan: Samsung NoFrost Muzlatgich 320L..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Brend (Ishlab chiqaruvchi) *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Masalan: Samsung, Artel, LG, Apple..."
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Model Nomi / Seriyasi</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Masalan: RB34T600SA, ART-WM-70..."
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Do'kon Turi (Bo'lim) *</label>
                    <select
                      className="form-control"
                      value={storeType}
                      onChange={(e) => setStoreType(e.target.value)}
                      required
                    >
                      <option value="texno">⚡ Texno Bozor (Maishiy texnika & Elektronika)</option>
                      <option value="moto">🏍️ Moto Bozor (Skuterlar, Mopedlar, Moto texnika)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Kategoriya *</label>
                    <select
                      className="form-control"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <optgroup label="⚡ Texno Bozor">
                        <option value="Maishiy texnika">Maishiy texnika</option>
                        <option value="Televizorlar">Televizorlar</option>
                        <option value="Smartfonlar">Smartfonlar</option>
                        <option value="Noutbuklar">Noutbuklar</option>
                        <option value="Aksessuarlar">Aksessuarlar</option>
                        <option value="Audio">Audio qurilmalar</option>
                      </optgroup>
                      <optgroup label="🏍️ Moto Bozor">
                        <option value="Skuterlar">Skuterlar</option>
                        <option value="Mopedlar">Mopedlar</option>
                        <option value="Elektrobayklar">Elektrobayklar</option>
                        <option value="Mototsikllar">Mototsikllar</option>
                        <option value="Moto Aksessuarlar">Moto Aksessuarlar</option>
                        <option value="Ehtiyot qismlar">Ehtiyot qismlar</option>
                      </optgroup>
                      <option value="Boshqa">Boshqalar</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>SKU / Shtrix-kod</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Masalan: SAMRB34 yoki MOTO-150"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Omborda mavjud soni *</label>
                  <input
                    type="number"
                    className="form-control"
                    value={stock}
                    onChange={(e) => setStock(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Sotib Olingan Narxi ({currency}) *</label>
                    <input
                      type="number"
                      className="form-control"
                      value={costPrice}
                      onChange={(e) => setCostPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                      required
                    />
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      ~ {formatSecondary((costPrice / (rates[currency] || 1)))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Sotilayotgan Narxi ({currency}) *</label>
                    <input
                      type="number"
                      className="form-control"
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                      required
                    />
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      ~ {formatSecondary((sellingPrice / (rates[currency] || 1)))}
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label>Mahsulot Rasmi (Rasm yuklash)</label>
                  <div className="image-upload-wrapper" onClick={() => document.getElementById('image-file-input').click()}>
                    <input
                      type="file"
                      id="image-file-input"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleImageChange}
                    />
                    {imagePreview ? (
                      <div>
                        <img src={imagePreview} className="image-preview" alt="Preview" />
                        <div style={{ fontSize: '13px', color: 'var(--neon-blue)', fontWeight: '500' }}>Rasmni almashtirish</div>
                      </div>
                    ) : (
                      <div className="upload-placeholder">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Faylni yuklash uchun bosing</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={closeModal} className="btn-secondary">Bekor qilish</button>
                <button type="submit" disabled={isSaving} className="btn-primary">
                  {isSaving ? "Saqlanmoqda..." : "Saqlash"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
