import { supabase } from './supabase'

const handle = async (q) => {
  const { data, error } = await q
  if (error) throw error
  return data
}

export const bizAPI = {
  // ── Business Profile ──────────────────────────────────────
  getProfile: (userId) =>
    handle(supabase.from('biz_profile').select('*').eq('user_id', userId).maybeSingle()),

  saveProfile: async (userId, data) => {
    const { data: existing } = await supabase.from('biz_profile')
      .select('id').eq('user_id', userId).maybeSingle()
    if (existing?.id) {
      return handle(supabase.from('biz_profile')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', existing.id).select().single())
    }
    return handle(supabase.from('biz_profile')
      .insert({ user_id: userId, ...data }).select().single())
  },

  // ── Products / Services ───────────────────────────────────
  getProducts: (userId) =>
    handle(supabase.from('biz_products').select('*')
      .eq('user_id', userId).eq('active', true).order('name')),

  addProduct: (userId, data) =>
    handle(supabase.from('biz_products')
      .insert({ user_id: userId, ...data }).select().single()),

  updateProduct: (id, data) =>
    handle(supabase.from('biz_products').update(data).eq('id', id).select().single()),

  softDeleteProduct: (id) =>
    handle(supabase.from('biz_products').update({ active: false }).eq('id', id)),

  // ── Sales ─────────────────────────────────────────────────
  getSales: (userId) =>
    handle(supabase.from('biz_sales')
      .select('*, biz_sale_items(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(200)),

  addSale: async (userId, saleData, items) => {
    const { data: sale, error } = await supabase.from('biz_sales')
      .insert({ user_id: userId, ...saleData }).select().single()
    if (error) throw error
    if (items?.length > 0) {
      const { error: ie } = await supabase.from('biz_sale_items')
        .insert(items.map(it => ({ ...it, sale_id: sale.id, user_id: userId })))
      if (ie) throw ie
    }
    const { data: full } = await supabase.from('biz_sales')
      .select('*, biz_sale_items(*)').eq('id', sale.id).single()
    return full
  },

  updateSaleStatus: (id, status) =>
    handle(supabase.from('biz_sales').update({ status }).eq('id', id)),

  deleteSale: (id) =>
    handle(supabase.from('biz_sales').delete().eq('id', id)),

  // ── Clients ───────────────────────────────────────────────
  getClients: (userId) =>
    handle(supabase.from('biz_clients').select('*')
      .eq('user_id', userId).order('name')),

  addClient: (userId, data) =>
    handle(supabase.from('biz_clients')
      .insert({ user_id: userId, ...data }).select().single()),

  updateClient: (id, data) =>
    handle(supabase.from('biz_clients').update(data).eq('id', id)),

  deleteClient: (id) =>
    handle(supabase.from('biz_clients').delete().eq('id', id)),

  // ── Cash Flow ─────────────────────────────────────────────
  getCashflow: (userId) =>
    handle(supabase.from('biz_cashflow').select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(300)),

  addCashflow: (userId, data) =>
    handle(supabase.from('biz_cashflow')
      .insert({ user_id: userId, ...data }).select().single()),

  deleteCashflow: (id) =>
    handle(supabase.from('biz_cashflow').delete().eq('id', id)),
}
