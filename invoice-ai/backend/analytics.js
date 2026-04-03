const supabase = require('./supabase');

async function getAnalytics() {
  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('*');

  if (error) throw new Error(error.message);

  const vendorSpend = {};
  const monthlySpend = {};
  const currencyTotals = {};
  let duplicateCount = 0;

  invoices.forEach(inv => {
    const amount = inv.total_amount || 0;
    const vendor = inv.vendor || 'Unknown';
    const currency = inv.currency || 'USD';
    const date = inv.invoice_date || '';

    // Vendor totals
    vendorSpend[vendor] = (vendorSpend[vendor] || 0) + amount;

    // Monthly totals
    if (date.length >= 7) {
      const month = date.substring(0, 7);
      monthlySpend[month] = (monthlySpend[month] || 0) + amount;
    }

    // Currency totals
    currencyTotals[currency] = (currencyTotals[currency] || 0) + amount;

    if (inv.is_duplicate) duplicateCount++;
  });

  const avgConfidence = invoices.length > 0
    ? invoices.reduce((sum, i) => sum + (i.confidence_score || 0), 0) / invoices.length
    : 0;

  return {
    total_invoices: invoices.length,
    duplicate_invoices: duplicateCount,
    avg_confidence: Math.round(avgConfidence * 100) / 100,
    vendor_spend: Object.entries(vendorSpend)
      .map(([vendor, total]) => ({ vendor, total: Math.round(total * 100) / 100 }))
      .sort((a, b) => b.total - a.total),
    monthly_spend: Object.entries(monthlySpend)
      .map(([month, total]) => ({ month, total: Math.round(total * 100) / 100 }))
      .sort((a, b) => a.month.localeCompare(b.month)),
    currency_totals: Object.entries(currencyTotals)
      .map(([currency, total]) => ({ currency, total: Math.round(total * 100) / 100 }))
  };
}

module.exports = { getAnalytics };