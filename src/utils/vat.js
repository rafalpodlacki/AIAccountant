// Simple VAT return calculator (standard VAT accounting scheme, cash or accrual
// is decided by which date you record transactions against).
//
// Box 1: VAT due on sales (output VAT)
// Box 4: VAT reclaimed on purchases (input VAT)
// Box 5: Net VAT due (Box1 - Box4)
// Box 6: Total sales excl. VAT
// Box 7: Total purchases excl. VAT
export function calculateVatReturn(transactions, quarter) {
  const inScope = transactions.filter((t) => t.vatQuarter === quarter);

  const sales = inScope.filter((t) => t.type === 'income');
  const purchases = inScope.filter((t) => t.type === 'expense');

  const box1 = sum(sales.map((t) => t.vatAmount));
  const box4 = sum(purchases.map((t) => t.vatAmount));
  const box6 = sum(sales.map((t) => t.netAmount));
  const box7 = sum(purchases.map((t) => t.netAmount));

  return {
    quarter,
    box1VatDueOnSales: round2(box1),
    box4VatReclaimedOnPurchases: round2(box4),
    box5NetVatDue: round2(box1 - box4),
    box6TotalSalesExVat: round2(box6),
    box7TotalPurchasesExVat: round2(box7),
    transactionCount: inScope.length,
  };
}

// Given a gross amount and a VAT rate (e.g. 20), returns { net, vat }.
export function splitGross(grossAmount, ratePercent) {
  const gross = Number(grossAmount) || 0;
  const rate = Number(ratePercent) || 0;
  const net = gross / (1 + rate / 100);
  const vat = gross - net;
  return { net: round2(net), vat: round2(vat) };
}

// Given a net amount and a VAT rate, returns { gross, vat }.
export function addVat(netAmount, ratePercent) {
  const net = Number(netAmount) || 0;
  const rate = Number(ratePercent) || 0;
  const vat = net * (rate / 100);
  return { gross: round2(net + vat), vat: round2(vat) };
}

function sum(arr) {
  return arr.reduce((a, b) => a + (Number(b) || 0), 0);
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
