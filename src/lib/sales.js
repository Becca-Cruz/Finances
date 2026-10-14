import { getRateForDate, arsToUsd } from './currency'

// Kinds of product an item can be. Order matters: it's the order used in summaries.
export const PRODUCT_TYPES = [
  { id: 'lapicera', singular: 'Lapicera', plural: 'Lapiceras' },
  { id: 'clip',     singular: 'Clip',     plural: 'Clips' },
  { id: 'llavero',  singular: 'Llavero',  plural: 'Llaveros' },
  { id: 'repuesto', singular: 'Repuesto', plural: 'Repuestos' },
]

export const getProductType = (id) => PRODUCT_TYPES.find(t => t.id === id) || PRODUCT_TYPES[0]

// Sales saved before multi-item support only have flat description/quantity/priceARS fields.
// Sales saved before USD support have per-item `priceARS` instead of the currency-agnostic `price`.
// Items saved before product types existed have no `type`; they were all lapiceras.
export const getItems = (sale) => {
  if (sale.items && sale.items.length) {
    return sale.items.map(it => ({
      description: it.description,
      quantity:    it.quantity,
      price:       it.price ?? it.priceARS ?? 0,
      type:        it.type || 'lapicera',
    }))
  }
  return [{ description: sale.description, quantity: sale.quantity, price: sale.priceARS, type: 'lapicera' }]
}

// Units sold per product type across the given sales, only types with quantity > 0, in PRODUCT_TYPES order.
export const getUnitsByType = (sales) => {
  const totals = {}
  sales.forEach(s => getItems(s).forEach(it => {
    totals[it.type] = (totals[it.type] || 0) + (Number(it.quantity) || 0)
  }))
  return PRODUCT_TYPES
    .map(t => ({ id: t.id, quantity: totals[t.id] || 0 }))
    .filter(t => t.quantity > 0)
}

// e.g. "89 lapiceras · 1 clip"
export const fmtUnitsByType = (units) => units
  .map(({ id, quantity }) => {
    const t = getProductType(id)
    return `${quantity} ${(quantity === 1 ? t.singular : t.plural).toLowerCase()}`
  })
  .join(' · ')

// Sales saved before USD support have no totalUSD; estimate it from that sale's date rate.
export const getSaleUSD = (sale, conversions) => {
  if (sale.totalUSD != null) return sale.totalUSD
  const rate = getRateForDate(conversions, sale.date)
  return rate ? arsToUsd(sale.totalARS, rate) : null
}
