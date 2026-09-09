import React, { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './context/AuthContext';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Transactions from './components/Transactions';
import Invoices from './components/Invoices';
import Clients from './components/Clients';
import VatReturn from './components/VatReturn';
import Reports from './components/Reports';
import Settings from './components/Settings';

export default function App() {
  const { user } = useAuth();
  const [page, setPage] = useState('dashboard');
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    if (!user) return;
    const ref = doc(db, 'users', user.uid, 'settings', 'company');
    const unsub = onSnapshot(ref, (snap) => {
      setSettings(snap.exists() ? snap.data() : {});
    });
    return unsub;
  }, [user]);

  if (user === undefined) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center font-mono text-ink/60 text-sm">
        Loading…
      </div>
    );
  }

  if (!user) return <Login />;

  const vatRate = settings?.defaultVatRate ?? 20;

  const pages = {
    dashboard: <Dashboard uid={user.uid} settings={settings} setPage={setPage} />,
    transactions: <Transactions uid={user.uid} vatRate={vatRate} />,
    invoices: <Invoices uid={user.uid} vatRate={vatRate} />,
    clients: <Clients uid={user.uid} />,
    vat: <VatReturn uid={user.uid} settings={settings} />,
    reports: <Reports uid={user.uid} />,
    settings: <Settings uid={user.uid} settings={settings} />,
  };

  return (
    <div className="min-h-screen bg-paper flex flex-col md:flex-row">
      <Sidebar page={page} setPage={setPage} companyName={settings?.companyName} />
      <main className="flex-1 p-5 md:p-10 max-w-6xl">{pages[page]}</main>
    </div>
  );
}
