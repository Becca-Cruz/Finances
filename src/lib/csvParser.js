const MONTHS = {
  ene: '01', feb: '02', mar: '03', abr: '04', may: '05', jun: '06',
  jul: '07', ago: '08', sep: '09', oct: '10', nov: '11', dic: '12',
}

function parseSpanishDate(raw) {
  // "abr 01 2026 16:39"
  const parts = raw.trim().split(/\s+/)
  const month = MONTHS[parts[0]?.toLowerCase()]
  const day = parts[1]?.padStart(2, '0')
  const year = parts[2]
  if (!month || !day || !year) return null
  return `${year}-${month}-${day}`
}

function parseNum(str) {
  if (!str) return NaN
  return parseFloat(str.replace(/\+/g, '').replace(',', '.'))
}

function parseCSVLine(line) {
  const cols = []
  let cur = '', inQ = false
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ }
    else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = '' }
    else { cur += ch }
  }
  cols.push(cur.trim())
  return cols
}

// Map Spanish category names from Meow to app category IDs
function matchCategory(csvName, categories) {
  const lower = csvName.toLowerCase().trim()
  // Exact name match (case-insensitive)
  const exact = categories.find(c => c.name.toLowerCase() === lower)
  if (exact) return exact.id
  // Partial match
  const partial = categories.find(c => lower.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(lower))
  if (partial) return partial.id
  return 'extra'
}

// Parse Meow app CSV export — extracts Expensas rows only
export function parseMeowExpensesCSV(csvText, categories, conversions) {
  const lines = csvText.split('\n').map(l => l.trim()).filter(Boolean)
  const results = []

  // Build a month→rate lookup from existing conversions
  const monthRates = {}
  for (const c of conversions) {
    const ym = c.date.slice(0, 7)
    if (!monthRates[ym]) monthRates[ym] = { totalARS: 0, weightedSum: 0 }
    monthRates[ym].totalARS += c.amountARS
    monthRates[ym].weightedSum += c.rateARS_USD * c.amountARS
  }
  const getRate = (dateStr) => {
    const ym = dateStr.slice(0, 7)
    // Walk back up to 6 months to find a rate
    for (let i = 0; i <= 6; i++) {
      const [y, m] = ym.split('-').map(Number)
      let mm = m - i, yy = y
      while (mm < 1) { mm += 12; yy -= 1 }
      const key = `${yy}-${String(mm).padStart(2, '0')}`
      if (monthRates[key]?.totalARS > 0) {
        return monthRates[key].weightedSum / monthRates[key].totalARS
      }
    }
    return null
  }

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i])
    if (cols.length < 8) continue

    const [fecha, categoria, tipo, monto, , , , comentar] = cols
    if (tipo !== 'Expensas') continue

    const date = parseSpanishDate(fecha)
    const amountARS = Math.abs(parseNum(monto))
    if (!date || isNaN(amountARS) || amountARS === 0) continue

    const rate = getRate(date)
    const amountUSD = rate ? parseFloat((amountARS / rate).toFixed(2)) : 0
    const description = comentar.trim() || categoria

    results.push({
      id: `csv-exp-${date}-${amountARS}-${description.slice(0, 10)}`,
      date,
      description,
      category: matchCategory(categoria, categories),
      inputCurrency: 'ARS',
      inputAmount: amountARS,
      rateARS_USD: rate ? parseFloat(rate.toFixed(2)) : 0,
      amountARS,
      amountUSD,
    })
  }

  return results
}

export function parseDolarAppCSV(csvText) {
  const lines = csvText.split('\n').map(l => l.trim()).filter(Boolean)
  const results = []

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i])
    if (cols.length < 8) continue

    const [fecha, , , monto, , , , comentar] = cols
    const date = parseSpanishDate(fecha)
    const amountARS = parseNum(monto)
    const rate = parseNum(comentar)

    if (!date || isNaN(amountARS) || isNaN(rate) || rate === 0) continue

    results.push({
      id: `csv-${date}-${amountARS}-${rate}`,
      date,
      amountARS,
      rateARS_USD: rate,
      amountUSD: amountARS / rate,
      source: 'csv',
    })
  }

  return results
}
