export const DEFAULT_CATEGORIES = [
  // Top-level
  { id: 'comida-calle',    name: 'Comida calle',    color: '#f59e0b', parentId: null },
  { id: 'super',           name: 'Super',           color: '#84cc16', parentId: null },
  { id: 'servicios',       name: 'Servicios',       color: '#14b8a6', parentId: null },
  { id: 'medico',          name: 'Médico',          color: '#10b981', parentId: null },
  { id: 'uber',            name: 'Uber',            color: '#6366f1', parentId: null },
  // Entretenimiento + subcategory
  { id: 'entretenimiento', name: 'Entretenimiento', color: '#3b82f6', parentId: null },
  { id: 'subscripciones',  name: 'Subscripciones', color: '#0ea5e9', parentId: 'entretenimiento' },
  // Extra + subcategories
  { id: 'extra',           name: 'Extra',           color: '#6b7280', parentId: null },
  { id: 'bolucompras',     name: 'Bolucompras',     color: '#8b5cf6', parentId: 'extra' },
  { id: 'chuche',          name: 'chuche',          color: '#f97316', parentId: 'extra' },
  { id: 'belleza',         name: 'Belleza',         color: '#ef4444', parentId: 'extra' },
  { id: 'regalos',         name: 'Regalos',         color: '#f43f5e', parentId: 'extra' },
  { id: 'ropa',            name: 'Ropa',            color: '#ec4899', parentId: 'extra' },
]

export const SWATCH_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16',
  '#22c55e', '#10b981', '#06b6d4', '#3b82f6',
  '#6366f1', '#8b5cf6', '#ec4899', '#6b7280',
]

// Returns the parent category id for grouping (or self if top-level)
export function getParentId(catId, categories) {
  const cat = categories.find(c => c.id === catId)
  return cat?.parentId || catId
}
