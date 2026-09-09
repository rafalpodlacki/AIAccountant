import React, { useEffect, useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

const DEFAULTS = {
  companyName: '',
  companyNumber: '',
  address: '',
  vatRegistered: false,
  vatNumber: '',
  defaultVatRate: 20,
  financialYearEndMonth: 3,
  financialYearEndDay: 31,
};

export default function Settings({ uid, settings }) {
  const [form, setForm] = useState(DEFAULTS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) setForm({ ...DEFAULTS, ...settings });
  }, [settings]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setSaved(false);
  }

  async function handleSave(e) {
    e.preventDefault();
    await setDoc(doc(db, 'users', uid, 'settings', 'company'), form);
    setSaved(true);
  }

  return (
    <div className="max-w-xl">
      <h1 className="font-serif text-3xl text-ink mb-1">Settings</h1>
      <p className="font-mono text-xs text-ink/60 mb-8">Company details used across invoices and VAT returns.</p>

      <form onSubmit={handleSave} className="space-y-5">
        <Field label="Company name">
          <input className="input" value={form.companyName} onChange={(e) => update('companyName', e.target.value)} />
        </Field>
        <Field label="Companies House number">
          <input className="input" value={form.companyNumber} onChange={(e) => update('companyNumber', e.target.value)} />
        </Field>
        <Field label="Registered address">
          <textarea className="input" rows={3} value={form.address} onChange={(e) => update('address', e.target.value)} />
        </Field>

        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="vatReg"
            checked={form.vatRegistered}
            onChange={(e) => update('vatRegistered', e.target.checked)}
          />
          <label htmlFor="vatReg" className="font-mono text-sm text-ink">VAT registered</label>
        </div>

        {form.vatRegistered && (
          <>
            <Field label="VAT number">
              <input className="input" value={form.vatNumber} onChange={(e) => update('vatNumber', e.target.value)} />
            </Field>
            <Field label="Default VAT rate (%)">
              <input
                type="number"
                className="input"
                value={form.defaultVatRate}
                onChange={(e) => update('defaultVatRate', Number(e.target.value))}
              />
            </Field>
          </>
        )}

        <Field label="Financial year end">
          <div className="flex gap-2">
            <select
              className="input"
              value={form.financialYearEndDay}
              onChange={(e) => update('financialYearEndDay', Number(e.target.value))}
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <select
              className="input"
              value={form.financialYearEndMonth}
              onChange={(e) => update('financialYearEndMonth', Number(e.target.value))}
            >
              {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
        </Field>

        <button type="submit" className="bg-ledger text-paper px-5 py-2 font-serif hover:bg-ledgerlight transition-colors">
          Save settings
        </button>
        {saved && <span className="ml-4 font-mono text-xs text-ledger">Saved</span>}
      </form>

      <style>{`.input { width: 100%; border: 1px solid #D8D5C8; background: transparent; padding: 0.5rem 0.75rem; font-family: "IBM Plex Mono", monospace; font-size: 0.875rem; color: #14213D; } .input:focus { outline: none; border-color: #1E3D34; }`}</style>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block font-mono text-xs text-ink/70 mb-1">{label}</label>
      {children}
    </div>
  );
}
