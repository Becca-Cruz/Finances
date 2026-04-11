// Get weighted-average rate for a given month from conversion records
export function getMonthlyRate(conversions, yearMonth) {
  const filtered = conversions.filter(c => c.date.startsWith(yearMonth))
  if (filtered.length === 0) return null
  const totalARS = filtered.reduce((s, c) => s + c.amountARS, 0)
  return filtered.reduce((s, c) => s + c.rateARS_USD * c.amountARS, 0) / totalARS
}

// Get best rate for a specific date: tries current month, then walks back up to 6 months
export function getRateForDate(conversions, dateStr) {
  if (!dateStr || conversions.length === 0) return null
  const [year, month] = dateStr.split('-').map(Number)

  for (let i = 0; i <= 6; i++) {
    let m = month - i
    let y = year
    while (m < 1) { m += 12; y -= 1 }
    const ym = `${y}-${String(m).padStart(2, '0')}`
    const rate = getMonthlyRate(conversions, ym)
    if (rate) return rate
  }

  // Fallback: global weighted average
  const totalARS = conversions.reduce((s, c) => s + c.amountARS, 0)
  return conversions.reduce((s, c) => s + c.rateARS_USD * c.amountARS, 0) / totalARS
}

export function arsToUsd(ars, rate) { return rate ? ars / rate : 0 }
export function usdToArs(usd, rate) { return rate ? usd * rate : 0 }

export function fmtARS(n) {
  const num = new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n ?? 0)
  return `ARS ${num}`
}

export function fmtUSD(n) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(n ?? 0)
}

export function fmtRate(n) {
  return n ? new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(n) : '—'
}
