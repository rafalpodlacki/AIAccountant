import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email, password);
    } catch (err) {
      setError('Could not sign in. Check your email and password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="font-mono text-xs tracking-wide text-ledger mb-1">DOUBLE-ENTRY</div>
          <h1 className="font-serif text-3xl text-ink">Ledger</h1>
        </div>
        <form onSubmit={handleSubmit} className="border border-line bg-white/40 p-8">
          <label className="block font-mono text-xs text-ink/70 mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full mb-4 border border-line bg-transparent px-3 py-2 font-mono text-sm text-ink focus:outline-none focus:border-ledger"
          />
          <label className="block font-mono text-xs text-ink/70 mb-1">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full mb-6 border border-line bg-transparent px-3 py-2 font-mono text-sm text-ink focus:outline-none focus:border-ledger"
          />
          {error && <p className="text-debit text-sm mb-4">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-ledger text-paper py-2 font-serif text-lg hover:bg-ledgerlight transition-colors disabled:opacity-50"
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="text-center text-xs text-ink/50 mt-6 font-mono">
          Create your user in Firebase Console → Authentication
        </p>
      </div>
    </div>
  );
}
