import * as XLSX from 'xlsx'

function parseDDMMYYYY(str) {
  if (!str) return null
  const parts = String(str).trim().split(/[\s/]/)
  // "02/12/2025 18:47:09" or "15/12/2025"
  const [d, m, y] = parts
  if (!d || !m || !y) return null
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

function num(v) {
  const n = parseFloat(String(v).replace(',', '.'))
  return isNaN(n) ? 0 : n
}

export function parseEtoroXLSX(arrayBuffer) {
  const wb = XLSX.read(arrayBuffer, { type: 'array', raw: false })

  // ── Account Activity ──────────────────────────────────────────────────
  const actRows = XLSX.utils.sheet_to_json(wb.Sheets['Account Activity'], {
    header: 1, raw: false, defval: '',
  })

  const activity = actRows.slice(1)
    .map(r => ({
      date:          parseDDMMYYYY(r[0]),
      type:          String(r[1]).trim(),
      details:       String(r[2]).trim(),
      amount:        num(r[3]),
      equityChange:  r[5] === '-' ? 0 : num(r[5]),
      equity:        num(r[6]),
    }))
    .filter(r => r.date)

  // ── Dividends sheet (more complete than activity for withholding) ───────
  const divRows = XLSX.utils.sheet_to_json(wb.Sheets['Dividends'], {
    header: 1, raw: false, defval: '',
  })

  const dividends = divRows.slice(1)
    .map(r => ({
      date:       parseDDMMYYYY(r[0]),
      instrument: String(r[1]).trim(),
      amount:     num(r[2]),
      tax:        num(r[8]),
    }))
    .filter(r => r.date && r.amount > 0)

  // ── Build monthly summaries ───────────────────────────────────────────
  const monthMap = {}
  const ensure = (ym) => {
    if (!monthMap[ym]) monthMap[ym] = { ym, deposit: 0, dividends: 0, lastEquity: 0 }
  }

  for (const r of activity) {
    const ym = r.date.slice(0, 7)
    ensure(ym)
    if (r.type === 'Deposit') monthMap[ym].deposit += r.amount
    if (r.type === 'Dividend') monthMap[ym].dividends += r.amount
    if (r.equity > 0) monthMap[ym].lastEquity = r.equity
  }

  const months = Object.values(monthMap).sort((a, b) => a.ym.localeCompare(b.ym))
  let cum = 0
  for (const m of months) {
    cum += m.deposit
    m.totalDeposited = parseFloat(cum.toFixed(2))
    m.profit = parseFloat((m.lastEquity - cum).toFixed(2))
    m.dividends = parseFloat(m.dividends.toFixed(2))
    m.lastEquity = parseFloat(m.lastEquity.toFixed(2))
  }

  // ── Dividend breakdown by instrument ──────────────────────────────────
  const byInstrument = {}
  for (const d of dividends) {
    if (!byInstrument[d.instrument]) byInstrument[d.instrument] = 0
    byInstrument[d.instrument] = parseFloat((byInstrument[d.instrument] + d.amount).toFixed(2))
  }

  const totalDividends = parseFloat(dividends.reduce((s, d) => s + d.amount, 0).toFixed(2))
  const lastEquity = months[months.length - 1]?.lastEquity || 0
  const totalDeposited = months[months.length - 1]?.totalDeposited || 0

  return {
    months,
    dividends,
    byInstrument,
    totalDeposited,
    totalDividends,
    lastEquity,
    profit: parseFloat((lastEquity - totalDeposited).toFixed(2)),
  }
}
