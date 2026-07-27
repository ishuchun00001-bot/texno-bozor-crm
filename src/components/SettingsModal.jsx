import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  DollarSign, 
  Users, 
  Shield, 
  RefreshCw, 
  Save, 
  Plus, 
  Trash2, 
  History, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';
import Badge from './ui/Badge';
import { useToast } from './Toast';
import { getUsers, saveUser, deleteUser, hashString } from '../utils/security';
import { logAuditEvent, getAuditLogs } from '../utils/audit';

export default function SettingsModal({
  isOpen,
  onClose,
  currencyMode,
  onCurrencyModeChange,
  manualRates,
  onSaveManualRates,
  currentRates,
  currentUser = 'admin',
  userRole = 'admin'
}) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('currency'); // 'currency' | 'users' | 'audit'

  // Currency form state
  const [mode, setMode] = useState(currencyMode || 'auto');
  const [rateUzs, setRateUzs] = useState(manualRates?.UZS || currentRates?.UZS || 12800);
  const [rateEur, setRateEur] = useState(manualRates?.EUR || currentRates?.EUR || 0.92);
  const [rateRub, setRateRub] = useState(manualRates?.RUB || currentRates?.RUB || 88);

  // User management state
  const [usersList, setUsersList] = useState([]);
  const [newUsername, setNewUsername] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('employee');

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMode(currencyMode || 'auto');
      setRateUzs(manualRates?.UZS || currentRates?.UZS || 12800);
      setRateEur(manualRates?.EUR || currentRates?.EUR || 0.92);
      setRateRub(manualRates?.RUB || currentRates?.RUB || 88);
      setUsersList(getUsers());
      loadLogs();
    }
  }, [isOpen, currencyMode, manualRates, currentRates]);

  const loadLogs = async () => {
    setLoadingLogs(true);
    const logs = await getAuditLogs();
    setAuditLogs(logs);
    setLoadingLogs(false);
  };

  const handleSaveCurrencySettings = async () => {
    const updatedRates = {
      USD: 1,
      UZS: parseFloat(rateUzs) || 12800,
      EUR: parseFloat(rateEur) || 0.92,
      RUB: parseFloat(rateRub) || 88
    };

    onCurrencyModeChange(mode);
    onSaveManualRates(updatedRates, mode);

    await logAuditEvent({
      user: currentUser,
      role: userRole,
      action: 'CURRENCY_SETTINGS_UPDATED',
      details: `Rejim: ${mode.toUpperCase()}, USD: 1, UZS: ${updatedRates.UZS}, EUR: ${updatedRates.EUR}, RUB: ${updatedRates.RUB}`
    });

    toast.success('Valyuta sozlamalari muvaffaqiyatli saqlandi! ✅');
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim()) {
      toast.warning('Iltimos, login va parolni kiriting!');
      return;
    }

    const hashed = await hashString(newPassword);
    const userObj = {
      username: newUsername.trim(),
      name: newName.trim() || newUsername.trim(),
      role: newRole,
      passwordHash: hashed
    };

    const updated = saveUser(userObj);
    setUsersList(updated);

    await logAuditEvent({
      user: currentUser,
      role: userRole,
      action: 'USER_CREATED',
      details: `Yangi xodim qo'shildi: ${newUsername} (${newRole})`
    });

    setNewUsername('');
    setNewName('');
    setNewPassword('');
    toast.success(`Yangi xodim (${newUsername}) muvaffaqiyatli qo'shildi! 🎉`);
  };

  const handleDeleteUser = async (username) => {
    if (username.toLowerCase() === 'admin') {
      toast.error('Asosiy administrator hisobini o\'chirish taqiqlanadi!');
      return;
    }

    if (!window.confirm(`${username} xodimini o'chirishga ishonchingiz komilmi?`)) return;

    const updated = deleteUser(username);
    setUsersList(updated);

    await logAuditEvent({
      user: currentUser,
      role: userRole,
      action: 'USER_DELETED',
      details: `Xodim o'chirildi: ${username}`
    });

    toast.success(`Foydalanuvchi (${username}) o'chirildi.`);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Tizim va Valyuta Sozlamalari (RBAC & Currency)"
      maxWidth="720px"
    >
      {/* Settings Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: '6px',
        borderBottom: '1px solid var(--card-border)',
        marginBottom: '20px',
        paddingBottom: '8px'
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('currency')}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: activeTab === 'currency' ? 'var(--brand-accent)' : 'transparent',
            color: activeTab === 'currency' ? '#fff' : 'var(--text-muted)',
            fontWeight: '700',
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <DollarSign size={16} /> Valyuta Sozlamalari
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('users')}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: activeTab === 'users' ? 'var(--brand-accent)' : 'transparent',
            color: activeTab === 'users' ? '#fff' : 'var(--text-muted)',
            fontWeight: '700',
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Users size={16} /> Xodimlarni Boshqarish (RBAC)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: activeTab === 'audit' ? 'var(--brand-accent)' : 'transparent',
            color: activeTab === 'audit' ? '#fff' : 'var(--text-muted)',
            fontWeight: '700',
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <History size={16} /> Audit Loglar
        </button>
      </div>

      {/* Tab 1: Currency Management */}
      {activeTab === 'currency' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: 'var(--bg-secondary)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)' }}>
            <label className="form-label" style={{ marginBottom: '10px', display: 'block', fontWeight: '700' }}>
              Valyuta Kursi Rejimi
            </label>
            <div style={{ display: 'flex', gap: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                <input
                  type="radio"
                  name="currency_mode"
                  value="auto"
                  checked={mode === 'auto'}
                  onChange={() => setMode('auto')}
                />
                <RefreshCw size={14} style={{ color: 'var(--brand-accent)' }} />
                ☑ Avtomatik rejim (Open API)
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                <input
                  type="radio"
                  name="currency_mode"
                  value="manual"
                  checked={mode === 'manual'}
                  onChange={() => setMode('manual')}
                />
                <Settings size={14} style={{ color: 'var(--brand-gold)' }} />
                ☑ Qo'lda boshqarish rejimi (Manual Override)
              </label>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
            <div>
              <Input
                label="USD -> UZS Kursi ($1)"
                type="number"
                value={rateUzs}
                onChange={(e) => setRateUzs(e.target.value)}
                disabled={mode === 'auto'}
              />
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Joriy: <strong>{Math.round(currentRates?.UZS || 12800)} SO'M</strong>
              </div>
            </div>

            <div>
              <Input
                label="USD -> EUR Kursi ($1)"
                type="number"
                step="0.01"
                value={rateEur}
                onChange={(e) => setRateEur(e.target.value)}
                disabled={mode === 'auto'}
              />
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                EUR/UZS: <strong>{Math.round((rateUzs / rateEur) || 13500)} SO'M</strong>
              </div>
            </div>

            <div>
              <Input
                label="USD -> RUB Kursi ($1)"
                type="number"
                step="0.1"
                value={rateRub}
                onChange={(e) => setRateRub(e.target.value)}
                disabled={mode === 'auto'}
              />
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                RUB/UZS: <strong>{Math.round((rateUzs / rateRub) || 140)} SO'M</strong>
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--bg-tertiary)', padding: '12px', borderRadius: 'var(--radius-md)', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span>Oxirgi yangilangan sana:</span>
              <strong>{new Date().toLocaleString('uz-UZ')}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>O'zgartirgan foydalanuvchi:</span>
              <strong>{currentUser} ({userRole})</strong>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <Button variant="secondary" onClick={onClose}>Yopish</Button>
            <Button variant="primary" onClick={handleSaveCurrencySettings}>
              <Save size={16} /> Sozlamalarni Saqlash
            </Button>
          </div>
        </div>
      )}

      {/* Tab 2: User Management (RBAC) */}
      {activeTab === 'users' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Add New User Form */}
          <form onSubmit={handleAddUser} style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
              ➕ Yangi Xodim (Foydalanuvchi) Qo'shish
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Input label="Login *" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="Masalan: Texno555" required />
              <Input label="Ismi / Nomi" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Masalan: Sardor Karimov" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Input label="Parol *" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Parol kiriting..." required />
              <div className="form-group">
                <label className="form-label">Roli (Ruxsat Darajasi) *</label>
                <select className="form-control" value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                  <option value="employee">Sotuvchi (Cheklangan ruxsat)</option>
                  <option value="admin">Administrator (To'liq ruxsat)</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button type="submit" variant="primary" size="sm">
                <Plus size={14} /> Xodimni Qo'shish
              </Button>
            </div>
          </form>

          {/* Users List Table */}
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Login</th>
                  <th>Nomi</th>
                  <th>Roli</th>
                  <th style={{ textAlign: 'right' }}>Amal</th>
                </tr>
              </thead>
              <tbody>
                {usersList.map((u) => (
                  <tr key={u.username}>
                    <td><strong>{u.username}</strong></td>
                    <td>{u.name || u.username}</td>
                    <td>
                      {u.role === 'admin' ? (
                        <Badge variant="warning">👑 Administrator</Badge>
                      ) : (
                        <Badge variant="info">👤 Sotuvchi</Badge>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {u.username.toLowerCase() !== 'admin' && (
                        <Button variant="danger" iconOnly size="sm" onClick={() => handleDeleteUser(u.username)}>
                          <Trash2 size={13} />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Audit Logs */}
      {activeTab === 'audit' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>Tizim Audit Va Amallar Tarixi</span>
            <Button variant="secondary" size="sm" onClick={loadLogs} loading={loadingLogs}>
              <RefreshCw size={13} /> Yangilash
            </Button>
          </div>

          <div style={{ overflowX: 'auto', maxHeight: '350px' }}>
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Vaqt</th>
                  <th>Foydalanuvchi</th>
                  <th>Rol</th>
                  <th>Amal</th>
                  <th>Tafsilotlar</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                      Audit loglar mavjud emas
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log, idx) => (
                    <tr key={log.id || idx}>
                      <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {new Date(log.timestamp || log.created_at).toLocaleString('uz-UZ')}
                      </td>
                      <td><strong>{log.username}</strong></td>
                      <td>
                        <Badge variant={log.role === 'admin' ? 'warning' : 'info'}>{log.role}</Badge>
                      </td>
                      <td><code>{log.action}</code></td>
                      <td style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>{log.details}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  );
}
