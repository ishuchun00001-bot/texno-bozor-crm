import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { 
  Package, 
  Plus, 
  Search, 
  FileSpreadsheet, 
  Download, 
  Upload, 
  Edit3, 
  Trash2 
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { techIcons, mockProducts } from '../utils/mockData';
import { formatCurrency, DEFAULT_RATES } from '../utils/currency';
import { useToast } from './Toast';
import Button from './ui/Button';
import Badge from './ui/Badge';
import Card from './ui/Card';
import Input from './ui/Input';
import Modal from './ui/Modal';

export default function Inventory({
  products = [],
  onRefresh,
  loading = false,
  rates = DEFAULT_RATES,
  currency = 'USD',
  currentStore = 'all'
}) {
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('Maishiy texnika');
  const [storeType, setStoreType] = useState('texno');
  const [stock, setStock] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');

  const openModal = (product = null) => {
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

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    const rate = rates[currency] || 1;
    const costPriceUsd = (parseFloat(costPrice) || 0) / rate;
    const sellingPriceUsd = parseFloat(sellingPrice) > 0 ? (parseFloat(sellingPrice) / rate) : costPriceUsd;
    
    try {
      const finalImageUrl = await uploadImage();
      
      const productData = {
        name,
        brand: brand || name.split(' ')[0] || 'Brendsiz',
        model: model || name || '',
        sku: sku || `SKU-${Date.now().toString().substring(8)}`,
        category,
        store_type: storeType,
        stock: parseInt(stock, 10) || 0,
        cost_price: costPriceUsd,
        selling_price: sellingPriceUsd,
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
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Tovarlar Shablon");
    XLSX.writeFile(workbook, "Texno_Bozor_Tovarlar_Shablon.xlsx");
  };

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

        const findVal = (rowObj, keys) => {
          const rKeys = Object.keys(rowObj);
          for (const k of keys) {
            const foundKey = rKeys.find(rk => rk.trim().toLowerCase().includes(k.toLowerCase()));
            if (foundKey && rowObj[foundKey] !== undefined) return rowObj[foundKey];
          }
          return null;
        };

        const importedItems = rawData.map(row => {
          const nameVal = findVal(row, ["tovar", "name", "mahsulot", "nomi"]) || "Noma'lum tovar";
          const brandVal = findVal(row, ["brend", "brand"]) || String(nameVal).split(' ')[0] || "Brendsiz";
          const modelVal = findVal(row, ["model"]) || "";
          const skuVal = findVal(row, ["sku", "kod", "shtrix"]) || `SKU-${Math.random().toString(36).substring(7).toUpperCase()}`;
          const categoryVal = findVal(row, ["kategoriya", "category"]) || "Maishiy texnika";
          const stockVal = parseInt(findVal(row, ["zahira", "stock", "ombor", "soni", "dona"]) || 0, 10);
          const costVal = parseFloat(findVal(row, ["kirim", "tannarx", "cost"]) || 0);
          const sellVal = parseFloat(findVal(row, ["sotish", "narx", "selling"]) || 0);

          return {
            name: String(nameVal),
            brand: String(brandVal),
            model: String(modelVal),
            sku: String(skuVal),
            category: String(categoryVal),
            store_type: currentStore === 'moto' ? 'moto' : 'texno',
            stock: isNaN(stockVal) ? 0 : stockVal,
            cost_price: isNaN(costVal) ? 0 : costVal,
            selling_price: isNaN(sellVal) ? costVal : sellVal,
            image_url: techIcons.phone
          };
        });

        if (isSupabaseConfigured()) {
          const { error } = await supabase.from('products').insert(importedItems);
          if (error) throw error;
        } else {
          let localProds = JSON.parse(localStorage.getItem('local_products') || '[]');
          const formatted = importedItems.map((item, idx) => ({
            id: `prod-imp-${Date.now()}-${idx}`,
            ...item,
            created_at: new Date().toISOString()
          }));
          localProds = [...formatted, ...localProds];
          localStorage.setItem('local_products', JSON.stringify(localProds));
        }

        toast.success(`${importedItems.length} ta tovar muvaffaqiyatli import qilindi! 🎉`);
        onRefresh();
      } catch (err) {
        console.error(err);
        toast.error("Excel faylini o'qishda xatolik yuz berdi.");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = null;
  };

  const categories = ['all', ...new Set(products.map(p => p.category).filter(Boolean))];

  const filteredProducts = products.filter(p => {
    const matchesSearch = 
      (p.name && p.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.brand && p.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const formatPrimary = (val) => formatCurrency(val, currency, rates);
  const formatSecondary = (val) => {
    const sec = currency === 'USD' ? 'UZS' : 'USD';
    return formatCurrency(val, sec, rates);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header & Controls Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>
            Tovarlar Ombori
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Jami {products.length} ta mahsulot ro'yxati, zaxiralar va narxlarni boshqarish
          </p>
        </div>

        {/* Actions Button Group */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <Button variant="secondary" size="sm" onClick={handleDownloadTemplate} title="Excel Shablonini yuklab olish">
            <Download size={14} /> Shablon
          </Button>

          <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', margin: 0, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Upload size={14} /> Import (Excel)
            <input type="file" accept=".xlsx, .xls" onChange={handleImportExcel} style={{ display: 'none' }} />
          </label>

          <Button variant="secondary" size="sm" onClick={handleExportExcel}>
            <FileSpreadsheet size={14} /> Export (Excel)
          </Button>

          <Button variant="primary" onClick={() => openModal()}>
            <Plus size={16} /> Yangi Tovar Qo'shish
          </Button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <Card style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '260px', position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-control"
              placeholder="Tovar nomi, brend yoki SKU bo'yicha qidirish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '38px' }}
            />
          </div>

          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Natija: <strong style={{ color: 'var(--text-primary)' }}>{filteredProducts.length}</strong> ta tovar
          </div>
        </div>

        {/* Category Filter Pills */}
        {categories.length > 1 && (
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '12px',
                  fontWeight: '600',
                  border: '1px solid var(--card-border)',
                  background: selectedCategory === cat ? 'var(--brand-accent)' : 'var(--bg-secondary)',
                  color: selectedCategory === cat ? '#ffffff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                {cat === 'all' ? 'Barcha Kategoriyalar' : cat}
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Enterprise Data Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '60px' }}>Rasm</th>
              <th>Tovar Nomi</th>
              <th>Kategoriya</th>
              <th>SKU / Kod</th>
              <th>Kirim Narxi</th>
              <th>Sotish Narxi</th>
              <th>Ombor Qoldig'i</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Amallar</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1, 2, 3, 4, 5].map(i => (
                <tr key={i}>
                  <td colSpan="9"><div className="skeleton" style={{ height: '36px' }} /></td>
                </tr>
              ))
            ) : filteredProducts.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                  <Package size={36} style={{ marginBottom: '10px', opacity: 0.5 }} />
                  <div>Mos keluvchi tovarlar topilmadi!</div>
                </td>
              </tr>
            ) : (
              filteredProducts.map(p => (
                <tr key={p.id}>
                  <td>
                    <img 
                      src={p.image_url || techIcons.phone} 
                      alt={p.name} 
                      style={{ width: '38px', height: '38px', borderRadius: '8px', objectFit: 'cover' }} 
                    />
                  </td>
                  <td>
                    <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{p.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.brand} {p.model}</div>
                  </td>
                  <td>
                    <Badge variant="info">{p.category || 'Umumiy'}</Badge>
                  </td>
                  <td>
                    <code style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{p.sku || '-'}</code>
                  </td>
                  <td>
                    <div>{formatPrimary(p.cost_price)}</div>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{formatSecondary(p.cost_price)}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: '700', color: 'var(--brand-gold)' }}>{formatPrimary(p.selling_price)}</div>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{formatSecondary(p.selling_price)}</div>
                  </td>
                  <td>
                    <span style={{ fontWeight: '700', fontSize: '14px' }}>{p.stock} dona</span>
                  </td>
                  <td>
                    {p.stock > 5 ? (
                      <Badge variant="success">Omborda yetarli</Badge>
                    ) : p.stock > 0 ? (
                      <Badge variant="warning">Zahira oz (≤5)</Badge>
                    ) : (
                      <Badge variant="danger">Tugagan</Badge>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <Button variant="secondary" iconOnly onClick={() => openModal(p)} title="Tahrirlash">
                        <Edit3 size={14} />
                      </Button>
                      <Button variant="danger" iconOnly onClick={() => handleDelete(p.id)} title="O'chirish">
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Product Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingProduct ? 'Mahsulotni Tahrirlash' : 'Yangi Tovar Qo\'shish'}
        maxWidth="540px"
      >
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Input 
            label="Tovar Nomi *" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            placeholder="Masalan: iPhone 15 Pro Max 256GB" 
            required 
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input label="Brend" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Apple" />
            <Input label="Model" value={model} onChange={(e) => setModel(e.target.value)} placeholder="A3106" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Input label="SKU / Shtrix Kod" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="SKU-88239" />
            <Input label="Kategoriya" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Smartfonlar" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <Input label="Zahira Soni *" type="number" value={stock} onChange={(e) => setStock(e.target.value)} min="0" required />
            <Input label={`Kirim (${currency}) *`} type="number" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} min="0" required />
            <Input label={`Sotish (${currency}) *`} type="number" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} min="0" required />
          </div>

          {/* Profit Margin Preview Hint */}
          {sellingPrice > 0 && costPrice > 0 && (
            <div style={{ fontSize: '12px', color: sellingPrice >= costPrice ? 'var(--success)' : 'var(--danger)', background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>
              Kutilayotgan foyda: <strong>{formatPrimary(sellingPrice - costPrice)}</strong> / dona (Margin: {Math.round(((sellingPrice - costPrice) / sellingPrice) * 100)}%)
            </div>
          )}

          {/* Rasm fayli yuklash */}
          <div className="form-group">
            <label className="form-label">Mahsulot Rasmi</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <img src={imagePreview} alt="Preview" style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--card-border)' }} />
              <input type="file" accept="image/*" onChange={handleImageChange} style={{ fontSize: '12px', color: 'var(--text-muted)' }} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <Button variant="secondary" type="button" onClick={closeModal}>Bekor qilish</Button>
            <Button variant="primary" type="submit" loading={isSaving}>
              {editingProduct ? 'Yangilash' : 'Saqlash'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
