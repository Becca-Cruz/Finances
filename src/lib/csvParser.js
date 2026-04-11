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
