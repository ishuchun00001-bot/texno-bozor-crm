import React, { useState, useEffect } from 'react';
import { ShieldCheck, Eye, EyeOff, KeyRound, User, AlertOctagon } from 'lucide-react';
import { hashString, TARGET_HASH, createSecureSession, getUsers } from '../utils/security';
import { logAuditEvent } from '../utils/audit';
import Button from './ui/Button';
import Card from './ui/Card';

const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000;

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState(null);
  const [remainingTime, setRemainingTime] = useState(0);

  useEffect(() => {
    const savedAttempts = parseInt(localStorage.getItem('login_attempts') || '0', 10);
    const savedLockoutUntil = parseInt(localStorage.getItem('lockout_until') || '0', 10);

    if (savedLockoutUntil && savedLockoutUntil > Date.now()) {
      setAttempts(savedAttempts);
      setLockoutTime(savedLockoutUntil);
      setRemainingTime(Math.ceil((savedLockoutUntil - Date.now()) / 1000));
    } else if (savedLockoutUntil && savedLockoutUntil <= Date.now()) {
      localStorage.removeItem('lockout_until');
      localStorage.setItem('login_attempts', '0');
      setAttempts(0);
      setLockoutTime(null);
    } else {
      setAttempts(savedAttempts);
    }
  }, []);

  useEffect(() => {
    if (!lockoutTime) return;

    const interval = setInterval(() => {
      const timeLeft = Math.ceil((lockoutTime - Date.now()) / 1000);
      if (timeLeft <= 0) {
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

  const handleLogin = async (e) => {
    e.preventDefault();
    if (lockoutTime) return;

    setError('');
    const inputHash = await hashString(password);
    const users = getUsers();
    const cleanUsername = username.trim();

    try {
      // 1. Direct check against admin hash fallback (if username empty or admin)
      let foundUser = users.find(u => u.username.toLowerCase() === cleanUsername.toLowerCase());

      if (!foundUser && (cleanUsername.toLowerCase() === 'admin' || cleanUsername === '')) {
        if (inputHash === TARGET_HASH) {
          foundUser = { username: 'admin', role: 'admin', name: 'Administrator' };
        }
      }

      // Check employee test user Texno555 / Texno555 fallback
      if (!foundUser && cleanUsername === 'Texno555' && password === 'Texno555') {
        foundUser = { username: 'Texno555', role: 'employee', name: 'Sotuvchi (Texno555)' };
      }

      if (foundUser && (foundUser.passwordHash === inputHash || (foundUser.username === 'Texno555' && password === 'Texno555') || (foundUser.username === 'admin' && inputHash === TARGET_HASH))) {
        localStorage.setItem('login_attempts', '0');
        localStorage.removeItem('lockout_until');
        
        await createSecureSession(foundUser.role, foundUser.username);
        await logAuditEvent({
          user: foundUser.username,
          role: foundUser.role,
          action: 'LOGIN_SUCCESS',
          details: `Foydalanuvchi tizimga kirdi (Rol: ${foundUser.role})`
        });

        onLoginSuccess(foundUser.role, foundUser.username);
      } else {
        const nextAttempts = attempts + 1;
        setAttempts(nextAttempts);
        localStorage.setItem('login_attempts', nextAttempts.toString());

        await logAuditEvent({
          user: cleanUsername || 'Noma\'lum',
          role: 'guest',
          action: 'LOGIN_FAILED',
          details: `Ketma-ket ${nextAttempts}-marta noto'g'ri login/parol kiritildi`
        });

        if (nextAttempts >= MAX_ATTEMPTS) {
          const blockUntil = Date.now() + LOCKOUT_TIME;
          setLockoutTime(blockUntil);
          localStorage.setItem('lockout_until', blockUntil.toString());
          setRemainingTime(Math.ceil((blockUntil - Date.now()) / 1000));
          setError(`Brute-force xavfi! Ketma-ket ${MAX_ATTEMPTS} marta noto'g'ri parol kiritildi. Tizim vaqtinchalik bloklandi.`);
        } else {
          setError(`Noto'g'ri login va parol! Qolgan urinishlar: ${MAX_ATTEMPTS - nextAttempts}`);
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
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      background: 'var(--bg-base)',
      position: 'relative'
    }}>
      <Card style={{
        maxWidth: '420px',
        width: '100%',
        padding: '36px 32px',
        borderRadius: 'var(--radius-xl)',
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        boxShadow: 'var(--shadow-lg)'
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '14px',
            margin: '0 auto 14px auto',
            overflow: 'hidden',
            background: '#050810'
          }}>
            <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '20px',
            fontWeight: '800',
            color: 'var(--text-primary)',
            letterSpacing: '-0.3px'
          }}>TEXNO MOTO BOZOR</h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Enterprise CRM & Smart Analytics Platform
          </p>
        </div>

        {/* Lockout Warning or Error */}
        {lockoutTime ? (
          <div style={{
            padding: '14px',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid var(--danger)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--danger)',
            textAlign: 'center',
            fontSize: '13px',
            marginBottom: '20px'
          }}>
            <AlertOctagon size={24} style={{ marginBottom: '6px' }} />
            <div style={{ fontWeight: '700' }}>Tizim Vaqtinchalik Bloklandi</div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Qayta urinish imkoniyati: <strong style={{ color: '#fff' }}>{formatTime(remainingTime)}</strong>
            </div>
          </div>
        ) : error ? (
          <div style={{
            padding: '10px 14px',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid var(--danger)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--danger)',
            fontSize: '12.5px',
            marginBottom: '20px'
          }}>
            {error}
          </div>
        ) : null}

        {/* Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Foydalanuvchi Logini</label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-control"
                placeholder="Login... (Masalan: Texno555 yoki admin)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={Boolean(lockoutTime)}
                required
                autoFocus
                style={{ paddingLeft: '38px' }}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Parol</label>
            <div style={{ position: 'relative' }}>
              <KeyRound size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-control"
                placeholder="Parolni kiriting..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={Boolean(lockoutTime)}
                required
                style={{ paddingLeft: '38px', paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer'
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            disabled={Boolean(lockoutTime) || !password}
            style={{ width: '100%', padding: '10px', justifyContent: 'center', marginTop: '6px' }}
          >
            <ShieldCheck size={16} /> Tizimga Kirish
          </Button>
        </form>

        <div style={{ marginTop: '20px', padding: '10px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--card-border)', fontSize: '11px', color: 'var(--text-muted)' }}>
          <div>💡 <strong>Dastlabki Test Hisoblar:</strong></div>
          <div style={{ marginTop: '4px' }}>• Admin: <code>admin</code> / <code>Texnoilhom123</code></div>
          <div>• Sotuvchi (Xodim): <code>Texno555</code> / <code>Texno555</code></div>
        </div>
      </Card>
    </div>
  );
}
