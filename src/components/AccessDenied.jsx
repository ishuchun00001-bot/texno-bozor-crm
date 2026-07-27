import React from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import Button from './ui/Button';
import Card from './ui/Card';

export default function AccessDenied({ onBackToAllowed, requiredRole = "Administrator" }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '70vh',
      padding: '20px'
    }}>
      <Card style={{
        maxWidth: '460px',
        width: '100%',
        padding: '36px 28px',
        textAlign: 'center',
        background: 'var(--card-bg)',
        border: '1px solid var(--danger)',
        borderRadius: 'var(--radius-xl)'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px auto',
          color: 'var(--danger)'
        }}>
          <ShieldAlert size={34} />
        </div>

        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--danger)', letterSpacing: '1px', textTransform: 'uppercase' }}>
          403 Access Denied
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: '800', margin: '8px 0 12px 0', color: 'var(--text-primary)' }}>
          Ruxsat Cheklangan!
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '24px' }}>
          Sizning hisobingizda ushbu bo'limga kirish uchun yetarli xuquq mavjud emas. Ushbu bo'lim faqat <strong>{requiredRole}</strong> rolidagi foydalanuvchilar uchun ochiq.
        </p>

        <Button
          variant="primary"
          onClick={onBackToAllowed}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          <ArrowLeft size={16} /> Ruxsat Berilgan Modulga Qaytish
        </Button>
      </Card>
    </div>
  );
}
