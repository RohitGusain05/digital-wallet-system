import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function request(path, options = {}) {
  const token = localStorage.getItem('wallet_token');
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API}${path}`, { ...options, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || 'Something went wrong');
  return body;
}

function App() {
  const [mode, setMode] = useState('login');
  const [user, setUser] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [action, setAction] = useState({ type: 'deposit', amount: '', receiverEmail: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadDashboard = async () => {
    try {
      const [me, walletData, tx] = await Promise.all([
        request('/auth/me'), request('/wallet'), request('/wallet/transactions?limit=8')
      ]);
      setUser(me.data?.user || me.user || null);
      setWallet(walletData.data?.wallet || null);
      setTransactions(tx.data?.transactions || tx.data?.items || []);
    } catch (e) { localStorage.removeItem('wallet_token'); setUser(null); }
  };

  useEffect(() => { if (localStorage.getItem('wallet_token')) loadDashboard(); }, []);

  const submitAuth = async (e) => {
    e.preventDefault(); setLoading(true); setError(''); setMessage('');
    try {
      const path = mode === 'login' ? '/auth/login' : '/auth/register';
      const payload = mode === 'login' ? { email: form.email, password: form.password } : form;
      const result = await request(path, { method: 'POST', body: JSON.stringify(payload) });
      const token = result.data?.token || result.token;
      if (token) localStorage.setItem('wallet_token', token);
      if (mode === 'register' && !token) { setMode('login'); setMessage('Account created. Please sign in.'); }
      else await loadDashboard();
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  const performAction = async (e) => {
    e.preventDefault(); setLoading(true); setError(''); setMessage('');
    try {
      const path = `/wallet/${action.type}`;
      const body = action.type === 'transfer'
        ? { amount: action.amount, receiverEmail: action.receiverEmail, description: 'Wallet transfer' }
        : { amount: action.amount, description: `Demo ${action.type}` };
      await request(path, { method: 'POST', headers: { 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify(body) });
      setMessage(`${action.type[0].toUpperCase() + action.type.slice(1)} completed successfully.`);
      setAction({ ...action, amount: '', receiverEmail: '' }); await loadDashboard();
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  const logout = () => { localStorage.removeItem('wallet_token'); setUser(null); setWallet(null); };
  const balance = Number(wallet?.balance || 0);

  if (!user) return <main className="auth-shell"><section className="brand-panel"><div className="logo">V</div><p className="eyebrow">DIGITAL WALLET PLATFORM</p><h1>Move money with confidence.</h1><p className="muted">A portfolio-grade wallet experience with secure authentication, transactions and a clean financial dashboard.</p><div className="feature-list"><span>✓ Secure JWT authentication</span><span>✓ Idempotent transactions</span><span>✓ PostgreSQL + MongoDB backend</span></div></section><section className="auth-card"><div className="mobile-logo logo">V</div><p className="eyebrow">WELCOME BACK</p><h2>{mode === 'login' ? 'Sign in to your wallet' : 'Create your wallet'}</h2><p className="muted">{mode === 'login' ? 'Access your balance and recent activity.' : 'Start managing your digital money in one place.'}</p>{error && <div className="alert error">{error}</div>}{message && <div className="alert success">{message}</div>}<form onSubmit={submitAuth}>{mode === 'register' && <label>Full name<input value={form.fullName} onChange={e=>setForm({...form,fullName:e.target.value})} required /></label>}<label>Email<input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required /></label><label>Password<input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required minLength="6" /></label><button disabled={loading}>{loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button></form><p className="switch">{mode === 'login' ? 'New here?' : 'Already have an account?'} <button className="link" onClick={()=>{setMode(mode==='login'?'register':'login');setError('');setMessage('')}}>{mode === 'login' ? 'Create an account' : 'Sign in'}</button></p></section></main>;

  return <main className="app-shell"><header><div className="wordmark"><div className="logo small">V</div><div><strong>VaultPay</strong><span>Digital Wallet</span></div></div><div className="user-menu"><span>{user.fullName || user.name || user.email}</span><button className="ghost" onClick={logout}>Log out</button></div></header><section className="hero"><div><p className="eyebrow">PERSONAL WALLET</p><h1>Good to see you, {String(user.fullName || user.name || 'there').split(' ')[0]}.</h1><p className="muted">Your money, your control.</p></div><div className="status">● Account active</div></section>{error && <div className="alert error">{error}</div>}{message && <div className="alert success">{message}</div>}<section className="grid"><article className="balance-card"><div className="card-top"><span>Available balance</span><span className="chip">INR</span></div><div className="balance">₹{balance.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}</div><div className="card-bottom"><span>Wallet ID</span><b>{wallet?.id ? String(wallet.id).slice(0,12) : '••••••••'}</b></div></article><article className="action-card"><div className="tabs">{['deposit','withdraw','transfer'].map(t=><button key={t} className={action.type===t?'active':''} onClick={()=>setAction({...action,type:t})}>{t}</button>)}</div><form onSubmit={performAction}><label>Amount<input type="number" min="0.01" step="0.01" placeholder="0.00" value={action.amount} onChange={e=>setAction({...action,amount:e.target.value})} required /></label>{action.type==='transfer' && <label>Recipient email<input type="email" placeholder="recipient@example.com" value={action.receiverEmail} onChange={e=>setAction({...action,receiverEmail:e.target.value})} required /></label>}<button disabled={loading}>{loading ? 'Processing…' : action.type[0].toUpperCase()+action.type.slice(1)}</button></form></article></section><section className="transactions"><div className="section-head"><div><p className="eyebrow">ACTIVITY</p><h2>Recent transactions</h2></div><span className="muted">Latest 8</span></div>{transactions.length===0 ? <div className="empty">No transactions yet. Make your first deposit above.</div> : <div className="tx-list">{transactions.map((tx,i)=><div className="tx" key={tx.id||i}><div className="tx-icon">{String(tx.type||'TX').slice(0,1)}</div><div className="tx-main"><strong>{tx.description || tx.type || 'Transaction'}</strong><span>{tx.createdAt ? new Date(tx.createdAt).toLocaleString() : 'Recent'}</span></div><b className={String(tx.type).toLowerCase().includes('withdraw')||String(tx.type).toLowerCase().includes('transfer')? 'out':'in'}>{String(tx.type).toLowerCase().includes('withdraw')||String(tx.type).toLowerCase().includes('transfer')?'−':'+'}₹{Number(tx.amount||0).toLocaleString('en-IN')}</b></div>)}</div>}</section><footer>VaultPay • Built with React + Node.js • Portfolio project</footer></main>;
}

createRoot(document.getElementById('root')).render(<App />);
