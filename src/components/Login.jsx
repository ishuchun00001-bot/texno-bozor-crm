import React, { useState, useEffect } from 'react';

// 'Texnoilhom123' ning SHA-256 xeshi
const TARGET_HASH = 'e1d04334348d2f9bd3804a9e1424c5368174ae744ff654a5945ee3877cee63d7';
const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 daqiqa (millisekundlarda)

export default function Login({ onLoginSuccess }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState(null);
  const [remainingTime, setRemainingTime] = useState(0);

  // Lockout holatini localStorage'dan yuklash
  useEffect(() => {
    const savedAttempts = parseInt(localStorage.getItem('login_attempts') || '0', 10);
    const savedLockoutUntil = parseInt(localStorage.getItem('lockout_until') || '0', 10);

    if (savedLockoutUntil && savedLockoutUntil > Date.now()) {
      setAttempts(savedAttempts);
      setLockoutTime(savedLockoutUntil);
      setRemainingTime(Math.ceil((savedLockoutUntil - Date.now()) / 1000));
    } else if (savedLockoutUntil && savedLockoutUntil <= Date.now()) {
      // Lockout muddati tugagan
      localStorage.removeItem('lockout_until');
      localStorage.setItem('login_attempts', '0');
      setAttempts(0);
      setLockoutTime(null);
    } else {
      setAttempts(savedAttempts);
    }
  }, []);

  // Bloklash taymeri (hisoblagich)
  useEffect(() => {
    if (!lockoutTime) return;

    const interval = setInterval(() => {
      const timeLeft = Math.ceil((lockoutTime - Date.now()) / 1000);
      if (timeLeft <= 0) {
        // Blokdan chiqarish
        localStorage.removeItem('lockout_until');
        localStorage.setItem('login_attempts', '0');
        setAttempts(0);
        setLockoutTime(null);
        setRemainingTime(0);
        setError('');
        clearInterval(interval);
      } else {
        setRemainingTime(timeLeft);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lockoutTime]);

  // SHA-256 xesh hisoblash funksiyasi
  const hashPassword = async (str) => {
    const utf8 = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', utf8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (lockoutTime) return;

    setError('');

    try {
      const inputHash = await hashPassword(password);

      if (inputHash === TARGET_HASH) {
        // Tizimga muvaffaqiyatli kirildi
        localStorage.setItem('login_attempts', '0');
        localStorage.removeItem('lockout_until');
        onLoginSuccess();
      } else {
        const nextAttempts = attempts + 1;
        setAttempts(nextAttempts);
        localStorage.setItem('login_attempts', nextAttempts.toString());

        if (nextAttempts >= MAX_ATTEMPTS) {
          const blockUntil = Date.now() + LOCKOUT_TIME;
          setLockoutTime(blockUntil);
          localStorage.setItem('lockout_until', blockUntil.toString());
          setRemainingTime(Math.ceil((blockUntil - Date.now()) / 1000));
          setError(`Brute-force xavfi! Ketma-ket ${MAX_ATTEMPTS} marta noto'g'ri parol kiritildi. Tizim vaqtinchalik bloklandi.`);
        } else {
          setError(`Noto'g'ri parol! Qolgan urinishlar soni: ${MAX_ATTEMPTS - nextAttempts}`);
        }
      }
    } catch (err) {
      console.error(err);
      setError("Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.");
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="login-wrapper">
      {/* Orqa fondagi ambient yorug'liklar */}
      <div className="ambient-glow glow-1"></div>
      <div className="ambient-glow glow-2"></div>
      <div className="ambient-glow glow-3"></div>

      <div className="login-card glass-card">
        <div className="login-logo">
          <span>⚡ Texno Bozor</span>
        </div>
        <p className="login-subtitle">CRM Tizimiga kirish uchun parolni kiriting</p>

        {lockoutTime ? (
          <div className="lockout-alert">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: 'var(--neon-red)', marginBottom: '8px'}}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            <div>Xavfsizlik tizimi faollashdi!</div>
            <div style={{fontSize: '13px', marginTop: '4px', opacity: 0.8}}>Siz juda ko'p marta xato parol kiritdingiz.</div>
            <div className="lockout-timer">{formatTime(remainingTime)}</div>
          </div>
        ) : (
          <form onSubmit={handleLogin}>
            <div className="form-group" style={{textAlign: 'left'}}>
              <label htmlFor="admin-pass">Admin Paroli</label>
              <input
                id="admin-pass"
                type="password"
                className="form-control"
                placeholder="Parolni kiriting..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                required
              />
            </div>

            {error && (
              <div style={{
                color: 'var(--neon-red)',
                fontSize: '13px',
                marginBottom: '16px',
                textAlign: 'left',
                padding: '10px',
                background: 'rgba(255,56,96,0.08)',
                borderLeft: '3px solid var(--neon-red)',
                borderRadius: '4px'
              }}>
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary" style={{width: '100%', justifyContent: 'center', marginTop: '8px'}}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              Tizimga kirish
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
