import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebase';
import { formatGBP, formatDate } from '../utils/format';
import { calculateVatReturn } from '../utils/vat';

export default function VatReturn({ uid, settings }) {
  const [transactions, setTransactions] = useState([]);
  const [quarter, setQuarter] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'users', uid, 'transactions'));
    return onSnapshot(q, (snap) => setTransactions(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [uid]);

  const quarters = useMemo(() => {
    const set = new Set(transactions.map((t) => t.vatQuarter).filter(Boolean));
    return Array.from(set).sort().reverse();
  }, [transactions]);

  useEffect(() => {
    if (!quarter && quarters.length) setQuarter(quarters[0]);
  }, [quarters, quarter]);

  const result = quarter ? calculateVatReturn(transactions, quarter) : null;
  const lines = transactions.filter((t) => t.vatQuarter === quarter);

  if (!settings?.vatRegistered) {
    return (
      <div>
        <h1 className="font-serif text-3xl text-ink mb-1">VAT return</h1>
        <p className="font-mono text-xs text-ink/60 mb-8">
          Your company isn't marked as VAT registered. Turn this on in Settings if that changes.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-serif text-3xl text-ink mb-1">VAT return</h1>
      <p className="font-mono text-xs text-ink/60 mb-8">
        A working estimate of your quarterly return — check figures against HMRC before filing.
      </p>

      <div className="mb-6">
        <label className="block font-mono text-[11px] text-ink/70 mb-1">Quarter</label>
        <select className="input w-48" value={quarter} onChange={(e) => setQuarter(e.target.value)}>
          {quarters.map((q) => <option key={q} value={q}>{q}</option>)}
        </select>
      </div>

      {result && (
        <div className="border border-line p-6 mb-8 max-w-md font-mono text-sm tabular">
          <BoxRow n="1" label="VAT due on sales" value={result.box1VatDueOnSales} />
          <BoxRow n="4" label="VAT reclaimed on purchases" value={result.box4VatReclaimedOnPurchases} />
          <BoxRow n="5" label="Net VAT due" value={result.box5NetVatDue} bold />
          <BoxRow n="6" label="Total sales excl. VAT" value={result.box6TotalSalesExVat} />
          <BoxRow n="7" label="Total purchases excl. VAT" value={result.box7TotalPurchasesExVat} />
        </div>
      )}

      <table className="w-full ledger-table text-sm">
        <thead>
          <tr className="text-left font-mono text-xs text-ink/70">
            <th className="py-2 pr-2">Date</th>
            <th className="py-2 pr-2">Type</th>
            <th className="py-2 pr-2">Category</th>
            <th className="py-2 pr-2 text-right">Net</th>
            <th className="py-2 pr-2 text-right">VAT</th>
          </tr>
        </thead>
        <tbody className="tabular">
          {lines.map((t) => (
            <tr key={t.id}>
              <td className="py-2 pr-2 font-mono text-xs">{formatDate(t.date)}</td>
              <td className="py-2 pr-2 font-mono text-xs">{t.type}</td>
              <td className="py-2 pr-2">{t.category}</td>
              <td className="py-2 pr-2 text-right">{formatGBP(t.netAmount)}</td>
              <td className="py-2 pr-2 text-right">{formatGBP(t.vatAmount)}</td>
            </tr>
          ))}
          {lines.length === 0 && (
            <tr><td colSpan={5} className="py-6 text-center font-mono text-xs text-ink/50">No transactions in this quarter.</td></tr>
          )}
        </tbody>
      </table>

      <style>{`.input { border: 1px solid #D8D5C8; background: transparent; padding: 0.4rem 0.6rem; font-family: "IBM Plex Mono", monospace; font-size: 0.8rem; color: #14213D; } .input:focus { outline: none; border-color: #1E3D34; }`}</style>
    </div>
  );
}

function BoxRow({ n, label, value, bold }) {
  return (
    <div className={`flex justify-between py-1.5 ${bold ? 'border-t border-ink mt-1 pt-2 font-semibold' : 'border-b border-line'}`}>
      <span><span className="text-ink/40">Box {n}</span> · {label}</span>
      <span>{formatGBP(value)}</span>
    </div>
  );
}
