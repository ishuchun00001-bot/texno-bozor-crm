import React from 'react';

export default function StoreLocation() {
  // Zarafshon shahri koordinatalari bo'yicha OpenStreetMap embed URL
  const mapUrl = "https://www.openstreetmap.org/export/embed.html?bbox=64.1800%2C41.5550%2C64.2400%2C41.5950&layer=mapnik&marker=41.5732%2C64.2155";

  return (
    <div className="page-fade-in">
      <div className="page-header">
        <div className="page-title">
          <h1>Do'kon Joylashuvi</h1>
          <p>Texno Bozor do'konining Navoiy viloyati, Zarafshon shahridagi manzili va aloqa ma'lumotlari</p>
        </div>
      </div>

      <div className="dashboard-grid" style={{ gridTemplateColumns: '1.2fr 1.8fr' }}>
        {/* Do'kon ma'lumotlari */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '800', background: 'linear-gradient(135deg, var(--neon-blue) 0%, var(--neon-purple) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            ⚡ Texno Bozor (Zarafshon)
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ paddingBottom: '12px', borderBottom: '1px solid var(--card-border)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '4px' }}>BOSH IDORA MANZILI</div>
              <div style={{ fontSize: '15px', fontWeight: '500' }}>Navoiy viloyati, Zarafshon shahri, Mustaqillik ko'chasi, 24-uy</div>
            </div>

            <div style={{ paddingBottom: '12px', borderBottom: '1px solid var(--card-border)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '4px' }}>TELEFON RAQAM</div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--neon-blue)' }}>+998 (90) 123-45-67</div>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '2px' }}>+998 (79) 572-11-22 (Qabulxona)</div>
            </div>

            <div style={{ paddingBottom: '12px', borderBottom: '1px solid var(--card-border)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '4px' }}>ISH TARTIBI</div>
              <div style={{ fontSize: '15px', fontWeight: '500' }}>Dushanba - Yakshanba: 09:00 dan 21:00 gacha</div>
              <div style={{ fontSize: '13px', color: 'var(--neon-green)', marginTop: '4px', fontWeight: '500' }}>Tushliksiz va dam olish kunlarisiz</div>
            </div>

            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '4px' }}>QO'SHIMCHA MA'LUMOT</div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                Zarafshon shahar markazida joylashgan do'konimizda barcha turdagi smartfonlar, noutbuklar va maishiy aksessuarlarni muddatli to'lovga (kreditga) rasmiylashtirib olishingiz mumkin.
              </p>
            </div>
          </div>
        </div>

        {/* Interaktiv Xarita */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: '12px', height: '480px' }}>
          <iframe
            title="Texno Bozor Zarafshon Location Map"
            width="100%"
            height="100%"
            frameBorder="0"
            scrolling="no"
            marginHeight="0"
            marginWidth="0"
            src={mapUrl}
            style={{
              border: '1px solid var(--card-border)',
              borderRadius: '12px',
              filter: 'invert(90%) hue-rotate(180deg) brightness(95%) contrast(90%)', // Tizim dizayniga mos dark map effekti
              boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)'
            }}
          ></iframe>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', padding: '0 8px', fontSize: '12px', color: 'var(--text-muted)' }}>
            <span>📍 Zarafshon, Navoiy, O'zbekiston</span>
            <a 
              href="https://www.openstreetmap.org/?mlat=41.5732&mlon=64.2155#map=14/41.5732/64.2155" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: 'var(--neon-blue)', textDecoration: 'none' }}
            >
              Kattaroq xaritada ko'rish ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
