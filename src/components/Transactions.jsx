import React, { useEffect, useState } from 'react';
import {
  collection, addDoc, deleteDoc, doc, onSnapshot, orderBy, query, updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { formatGBP, formatDate, vatQuarter } from '../utils/format';
import { splitGross } from '../utils/vat';

const INCOME_CATEGORIES = ['Sales', 'Consulting', 'Interest received', 'Other income'];
const EXPENSE_CATEGORIES = [
  'Office costs', 'Travel', 'Materials/Stock', 'Subcontractors', 'Software/Subscriptions',
  'Insurance', 'Marketing', 'Accountancy/Legal', 'Bank charges', 'Motor expenses', 'Other expense',
];

const emptyForm = {
  date: new Date().toISOString().slice(0, 10),
  type: 'income',
  category: INCOME_CATEGORIES[0],
  description: '',
  grossAmount: '',
  vatRate: 20,
  hasVat: false,
};

export default function Transactions({ uid, vatRate }) {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ ...emptyForm, vatRate });
  const [editingId, setEditingId] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const q = query(collection(db, 'users', uid, 'transactions'), orderBy('date', 'desc'));
    return onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [uid]);

  function update(field, value) {
    setForm((f) => {
      const next = { ...f, [field]: value };
      if (field === 'type') {
        next.category = value === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0];
      }
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const gross = Number(form.grossAmount) || 0;
    const rate = form.hasVat ? Number(form.vatRate) : 0;
    const { net, vat } = splitGross(gross, rate);

    const record = {
      date: form.date,
      type: form.type,
      category: form.category,
      description: form.description,
      grossAmount: gross,
      netAmount: net,
      vatAmount: vat,
      vatRate: rate,
      vatQuarter: vatQuarter(form.date),
    };

    if (editingId) {
      await updateDoc(doc(db, 'users', uid, 'transactions', editingId), record);
      setEditingId(null);
    } else {
      await addDoc(collection(db, 'users', uid, 'transactions'), record);
    }
    setForm({ ...emptyForm, vatRate });
  }

  function startEdit(item) {
    setEditingId(item.id);
    setForm({
      date: item.date,
      type: item.type,
      category: item.category,
      description: item.description,
      grossAmount: item.grossAmount,
      vatRate: item.vatRate || vatRate,
      hasVat: item.vatAmount > 0,
    });
  }

  async function handleDelete(id) {
    if (confirm('Delete this transaction?')) {
      await deleteDoc(doc(db, 'users', uid, 'transactions', id));
    }
  }

  const visible = items.filter((i) => filter === 'all' || i.type === filter);
  const categories = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <div>
      <h1 className="font-serif text-3xl text-ink mb-1">Transactions</h1>
      <p className="font-mono text-xs text-ink/60 mb-8">Every pound in and out of the company.</p>

      <form onSubmit={handleSubmit} className="border border-line p-5 mb-8 grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
        <div className="col-span-2 md:col-span-1">
          <label className="block font-mono text-[11px] text-ink/70 mb-1">Date</label>
          <input type="date" required className="input" value={form.date} onChange={(e) => update('date', e.target.value)} />
        </div>
        <div>
          <label className="block font-mono text-[11px] text-ink/70 mb-1">Type</label>
          <select className="input" value={form.type} onChange={(e) => update('type', e.target.value)}>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </div>
        <div>
          <label className="block font-mono text-[11px] text-ink/70 mb-1">Category</label>
          <select className="input" value={form.category} onChange={(e) => update('category', e.target.value)}>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="block font-mono text-[11px] text-ink/70 mb-1">Description</label>
          <input className="input" value={form.description} onChange={(e) => update('description', e.target.value)} />
        </div>
        <div>
          <label className="block font-mono text-[11px] text-ink/70 mb-1">Amount (gross, £)</label>
          <input type="number" step="0.01" required className="input" value={form.grossAmount} onChange={(e) => update('grossAmount', e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="hasVat" checked={form.hasVat} onChange={(e) => update('hasVat', e.target.checked)} />
          <label htmlFor="hasVat" className="font-mono text-xs text-ink">Incl. VAT</label>
          {form.hasVat && (
            <input
              type="number"
              className="input w-16"
              value={form.vatRate}
              onChange={(e) => update('vatRate', e.target.value)}
            />
          )}
        </div>
        <div className="col-span-2 md:col-span-6 flex gap-3">
          <button type="submit" className="bg-ledger text-paper px-5 py-2 font-serif hover:bg-ledgerlight transition-colors">
            {editingId ? 'Update entry' : 'Add entry'}
          </button>
          {editingId && (
            <button type="button" onClick={() => { setEditingId(null); setForm({ ...emptyForm, vatRate }); }} className="font-mono text-xs text-ink/60">
              Cancel edit
            </button>
          )}
        </div>
      </form>

      <div className="flex gap-2 mb-3 font-mono text-xs">
        {['all', 'income', 'expense'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 border ${filter === f ? 'border-ink bg-ink text-paper' : 'border-line text-ink/60'}`}
          >
            {f}
          </button>
        ))}
      </div>

      <table className="w-full ledger-table text-sm">
        <thead>
          <tr className="text-left font-mono text-xs text-ink/70">
            <th className="py-2 pr-2">Date</th>
            <th className="py-2 pr-2">Category</th>
            <th className="py-2 pr-2">Description</th>
            <th className="py-2 pr-2 text-right">Net</th>
            <th className="py-2 pr-2 text-right">VAT</th>
            <th className="py-2 pr-2 text-right">Gross</th>
            <th className="py-2"></th>
          </tr>
        </thead>
        <tbody className="tabular">
          {visible.map((t) => (
            <tr key={t.id}>
              <td className="py-2 pr-2 font-mono text-xs">{formatDate(t.date)}</td>
              <td className="py-2 pr-2 font-mono text-xs">{t.category}</td>
              <td className="py-2 pr-2">{t.description}</td>
              <td className="py-2 pr-2 text-right">{formatGBP(t.netAmount)}</td>
              <td className="py-2 pr-2 text-right">{formatGBP(t.vatAmount)}</td>
              <td className={`py-2 pr-2 text-right font-medium ${t.type === 'expense' ? 'text-debit' : 'text-ledger'}`}>
                {t.type === 'expense' ? '−' : ''}{formatGBP(t.grossAmount)}
              </td>
              <td className="py-2 text-right font-mono text-xs whitespace-nowrap">
                <button onClick={() => startEdit(t)} className="text-ink/50 hover:text-ink mr-3">edit</button>
                <button onClick={() => handleDelete(t.id)} className="text-ink/50 hover:text-debit">del</button>
              </td>
            </tr>
          ))}
          {visible.length === 0 && (
            <tr><td colSpan={7} className="py-6 text-center font-mono text-xs text-ink/50">No transactions yet.</td></tr>
          )}
        </tbody>
      </table>

      <style>{`.input { border: 1px solid #D8D5C8; background: transparent; padding: 0.4rem 0.6rem; font-family: "IBM Plex Mono", monospace; font-size: 0.8rem; color: #14213D; width: 100%; } .input:focus { outline: none; border-color: #1E3D34; }`}</style>
    </div>
  );
}
