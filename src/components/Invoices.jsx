import React, { useEffect, useState } from 'react';
import {
  collection, addDoc, deleteDoc, doc, onSnapshot, orderBy, query, updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { formatGBP, formatDate, vatQuarter } from '../utils/format';

const emptyLine = () => ({ description: '', qty: 1, unitPrice: '', vatRate: 20 });

export default function Invoices({ uid, vatRate, settings }) {
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [form, setForm] = useState(blankForm(vatRate));

  useEffect(() => {
    const q1 = query(collection(db, 'users', uid, 'invoices'), orderBy('issueDate', 'desc'));
    const un1 = onSnapshot(q1, (snap) => setInvoices(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const q2 = query(collection(db, 'users', uid, 'clients'), orderBy('name'));
    const un2 = onSnapshot(q2, (snap) => setClients(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => { un1(); un2(); };
  }, [uid]);

  function blankForm(rate) {
    const next = invoices.length + 1;
    return {
      invoiceNumber: `INV-${String(next).padStart(4, '0')}`,
      clientId: '',
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate: '',
      lineItems: [emptyLine()],
      notes: '',
    };
  }

  function updateLine(i, field, value) {
    setForm((f) => {
      const lineItems = [...f.lineItems];
      lineItems[i] = { ...lineItems[i], [field]: value };
      return { ...f, lineItems };
    });
  }

  function addLine() {
    setForm((f) => ({ ...f, lineItems: [...f.lineItems, emptyLine()] }));
  }

  function removeLine(i) {
    setForm((f) => ({ ...f, lineItems: f.lineItems.filter((_, idx) => idx !== i) }));
  }

  function totals(lineItems) {
    let subtotal = 0, vatTotal = 0;
    lineItems.forEach((l) => {
      const lineNet = (Number(l.qty) || 0) * (Number(l.unitPrice) || 0);
      subtotal += lineNet;
      vatTotal += lineNet * ((Number(l.vatRate) || 0) / 100);
    });
    return { subtotal: round2(subtotal), vatTotal: round2(vatTotal), total: round2(subtotal + vatTotal) };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const client = clients.find((c) => c.id === form.clientId);
    const { subtotal, vatTotal, total } = totals(form.lineItems);
    await addDoc(collection(db, 'users', uid, 'invoices'), {
      ...form,
      clientName: client?.name || '',
      clientEmail: client?.email || '',
      clientAddress: client?.address || '',
      subtotal, vatTotal, total,
      status: 'draft',
      createdAt: new Date().toISOString(),
    });
    setForm(blankForm(vatRate));
    setShowForm(false);
  }

  async function markPaid(inv) {
    if (!confirm(`Mark ${inv.invoiceNumber} as paid and record the income?`)) return;
    const paidDate = new Date().toISOString().slice(0, 10);
    await updateDoc(doc(db, 'users', uid, 'invoices', inv.id), { status: 'paid', paidDate });
    await addDoc(collection(db, 'users', uid, 'transactions'), {
      date: paidDate,
      type: 'income',
      category: 'Sales',
      description: `${inv.invoiceNumber} — ${inv.clientName}`,
      netAmount: inv.subtotal,
      vatAmount: inv.vatTotal,
      grossAmount: inv.total,
      vatRate: inv.subtotal ? round2((inv.vatTotal / inv.subtotal) * 100) : 0,
      vatQuarter: vatQuarter(paidDate),
      invoiceId: inv.id,
    });
  }

  async function setStatus(inv, status) {
    await updateDoc(doc(db, 'users', uid, 'invoices', inv.id), { status });
  }

  function emailInvoice(inv) {
    const client = clients.find((c) => c.id === inv.clientId);
    if (!client?.email) {
      alert(`${inv.clientName || 'This client'} has no email address saved. Add one on the Clients tab first.`);
      return;
    }
    const subject = `Invoice ${inv.invoiceNumber}`;
    const body = [
      `Hi ${client.name},`,
      '',
      `Please find the details of invoice ${inv.invoiceNumber} below.`,
      '',
      ...inv.lineItems.map((l) => `- ${l.description}: ${l.qty} x ${formatGBP(l.unitPrice)} (VAT ${l.vatRate}%)`),
      '',
      `Subtotal: ${formatGBP(inv.subtotal)}`,
      `VAT: ${formatGBP(inv.vatTotal)}`,
      `Total due: ${formatGBP(inv.total)}`,
      inv.dueDate ? `Due date: ${formatDate(inv.dueDate)}` : '',
      '',
      'A printable copy is attached — open the invoice, click "Print / Save PDF", and attach it here before sending.',
      '',
      'Thanks,',
    ].filter((l) => l !== null && l !== undefined).join('\n');

    window.location.href = `mailto:${client.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    if (inv.status === 'draft') setStatus(inv, 'sent');
  }

  async function handleDelete(id) {
    if (confirm('Delete this invoice? (This will not remove any linked transaction.)')) {
      await deleteDoc(doc(db, 'users', uid, 'invoices', id));
    }
  }

  if (viewing) {
    return <InvoicePrintView invoice={viewing} settings={settings} onClose={() => setViewing(null)} onEmail={() => emailInvoice(viewing)} />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-serif text-3xl text-ink">Invoices</h1>
        <button
          onClick={() => { setForm(blankForm(vatRate)); setShowForm((s) => !s); }}
          className="bg-ledger text-paper px-4 py-2 font-serif hover:bg-ledgerlight transition-colors"
        >
          {showForm ? 'Close' : 'New invoice'}
        </button>
      </div>
      <p className="font-mono text-xs text-ink/60 mb-8">Bill clients and track what's owed.</p>

      {showForm && (
        <form onSubmit={handleSubmit} className="border border-line p-5 mb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div>
              <label className="block font-mono text-[11px] text-ink/70 mb-1">Invoice #</label>
              <input className="input" value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} />
            </div>
            <div>
              <label className="block font-mono text-[11px] text-ink/70 mb-1">Client</label>
              <select className="input" required value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
                <option value="">Select…</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-mono text-[11px] text-ink/70 mb-1">Issue date</label>
              <input type="date" className="input" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} />
            </div>
            <div>
              <label className="block font-mono text-[11px] text-ink/70 mb-1">Due date</label>
              <input type="date" className="input" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>
          </div>

          <table className="w-full mb-3 text-sm">
            <thead>
              <tr className="text-left font-mono text-[11px] text-ink/70">
                <th className="pb-1">Description</th>
                <th className="pb-1 w-16">Qty</th>
                <th className="pb-1 w-28">Unit price</th>
                <th className="pb-1 w-20">VAT %</th>
                <th className="pb-1 w-24 text-right">Line total</th>
                <th className="pb-1 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {form.lineItems.map((l, i) => (
                <tr key={i}>
                  <td className="pr-2 py-1"><input className="input" value={l.description} onChange={(e) => updateLine(i, 'description', e.target.value)} /></td>
                  <td className="pr-2 py-1"><input type="number" className="input" value={l.qty} onChange={(e) => updateLine(i, 'qty', e.target.value)} /></td>
                  <td className="pr-2 py-1"><input type="number" step="0.01" className="input" value={l.unitPrice} onChange={(e) => updateLine(i, 'unitPrice', e.target.value)} /></td>
                  <td className="pr-2 py-1"><input type="number" className="input" value={l.vatRate} onChange={(e) => updateLine(i, 'vatRate', e.target.value)} /></td>
                  <td className="py-1 text-right font-mono text-xs tabular">{formatGBP((Number(l.qty) || 0) * (Number(l.unitPrice) || 0))}</td>
                  <td className="py-1 text-right">
                    {form.lineItems.length > 1 && (
                      <button type="button" onClick={() => removeLine(i)} className="text-ink/40 hover:text-debit text-xs">✕</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" onClick={addLine} className="font-mono text-xs text-ledger hover:underline mb-4">+ add line</button>

          <div className="flex justify-end mb-4">
            <div className="w-56 font-mono text-sm tabular">
              <Row label="Subtotal" value={totals(form.lineItems).subtotal} />
              <Row label="VAT" value={totals(form.lineItems).vatTotal} />
              <Row label="Total" value={totals(form.lineItems).total} bold />
            </div>
          </div>

          <label className="block font-mono text-[11px] text-ink/70 mb-1">Notes</label>
          <textarea className="input mb-4" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />

          <button type="submit" className="bg-ledger text-paper px-5 py-2 font-serif hover:bg-ledgerlight transition-colors">
            Save invoice
          </button>
        </form>
      )}

      <table className="w-full ledger-table text-sm">
        <thead>
          <tr className="text-left font-mono text-xs text-ink/70">
            <th className="py-2 pr-2">Invoice</th>
            <th className="py-2 pr-2">Client</th>
            <th className="py-2 pr-2">Issued</th>
            <th className="py-2 pr-2">Due</th>
            <th className="py-2 pr-2 text-right">Total</th>
            <th className="py-2 pr-2">Status</th>
            <th className="py-2"></th>
          </tr>
        </thead>
        <tbody className="tabular">
          {invoices.map((inv) => (
            <tr key={inv.id}>
              <td className="py-2 pr-2 font-mono text-xs">{inv.invoiceNumber}</td>
              <td className="py-2 pr-2">{inv.clientName}</td>
              <td className="py-2 pr-2 font-mono text-xs">{formatDate(inv.issueDate)}</td>
              <td className="py-2 pr-2 font-mono text-xs">{formatDate(inv.dueDate)}</td>
              <td className="py-2 pr-2 text-right">{formatGBP(inv.total)}</td>
              <td className="py-2 pr-2">
                <StatusBadge status={inv.status} />
              </td>
              <td className="py-2 text-right font-mono text-xs whitespace-nowrap">
                <button onClick={() => setViewing(inv)} className="text-ink/50 hover:text-ink mr-3">view</button>
                <button onClick={() => emailInvoice(inv)} className="text-ink/50 hover:text-ink mr-3">email</button>
                {inv.status === 'draft' && (
                  <button onClick={() => setStatus(inv, 'sent')} className="text-ink/50 hover:text-ink mr-3">mark sent</button>
                )}
                {inv.status !== 'paid' && (
                  <button onClick={() => markPaid(inv)} className="text-ink/50 hover:text-ledger mr-3">mark paid</button>
                )}
                <button onClick={() => handleDelete(inv.id)} className="text-ink/50 hover:text-debit">del</button>
              </td>
            </tr>
          ))}
          {invoices.length === 0 && (
            <tr><td colSpan={7} className="py-6 text-center font-mono text-xs text-ink/50">No invoices yet.</td></tr>
          )}
        </tbody>
      </table>

      <style>{`.input { border: 1px solid #D8D5C8; background: transparent; padding: 0.4rem 0.6rem; font-family: "IBM Plex Mono", monospace; font-size: 0.8rem; color: #14213D; width: 100%; } .input:focus { outline: none; border-color: #1E3D34; }`}</style>
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div className={`flex justify-between py-1 ${bold ? 'border-t border-ink font-semibold mt-1 pt-2' : ''}`}>
      <span>{label}</span>
      <span>{formatGBP(value)}</span>
    </div>
  );
}

function StatusBadge({ status }) {
  const colors = {
    draft: 'text-ink/60 border-line',
    sent: 'text-ink border-ink/40',
    paid: 'text-ledger border-ledger',
  };
  return (
    <span className={`font-mono text-[11px] border px-2 py-0.5 uppercase ${colors[status] || ''}`}>
      {status}
    </span>
  );
}

function InvoicePrintView({ invoice, settings, onClose, onEmail }) {
  const s = settings || {};
  return (
    <div>
      <div className="flex justify-between mb-6 no-print">
        <button onClick={onClose} className="font-mono text-xs text-ink/60 hover:text-ink">← back</button>
        <div className="flex gap-2">
          <button onClick={onEmail} className="border border-ink text-ink px-4 py-2 font-serif text-sm hover:bg-ink hover:text-paper transition-colors">
            Email invoice
          </button>
          <button onClick={() => window.print()} className="bg-ledger text-paper px-4 py-2 font-serif text-sm hover:bg-ledgerlight">
            Print / Save PDF
          </button>
        </div>
      </div>
      <div className="border border-line bg-white max-w-2xl">
        <div className="h-2 bg-ledger" />
        <div className="p-10">
          {/* Header: logo + company, invoice title */}
          <div className="flex justify-between items-start mb-10 pb-8 border-b border-line">
            <div className="flex items-start gap-4">
              {s.logoDataUrl && (
                <img src={s.logoDataUrl} alt={s.companyName || 'Logo'} className="h-14 w-14 object-contain" />
              )}
              <div>
                <div className="font-serif text-lg text-ink leading-tight">{s.companyName || 'Your company'}</div>
                {s.address && <div className="font-mono text-[11px] text-ink/60 whitespace-pre-line mt-1">{s.address}</div>}
                <div className="font-mono text-[11px] text-ink/60 mt-1">
                  {s.email && <div>{s.email}</div>}
                  {s.phone && <div>{s.phone}</div>}
                  {s.companyNumber && <div>Co. no. {s.companyNumber}</div>}
                  {s.vatRegistered && s.vatNumber && <div>VAT {s.vatNumber}</div>}
                </div>
              </div>
            </div>
            <div className="text-right">
              <h1 className="font-serif text-3xl text-ink">Invoice</h1>
              <div className="font-mono text-xs text-ink/60 mt-1">{invoice.invoiceNumber}</div>
              <div className="font-mono text-[11px] text-ink/60 mt-3">Issued {formatDate(invoice.issueDate)}</div>
              {invoice.dueDate && <div className="font-mono text-[11px] text-ink/60">Due {formatDate(invoice.dueDate)}</div>}
            </div>
          </div>

          {/* Bill to */}
          <div className="mb-8">
            <div className="font-mono text-[11px] text-ink/50 uppercase tracking-wide mb-1">Bill to</div>
            <div className="font-serif text-lg text-ink">{invoice.clientName}</div>
            {invoice.clientAddress && <div className="font-mono text-xs text-ink/60 whitespace-pre-line mt-1">{invoice.clientAddress}</div>}
            {invoice.clientEmail && <div className="font-mono text-xs text-ink/60 mt-1">{invoice.clientEmail}</div>}
          </div>

          <table className="w-full mb-6 text-sm">
            <thead>
              <tr className="text-left font-mono text-xs text-ink/70 border-b-2 border-ink">
                <th className="py-2">Description</th>
                <th className="py-2 text-right">Qty</th>
                <th className="py-2 text-right">Unit price</th>
                <th className="py-2 text-right">VAT</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="tabular">
              {invoice.lineItems.map((l, i) => (
                <tr key={i} className="border-b border-line">
                  <td className="py-2">{l.description}</td>
                  <td className="py-2 text-right">{l.qty}</td>
                  <td className="py-2 text-right">{formatGBP(l.unitPrice)}</td>
                  <td className="py-2 text-right">{l.vatRate}%</td>
                  <td className="py-2 text-right">{formatGBP((Number(l.qty) || 0) * (Number(l.unitPrice) || 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-end mb-8">
            <div className="w-56 font-mono text-sm tabular">
              <Row label="Subtotal" value={invoice.subtotal} />
              <Row label="VAT" value={invoice.vatTotal} />
              <Row label="Total due" value={invoice.total} bold />
            </div>
          </div>

          {(s.bankAccountNumber || s.bankSortCode) && (
            <div className="border-t border-line pt-5 mb-5">
              <div className="font-mono text-[11px] text-ink/50 uppercase tracking-wide mb-2">Payment details</div>
              <div className="font-mono text-xs text-ink/70 grid grid-cols-2 gap-x-6 gap-y-1 max-w-sm">
                {s.bankName && <><span className="text-ink/50">Bank</span><span>{s.bankName}</span></>}
                {s.bankAccountName && <><span className="text-ink/50">Account name</span><span>{s.bankAccountName}</span></>}
                {s.bankSortCode && <><span className="text-ink/50">Sort code</span><span>{s.bankSortCode}</span></>}
                {s.bankAccountNumber && <><span className="text-ink/50">Account no.</span><span>{s.bankAccountNumber}</span></>}
              </div>
            </div>
          )}

          {invoice.notes && <p className="font-mono text-xs text-ink/60 border-t border-line pt-4 mb-2">{invoice.notes}</p>}
          {s.invoiceFooterNote && <p className="font-serif text-sm text-ink/70 mt-4">{s.invoiceFooterNote}</p>}
        </div>
      </div>
    </div>
  );
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
