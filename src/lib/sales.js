import { getRateForDate, arsToUsd } from './currency'

// Sales saved before multi-item support only have flat description/quantity/priceARS fields.
// Sales saved before USD support have per-item `priceARS` instead of the currency-agnostic `price`.
export const getItems = (sale) => {
  if (sale.items && sale.items.length) {
    return sale.items.map(it => ({
      description: it.description,
      quantity:    it.quantity,
      price:       it.price ?? it.priceARS ?? 0,
    }))
  }
  return [{ description: sale.description, quantity: sale.quantity, price: sale.priceARS }]
}

// Sales saved before USD support have no totalUSD; estimate it from that sale's date rate.
export const getSaleUSD = (sale, conversions) => {
  if (sale.totalUSD != null) return sale.totalUSD
  const rate = getRateForDate(conversions, sale.date)
  return rate ? arsToUsd(sale.totalARS, rate) : null
}
