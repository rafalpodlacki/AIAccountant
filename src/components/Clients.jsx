import React, { useEffect, useState } from 'react';
import { collection, addDoc, deleteDoc, doc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';

export default function Clients({ uid }) {
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', address: '' });

  useEffect(() => {
    const q = query(collection(db, 'users', uid, 'clients'), orderBy('name'));
    return onSnapshot(q, (snap) => setClients(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [uid]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    await addDoc(collection(db, 'users', uid, 'clients'), form);
    setForm({ name: '', email: '', address: '' });
  }

  async function handleDelete(id) {
    if (confirm('Delete this client?')) await deleteDoc(doc(db, 'users', uid, 'clients', id));
  }

  return (
    <div>
      <h1 className="font-serif text-3xl text-ink mb-1">Clients</h1>
      <p className="font-mono text-xs text-ink/60 mb-8">Who you invoice.</p>

      <form onSubmit={handleSubmit} className="border border-line p-5 mb-8 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
        <div>
          <label className="block font-mono text-[11px] text-ink/70 mb-1">Name</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="block font-mono text-[11px] text-ink/70 mb-1">Email</label>
          <input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <label className="block font-mono text-[11px] text-ink/70 mb-1">Address</label>
          <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
        <button type="submit" className="bg-ledger text-paper px-5 py-2 font-serif hover:bg-ledgerlight transition-colors">
          Add client
        </button>
      </form>

      <table className="w-full ledger-table text-sm">
        <thead>
          <tr className="text-left font-mono text-xs text-ink/70">
            <th className="py-2 pr-2">Name</th>
            <th className="py-2 pr-2">Email</th>
            <th className="py-2 pr-2">Address</th>
            <th className="py-2"></th>
          </tr>
        </thead>
        <tbody>
          {clients.map((c) => (
            <tr key={c.id}>
              <td className="py-2 pr-2">{c.name}</td>
              <td className="py-2 pr-2 font-mono text-xs">{c.email}</td>
              <td className="py-2 pr-2 font-mono text-xs">{c.address}</td>
              <td className="py-2 text-right font-mono text-xs">
                <button onClick={() => handleDelete(c.id)} className="text-ink/50 hover:text-debit">del</button>
              </td>
            </tr>
          ))}
          {clients.length === 0 && (
            <tr><td colSpan={4} className="py-6 text-center font-mono text-xs text-ink/50">No clients yet.</td></tr>
          )}
        </tbody>
      </table>

      <style>{`.input { border: 1px solid #D8D5C8; background: transparent; padding: 0.4rem 0.6rem; font-family: "IBM Plex Mono", monospace; font-size: 0.8rem; color: #14213D; width: 100%; } .input:focus { outline: none; border-color: #1E3D34; }`}</style>
    </div>
  );
}
