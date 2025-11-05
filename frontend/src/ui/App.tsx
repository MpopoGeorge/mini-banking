import React, { useEffect, useMemo, useState } from 'react';

type Tx = { id: string; type: 'transfer'|'exchange'; amountCents: number; currency: 'USD'|'EUR'; createdAt: string };
type WalletDto = { id: string; currency: 'USD'|'EUR'; balanceCents: number };

const fmt = (cents: number, currency: 'USD'|'EUR') => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
};

const API = {
  async login(email: string, password: string) {
    const r = await fetch('http://localhost:3000/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async balances(token: string) {
    const r = await fetch('http://localhost:3000/api/accounts/balances', { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async lastTx(token: string, limit = 5) {
    const r = await fetch(`http://localhost:3000/api/accounts/last-transactions?limit=${limit}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async wallets(token: string) {
    const r = await fetch('http://localhost:3000/api/accounts/wallets', { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async listTransactions(type: ''|'transfer'|'exchange', page: number, limit: number) {
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (type) qs.set('type', type);
    const r = await fetch(`http://localhost:3000/api/transactions?${qs.toString()}`);
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async transfer(token: string, fromWalletId: string, toWalletId: string, amount: string) {
    const r = await fetch('http://localhost:3000/api/transactions/transfer', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ fromWalletId, toWalletId, amount }) });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async exchange(token: string, usdWalletId: string, eurWalletId: string, fromCurrency: 'USD'|'EUR', amount: string) {
    const r = await fetch('http://localhost:3000/api/transactions/exchange', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ usdWalletId, eurWalletId, fromCurrency, amount }) });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
};

export function App() {
  const [token, setToken] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');
  const [email, setEmail] = useState('demo@example.com');
  const [password, setPassword] = useState('password');
  const [balances, setBalances] = useState<{USD: number; EUR: number} | null>(null);
  const [last, setLast] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<''|'transfer'|'exchange'>('');
  const [list, setList] = useState<{items: Tx[]; total: number; page: number; limit: number} | null>(null);
  const [wallets, setWallets] = useState<WalletDto[]>([]);

  const loggedIn = !!token;

  const loadDashboard = async (t: string) => {
    setLoading(true);
    try {
      const [b, l, w] = await Promise.all([API.balances(t), API.lastTx(t, 5), API.wallets(t)]);
      setBalances(b);
      setLast(l);
      setWallets(w);
    } catch (e: any) {
      setAuthError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  };

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setLoading(true);
    try {
      const res = await API.login(email, password);
      setToken(res.access_token);
      await loadDashboard(res.access_token);
    } catch (e: any) {
      setAuthError('Login failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    API.listTransactions(typeFilter, page, 10).then(setList).catch(() => {});
  }, [typeFilter, page]);

  if (!loggedIn) {
    return (
      <div className="container d-flex align-items-center justify-content-center min-vh-100">
        <div className="card shadow-sm border-0" style={{ maxWidth: 420, width: '100%' }}>
          <div className="card-body p-4">
            <div className="d-flex align-items-center mb-3">
              <span className="fs-4 fw-bold text-primary">Mini Banking</span>
            </div>
            <form onSubmit={onLogin} className="vstack gap-3">
              <div>
                <label className="form-label">Email</label>
                <input className="form-control" placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <label className="form-label">Password</label>
                <input className="form-control" placeholder="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <button className="btn btn-primary w-100" type="submit" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
              {authError && <div className="alert alert-danger mt-2 mb-0" role="alert">{authError}</div>}
              <div className="small text-muted text-center">Demo: demo@example.com / password</div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="row min-vh-100">
        <aside className="col-12 col-md-3 col-lg-2 d-md-block bg-white border-end p-3">
          <div className="d-flex align-items-center mb-3">
            <span className="fs-5 fw-bold text-primary">Mini Banking</span>
          </div>
          <nav className="nav nav-pills flex-column gap-2">
            <span className="text-uppercase text-muted small">Menu</span>
            <a className="nav-link active" href="#dashboard">Dashboard</a>
            <a className="nav-link" href="#transactions">Transactions</a>
            <a className="nav-link" href="#transfer">Transfer</a>
            <a className="nav-link" href="#exchange">Exchange</a>
            <button className="btn btn-outline-secondary mt-3" onClick={() => loadDashboard(token)} disabled={loading}>Refresh Data</button>
          </nav>
        </aside>
        <main className="col-12 col-md-9 col-lg-10 p-4">
          <section id="dashboard" className="mb-4">
              <div className="row g-3">
                <div className="col-md-6">
                  <div className="card shadow-sm border-0">
                    <div className="card-body">
                      <h5 className="card-title mb-3">Balances</h5>
                      {balances ? (
                        <div className="d-flex gap-4">
                          <div className="badge bg-light text-dark p-3">USD <span className="ms-2 fw-semibold">{fmt(balances.USD, 'USD')}</span></div>
                          <div className="badge bg-light text-dark p-3">EUR <span className="ms-2 fw-semibold">{fmt(balances.EUR, 'EUR')}</span></div>
                        </div>
                      ) : (
                        <div className="text-muted">Load balances after login</div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="card shadow-sm border-0">
                    <div className="card-body">
                      <h5 className="card-title mb-3">Last 5 transactions</h5>
                      <ul className="list-group list-group-flush">
                        {last.map((t) => (
                          <li className="list-group-item" key={t.id}>
                            <span className="badge text-bg-secondary text-capitalize me-2">{t.type}</span>
                            {fmt(t.amountCents, t.currency)}
                            <span className="text-muted ms-2">{new Date(t.createdAt).toLocaleString()}</span>
                          </li>
                        ))}
                        {last.length === 0 && <li className="list-group-item text-muted">No recent transactions</li>}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </section>

          <section id="transactions" className="mb-4">
            <div className="card shadow-sm border-0">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="card-title mb-0">Transactions</h5>
                  <div className="d-flex align-items-center gap-2">
                    <span className="text-muted">Filter</span>
                    <select className="form-select" style={{ maxWidth: 220 }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)}>
                      <option value="">All</option>
                      <option value="transfer">Transfer</option>
                      <option value="exchange">Exchange</option>
                    </select>
                  </div>
                </div>
                {list ? (
                  <>
                    <div className="table-responsive">
                      <table className="table align-middle">
                        <thead>
                          <tr>
                            <th>Type</th>
                            <th>Amount</th>
                            <th>Currency</th>
                            <th>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {list.items.map((t) => (
                            <tr key={t.id}>
                              <td><span className="badge text-bg-secondary text-capitalize">{t.type}</span></td>
                              <td className="fw-semibold">{fmt(t.amountCents, t.currency)}</td>
                              <td>{t.currency}</td>
                              <td className="text-muted">{new Date(t.createdAt).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="d-flex gap-2">
                      <button className="btn btn-outline-secondary" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>Prev</button>
                      <button className="btn btn-outline-secondary" onClick={() => setPage(page + 1)} disabled={list.page * list.limit >= list.total}>Next</button>
                      <div className="ms-auto text-muted">Page {list.page} / {Math.ceil(list.total / list.limit)} · Total {list.total}</div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4 text-muted">Loading…</div>
                )}
              </div>
            </div>
          </section>

          {loggedIn && (
            <section id="transfer" className="mb-4">
              <div className="card shadow-sm border-0">
                <div className="card-body">
                  <h5 className="card-title">Transfer</h5>
                  <Forms token={token} wallets={wallets} onDone={() => loadDashboard(token)} />
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

function Forms({ token, wallets, onDone }: { token: string; wallets: WalletDto[]; onDone: () => void }) {
  const [fromWalletId, setFromWalletId] = useState('');
  const [toWalletId, setToWalletId] = useState('');
  const [amountTransfer, setAmountTransfer] = useState('');
  const [errTransfer, setErrTransfer] = useState('');

  const [usdWalletId, setUsdWalletId] = useState('');
  const [eurWalletId, setEurWalletId] = useState('');
  const [fromCurrency, setFromCurrency] = useState<'USD'|'EUR'>('USD');
  const [amountExchange, setAmountExchange] = useState('');
  const [errExchange, setErrExchange] = useState('');

  const [transferCurrency, setTransferCurrency] = useState<'USD'|'EUR'>('USD');
  const [recipientMode, setRecipientMode] = useState<'select'|'manual'>('select');

  useEffect(() => {
    // Prefill wallet IDs when wallets load
    const usd = wallets.find(w => w.currency === 'USD');
    const eur = wallets.find(w => w.currency === 'EUR');
    if (usd) {
      setUsdWalletId(usd.id);
      if (transferCurrency === 'USD') setFromWalletId(usd.id);
    }
    if (eur) {
      setEurWalletId(eur.id);
      if (transferCurrency === 'EUR') setFromWalletId(eur.id);
    }
  }, [wallets]);

  const walletOptions = wallets.filter(w => w.currency === transferCurrency);

  const converted = useMemo(() => {
    const val = parseFloat(amountExchange || '0');
    if (Number.isNaN(val)) return '';
    if (fromCurrency === 'USD') return (val * 0.92).toFixed(2) + ' EUR';
    return (val / 0.92).toFixed(2) + ' USD';
  }, [amountExchange, fromCurrency]);

  const submitTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrTransfer('');
    try {
      await API.transfer(token, fromWalletId, toWalletId, amountTransfer);
      onDone();
    } catch (e: any) {
      setErrTransfer('Transfer failed');
    }
  };

  const submitExchange = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrExchange('');
    try {
      await API.exchange(token, usdWalletId, eurWalletId, fromCurrency, amountExchange);
      onDone();
    } catch (e: any) {
      setErrExchange('Exchange failed');
    }
  };

  return (
    <div className="row g-3">
      <div className="col-md-6">
        <form onSubmit={submitTransfer} className="vstack gap-2">
          <div className="d-flex gap-2 align-items-center">
            <label className="form-label mb-0">Currency</label>
            <select className="form-select" style={{ maxWidth: 180 }} value={transferCurrency} onChange={(e) => { const c = e.target.value as 'USD'|'EUR'; setTransferCurrency(c); setFromWalletId(''); setToWalletId(''); }}>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
          <div className="form-floating">
            <select className="form-select" id="fromWallet" value={fromWalletId} onChange={(e) => setFromWalletId(e.target.value)}>
              <option value="">Select your {transferCurrency} wallet</option>
              {walletOptions.map(w => (
                <option key={w.id} value={w.id}>{w.id.slice(0,8)}… · {transferCurrency} { (w.balanceCents/100).toFixed(2) }</option>
              ))}
            </select>
            <label htmlFor="fromWallet">From wallet</label>
          </div>
          <div className="d-flex align-items-center justify-content-between">
            <label className="form-label mb-0">Recipient</label>
            <div className="form-check form-switch">
              <input className="form-check-input" type="checkbox" id="recipientMode" checked={recipientMode==='manual'} onChange={(e)=>{ setRecipientMode(e.target.checked?'manual':'select'); setToWalletId(''); }} />
              <label className="form-check-label" htmlFor="recipientMode">Manual input</label>
            </div>
          </div>
          {recipientMode === 'select' ? (
            <div className="form-floating">
              <select className="form-select" id="toWalletSelect" value={toWalletId} onChange={(e)=>setToWalletId(e.target.value)}>
                <option value="">Select a {transferCurrency} wallet</option>
                {walletOptions
                  .filter(w => w.id !== fromWalletId)
                  .map(w => (
                    <option key={w.id} value={w.id}>{w.id.slice(0,8)}… · {transferCurrency} { (w.balanceCents/100).toFixed(2) }</option>
                  ))}
              </select>
              <label htmlFor="toWalletSelect">Recipient wallet</label>
            </div>
          ) : (
            <div className="form-floating">
              <input className="form-control" id="toWallet" placeholder="Recipient wallet ID (same currency)" value={toWalletId} onChange={(e) => setToWalletId(e.target.value)} />
              <label htmlFor="toWallet">Recipient wallet ID</label>
            </div>
          )}
          <div className="form-floating">
            <input className="form-control" id="transferAmount" placeholder="Amount (e.g. 10.00)" value={amountTransfer} onChange={(e) => setAmountTransfer(e.target.value)} />
            <label htmlFor="transferAmount">Amount (e.g. 10.00)</label>
          </div>
          <button className="btn btn-primary" type="submit">Submit Transfer</button>
          {errTransfer && <div className="alert alert-danger" role="alert">{errTransfer}</div>}
        </form>
      </div>

      <div className="col-md-6">
        <form onSubmit={submitExchange} className="vstack gap-2">
          <div className="d-flex gap-2 align-items-center">
            <label className="form-label mb-0">From currency</label>
            <select className="form-select" style={{ maxWidth: 180 }} value={fromCurrency} onChange={(e) => setFromCurrency(e.target.value as any)}>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
          <div className="form-floating">
            <input className="form-control" id="usdWallet" placeholder="USD wallet ID" value={usdWalletId} onChange={(e) => setUsdWalletId(e.target.value)} />
            <label htmlFor="usdWallet">USD wallet ID</label>
          </div>
          <div className="form-floating">
            <input className="form-control" id="eurWallet" placeholder="EUR wallet ID" value={eurWalletId} onChange={(e) => setEurWalletId(e.target.value)} />
            <label htmlFor="eurWallet">EUR wallet ID</label>
          </div>
          <div className="form-floating">
            <input className="form-control" id="exchangeAmount" placeholder="Amount (e.g. 10.00)" value={amountExchange} onChange={(e) => setAmountExchange(e.target.value)} />
            <label htmlFor="exchangeAmount">Amount (e.g. 10.00)</label>
          </div>
          <div className="text-muted">Converted: <span className="fw-semibold">{converted}</span> (1 USD = 0.92 EUR)</div>
          <button className="btn btn-success" type="submit">Submit Exchange</button>
          {errExchange && <div className="alert alert-danger" role="alert">{errExchange}</div>}
        </form>
      </div>
    </div>
  );
}


