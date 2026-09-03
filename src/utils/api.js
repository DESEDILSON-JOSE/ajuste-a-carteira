import { supabase } from './supabase'

const handle = async (promise) => {
  const { data, error } = await promise
  if (error) throw error
  return data
}

export const authAPI = {
  signUp: (email, password, name) =>
    supabase.auth.signUp({ email, password, options: { data: { name } } }),
  signIn: (email, password) =>
    supabase.auth.signInWithPassword({ email, password }),
  signOut: () => supabase.auth.signOut(),
  resetPassword: (email) =>
    supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/ajuste-a-carteira/`,
    }),
  updatePassword: (newPwd) => supabase.auth.updateUser({ password: newPwd }),
  getSession: () => supabase.auth.getSession(),
  onAuthStateChange: (cb) => supabase.auth.onAuthStateChange(cb),
}

export const profileAPI = {
  get: (userId) =>
    supabase.from('profiles').select('*').eq('id', userId).single(),
  update: async (userId, data) =>
    handle(supabase.from('profiles').update({ ...data, updated_at: new Date().toISOString() }).eq('id', userId)),
}

export const txAPI = {
  getAll: async (userId) =>
    handle(supabase.from('transactions').select('*').eq('user_id', userId).order('date', { ascending: false })),
  add: async (tx) => {
    const { data, error } = await supabase.from('transactions').insert(tx).select().single()
    if (error) throw error
    return data
  },
  update: async (id, data) =>
    handle(supabase.from('transactions').update(data).eq('id', id)),
  delete: async (id) =>
    handle(supabase.from('transactions').delete().eq('id', id)),
}

export const goalsAPI = {
  getAll: async (userId) =>
    handle(supabase.from('goals').select('*').eq('user_id', userId).order('position')),
  upsert: async (goal) => {
    const { data, error } = await supabase.from('goals').upsert({
      ...goal, updated_at: new Date().toISOString(),
    }).select().single()
    if (error) throw error
    return data
  },
  delete: async (id) =>
    handle(supabase.from('goals').delete().eq('id', id)),
}

export const lotsAPI = {
  getAll: async (userId) =>
    handle(supabase.from('lots').select(`
      *, lot_items(*), lot_expenses(*),
      workers(*, worker_items(*))
    `).eq('user_id', userId).order('created_at')),
  create: async (lot) => {
    const { data, error } = await supabase.from('lots').insert(lot).select().single()
    if (error) throw error
    return data
  },
  update: async (id, data) =>
    handle(supabase.from('lots').update(data).eq('id', id)),
  addItem: async (item) => {
    const { data, error } = await supabase.from('lot_items').insert(item).select().single()
    if (error) throw error
    return data
  },
  updateItem: async (id, data) =>
    handle(supabase.from('lot_items').update(data).eq('id', id)),
  deleteItem: async (id) =>
    handle(supabase.from('lot_items').delete().eq('id', id)),
  addExpense: async (e) => {
    const { data, error } = await supabase.from('lot_expenses').insert(e).select().single()
    if (error) throw error
    return data
  },
  deleteExpense: async (id) =>
    handle(supabase.from('lot_expenses').delete().eq('id', id)),
  addWorker: async (w) => {
    const { data, error } = await supabase.from('workers').insert(w).select().single()
    if (error) throw error
    return data
  },
  upsertWorkerItem: async (item) => {
    const { data, error } = await supabase.from('worker_items').upsert(item).select().single()
    if (error) throw error
    return data
  },
}

export const dreAPI = {
  get: async (userId, period) => {
    const { data } = await supabase.from('dre_entries')
      .select('*').eq('user_id', userId).eq('period', period).single()
    return data
  },
  upsert: async (userId, period, data) =>
    handle(supabase.from('dre_entries').upsert({
      user_id: userId, period, data,
      updated_at: new Date().toISOString(),
    })),
}

export const vplAPI = {
  getAll: async (userId) =>
    handle(supabase.from('vpl_projects').select('*').eq('user_id', userId).order('updated_at', { ascending: false })),
  upsert: async (project) => {
    const { data, error } = await supabase.from('vpl_projects').upsert({
      ...project, updated_at: new Date().toISOString(),
    }).select().single()
    if (error) throw error
    return data
  },
  delete: async (id) =>
    handle(supabase.from('vpl_projects').delete().eq('id', id)),
}
