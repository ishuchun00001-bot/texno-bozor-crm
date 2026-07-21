// Texno Bozor uchun boshlang'ich/mock ma'lumotlar

// Oddiy va chiroyli SVG rasmlar (Base64) tovarlar uchun
export const techIcons = {
  phone: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%2300f2fe" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>`,
  laptop: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%239b5de5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="2" y1="20" x2="22" y2="20"></line><line x1="12" y1="17" x2="12" y2="20"></line></svg>`,
  watch: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%23f15bb5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="7"></circle><polyline points="12 9 12 12 13.5 13.5"></polyline><path d="M12 5V2M12 22v-3"></path></svg>`,
  audio: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%2300f2fe" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path></svg>`,
  power: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%2300bbf9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><path d="M11 7h2v6h-2zm-1 10h4"></path></svg>`
};

export const mockProducts = [
  // ⚡ TEXNO BOZOR TOVARLARI
  {
    id: "prod-1",
    name: "iPhone 15 Pro Max 256GB",
    brand: "Apple",
    model: "15 Pro Max",
    sku: "IPH15PM256",
    category: "Smartfonlar",
    store_type: "texno",
    stock: 12,
    cost_price: 1100,
    selling_price: 1350,
    image_url: techIcons.phone,
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "prod-2",
    name: "MacBook Pro 14 M3 Silver",
    brand: "Apple",
    model: "MacBook Pro 14 M3",
    sku: "MBP14M3SLV",
    category: "Noutbuklar",
    store_type: "texno",
    stock: 5,
    cost_price: 1450,
    selling_price: 1800,
    image_url: techIcons.laptop,
    created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "prod-3",
    name: "Samsung Galaxy S24 Ultra",
    brand: "Samsung",
    model: "Galaxy S24 Ultra",
    sku: "SAMS24ULTRA",
    category: "Smartfonlar",
    store_type: "texno",
    stock: 8,
    cost_price: 980,
    selling_price: 1200,
    image_url: techIcons.phone,
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "prod-4",
    name: "Artel Kirmashina 7kg Inverter",
    brand: "Artel",
    model: "ART-WM-70",
    sku: "ARTWM70INV",
    category: "Maishiy texnika",
    store_type: "texno",
    stock: 6,
    cost_price: 280,
    selling_price: 360,
    image_url: techIcons.power,
    created_at: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "prod-5",
    name: "Samsung NoFrost Muzlatgich 320L",
    brand: "Samsung",
    model: "RB34T600SA",
    sku: "SAMRB34NOFROST",
    category: "Maishiy texnika",
    store_type: "texno",
    stock: 4,
    cost_price: 520,
    selling_price: 680,
    image_url: techIcons.laptop,
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "prod-6",
    name: "LG Smart TV 55 inch 4K HDR",
    brand: "LG",
    model: "55UQ75006LF",
    sku: "LGTV55UQ75",
    category: "Televizorlar",
    store_type: "texno",
    stock: 7,
    cost_price: 430,
    selling_price: 560,
    image_url: techIcons.laptop,
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "prod-7",
    name: "AirPods Pro 2nd Gen",
    brand: "Apple",
    model: "AirPods Pro 2",
    sku: "AIRPODSPRO2",
    category: "Aksessuarlar",
    store_type: "texno",
    stock: 25,
    cost_price: 190,
    selling_price: 245,
    image_url: techIcons.audio,
    created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
  },

  // 🏍️ MOTO BOZOR TOVARLARI
  {
    id: "moto-1",
    name: "Skuter RX 150cc Sport Black",
    brand: "RX Motors",
    model: "RX-150cc",
    sku: "MOTO-RX150",
    category: "Skuterlar",
    store_type: "moto",
    stock: 5,
    cost_price: 950,
    selling_price: 1250,
    image_url: techIcons.power,
    created_at: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "moto-2",
    name: "El-Moped E-Breeze 800W Lithium",
    brand: "E-Breeze",
    model: "EB-800",
    sku: "MOTO-EB800W",
    category: "Elektrobayklar",
    store_type: "moto",
    stock: 8,
    cost_price: 580,
    selling_price: 780,
    image_url: techIcons.watch,
    created_at: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "moto-3",
    name: "Moped Classic 50cc Red",
    brand: "Classic Moto",
    model: "CL-50",
    sku: "MOTO-CL50",
    category: "Mopedlar",
    store_type: "moto",
    stock: 4,
    cost_price: 450,
    selling_price: 600,
    image_url: techIcons.power,
    created_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "moto-4",
    name: "Moto Kaska Modular Full-Face L",
    brand: "AGV",
    model: "K-3 SV",
    sku: "MOTO-HELMET-L",
    category: "Moto Aksessuarlar",
    store_type: "moto",
    stock: 15,
    cost_price: 85,
    selling_price: 130,
    image_url: techIcons.audio,
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "moto-5",
    name: "Motul 4T 10W40 Moto Yog'i 1L",
    brand: "Motul",
    model: "5100 4T",
    sku: "MOTUL-4T-10W40",
    category: "Ehtiyot qismlar",
    store_type: "moto",
    stock: 30,
    cost_price: 12,
    selling_price: 18,
    image_url: techIcons.power,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// O'tgan 30 kun uchun sotuvlar tarixi
export const generateMockSales = () => {
  const sales = [];
  const items = [];
  const now = new Date();

  // Dastlabki sotuvlarni yaratish
  for (let i = 29; i >= 0; i--) {
    const saleDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    // Kunlik tasodifiy sotuvlar soni (0 dan 4 tagacha)
    const numSales = Math.floor(Math.random() * 3) + 1;

    for (let s = 0; s < numSales; s++) {
      // Tasodifiy tovarlarni tanlash
      const p1 = mockProducts[Math.floor(Math.random() * mockProducts.length)];
      const p2 = mockProducts[Math.floor(Math.random() * mockProducts.length)];
      
      const qty1 = Math.floor(Math.random() * 2) + 1;
      const qty2 = Math.floor(Math.random() * 2) + 1;

      const totalCost = p1.cost_price * qty1 + (p1.id !== p2.id ? p2.cost_price * qty2 : 0);
      const totalAmount = p1.selling_price * qty1 + (p1.id !== p2.id ? p2.selling_price * qty2 : 0);
      const profit = totalAmount - totalCost;

      const saleId = `sale-${i}-${s}`;
      
      sales.push({
        id: saleId,
        total_amount: totalAmount,
        total_cost: totalCost,
        profit: profit,
        created_at: saleDate.toISOString()
      });

      items.push({
        id: `item-${saleId}-1`,
        sale_id: saleId,
        product_id: p1.id,
        quantity: qty1,
        cost_price: p1.cost_price,
        selling_price: p1.selling_price,
        created_at: saleDate.toISOString()
      });

      if (p1.id !== p2.id) {
        items.push({
          id: `item-${saleId}-2`,
          sale_id: saleId,
          product_id: p2.id,
          quantity: qty2,
          cost_price: p2.cost_price,
          selling_price: p2.selling_price,
          created_at: saleDate.toISOString()
        });
      }
    }
  }

  return { sales, items };
};
