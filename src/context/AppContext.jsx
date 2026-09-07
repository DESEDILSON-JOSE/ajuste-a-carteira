import { createContext, useContext, useReducer, useEffect, useCallback } from 'react'
import { authAPI, profileAPI, txAPI, goalsAPI, lotsAPI, vplAPI } from '../utils/api'
import { SEED_GOALS_TEMPLATE } from '../utils/seedData'
import { translateError, todayStr } from '../utils/formatters'

export const AppContext = createContext(null)

const initialState = {
  authLoading: true,
  user: null,
  profile: null,
  activeTab: 'dashboard',
  modal: null,
  modalType: 'expense',
  editingGoal: null,
  selM: new Date().getMonth() + 1,
  selY: new Date().getFullYear(),
  activeLotIdx: 0,
  activeNegTab: 'faccoes',
  transactions: [],
  goals: [],
  lots: [],
  vplProjects: [],
  toasts: [],
  offline: false,
}

function reducer(state, action) {
  switch (action.type) {
    case 'AUTH_LOADING': return { ...state, authLoading: true }
    case 'AUTH_SUCCESS': return { ...state, authLoading: false, user: action.user }
    case 'AUTH_CLEAR': return { ...initialState, authLoading: false }
    case 'SET_PROFILE': return { ...state, profile: action.profile }
    case 'SET_TAB': return { ...state, activeTab: action.tab }
    case 'SET_MODAL': return { ...state, modal: action.modal, editingGoal: action.editingGoal || null }
    case 'SET_MODAL_TYPE': return { ...state, modalType: action.modalType }
    case 'SET_PERIOD': return { ...state, selM: action.m, selY: action.y }
    case 'SET_LOT_IDX': return { ...state, activeLotIdx: action.idx }
    case 'SET_NEG_TAB': return { ...state, activeNegTab: action.tab }
    case 'SET_TXS': return { ...state, transactions: action.transactions }
    case 'ADD_TX': return { ...state, transactions: [action.tx, ...state.transactions] }
    case 'UPDATE_TX': return { ...state, transactions: state.transactions.map(t => t.id === action.id ? { ...t, ...action.data } : t) }
    case 'DEL_TX': return { ...state, transactions: state.transactions.filter(t => t.id !== action.id) }
    case 'SET_GOALS': return { ...state, goals: action.goals }
    case 'UPDATE_GOAL': return { ...state, goals: state.goals.map(g => g.id === action.goal.id ? action.goal : g) }
    case 'ADD_GOAL': return { ...state, goals: [...state.goals, action.goal] }
    case 'DEL_GOAL': return { ...state, goals: state.goals.filter(g => g.id !== action.id) }
    case 'SET_LOTS': return { ...state, lots: action.lots }
    case 'ADD_LOT': return { ...state, lots: [...state.lots, action.lot] }
    case 'UPDATE_LOT':
      return { ...state, lots: state.lots.map((l, i) => i === action.idx ? { ...l, ...action.data } : l) }
    case 'ADD_LOT_ITEM':
      return { ...state, lots: state.lots.map((l, i) => i === action.lotIdx ? { ...l, lot_items: [...(l.lot_items || []), action.item] } : l) }
    case 'UPDATE_LOT_ITEM':
      return { ...state, lots: state.lots.map((l, i) => i === action.lotIdx ? { ...l, lot_items: (l.lot_items || []).map(item => item.id === action.itemId ? { ...item, ...action.data } : item) } : l) }
    case 'DEL_LOT_ITEM':
      return { ...state, lots: state.lots.map((l, i) => i === action.lotIdx ? { ...l, lot_items: (l.lot_items || []).filter(item => item.id !== action.itemId) } : l) }
    case 'ADD_LOT_EXPENSE':
      return { ...state, lots: state.lots.map((l, i) => i === action.lotIdx ? { ...l, lot_expenses: [...(l.lot_expenses || []), action.expense] } : l) }
    case 'DEL_LOT_EXPENSE':
      return { ...state, lots: state.lots.map((l, i) => i === action.lotIdx ? { ...l, lot_expenses: (l.lot_expenses || []).filter(e => e.id !== action.expId) } : l) }
    case 'ADD_LOT_WORKER':
      return { ...state, lots: state.lots.map((l, i) => i === action.lotIdx ? { ...l, workers: [...(l.workers || []), action.worker] } : l) }
    case 'UPDATE_WORKER_ITEM':
      return {
        ...state, lots: state.lots.map((l, i) => i !== action.lotIdx ? l : {
          ...l, workers: (l.workers || []).map((w, wi) => wi !== action.workerIdx ? w : {
            ...w, worker_items: (() => {
              const items = w.worker_items || []
              const existing = items.find(x => x.lot_item_ref === action.ref)
              if (existing) return items.map(x => x.lot_item_ref === action.ref ? { ...x, value: action.val } : x)
              return [...items, { lot_item_ref: action.ref, value: action.val, id: `tmp-${Date.now()}` }]
            })(),
          }),
        }),
      }
    case 'SET_VPL': return { ...state, vplProjects: action.projects }
    case 'ADD_TOAST': return { ...state, toasts: [...state.toasts, action.toast] }
    case 'DEL_TOAST': return { ...state, toasts: state.toasts.filter(t => t.id !== action.id) }
    case 'SET_OFFLINE': return { ...state, offline: action.offline }
    default: return state
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random()
    dispatch({ type: 'ADD_TOAST', toast: { id, message, type } })
    setTimeout(() => dispatch({ type: 'DEL_TOAST', id }), 3500)
  }, [])

  const loadUserData = useCallback(async (userId) => {
    try {
      const [profileRes, txs, goals, lots, vpls] = await Promise.all([
        profileAPI.get(userId),
        txAPI.getAll(userId),
        goalsAPI.getAll(userId),
        lotsAPI.getAll(userId),
        vplAPI.getAll(userId),
      ])
      let profileData = profileRes.data
      if (!profileData) {
        await new Promise(r => setTimeout(r, 900))
        const retry = await profileAPI.get(userId)
        profileData = retry.data
      }
      if (profileData) dispatch({ type: 'SET_PROFILE', profile: profileData })
      dispatch({ type: 'SET_TXS', transactions: txs || [] })
      let finalGoals = goals || []
      if (finalGoals.length === 0) {
        const seeded = await Promise.all(
          SEED_GOALS_TEMPLATE.map(g => goalsAPI.upsert({ ...g, user_id: userId }))
        )
        finalGoals = seeded.filter(Boolean)
      }
      dispatch({ type: 'SET_GOALS', goals: finalGoals })
      dispatch({ type: 'SET_LOTS', lots: lots || [] })
      dispatch({ type: 'SET_VPL', projects: vpls || [] })
    } catch (err) {
      console.error('loadUserData error:', err)
    }
  }, [])

  useEffect(() => {
    const { data: { subscription } } = authAPI.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        dispatch({ type: 'AUTH_SUCCESS', user: session.user })
        await loadUserData(session.user.id)
      } else {
        dispatch({ type: 'AUTH_CLEAR' })
      }
    })
    return () => subscription.unsubscribe()
  }, [loadUserData])

  useEffect(() => {
    const goOnline = () => {
      dispatch({ type: 'SET_OFFLINE', offline: false })
      addToast('✓ Conexão restaurada', 'success')
    }
    const goOffline = () => dispatch({ type: 'SET_OFFLINE', offline: true })
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline) }
  }, [addToast])

  const login = async (email, password) => {
    const { error } = await authAPI.signIn(email, password)
    if (error) throw new Error(translateError(error))
  }

  const signup = async (email, password, name) => {
    const { error } = await authAPI.signUp(email, password, name)
    if (error) throw new Error(translateError(error))
  }

  const logout = async () => {
    await authAPI.signOut()
    dispatch({ type: 'AUTH_CLEAR' })
  }

  const resetPwd = async (email) => {
    const { error } = await authAPI.resetPassword(email)
    if (error) throw new Error(translateError(error))
  }

  const updatePwd = async (newPwd) => {
    const { error } = await authAPI.updatePassword(newPwd)
    if (error) throw new Error(translateError(error))
  }

  const addTx = async (tx) => {
    try {
      const newTx = { ...tx, user_id: state.user.id }
      const saved = await txAPI.add(newTx)
      dispatch({ type: 'ADD_TX', tx: saved })
      addToast('Transação salva!')
    } catch (err) { addToast(err.message, 'error') }
  }

  const updateTx = async (id, data) => {
    dispatch({ type: 'UPDATE_TX', id, data })
    try { await txAPI.update(id, data) }
    catch (err) { addToast('Erro ao atualizar', 'error') }
  }

  const deleteTx = async (id) => {
    dispatch({ type: 'DEL_TX', id })
    try { await txAPI.delete(id) }
    catch (err) { addToast('Erro ao excluir', 'error') }
  }

  const updateGoal = async (goal) => {
    try {
      const saved = await goalsAPI.upsert({ ...goal, user_id: state.user.id })
      if (goal.id) dispatch({ type: 'UPDATE_GOAL', goal: saved })
      else dispatch({ type: 'ADD_GOAL', goal: saved })
      addToast('Objetivo salvo!')
    } catch (err) { addToast(err.message, 'error') }
  }

  const deleteGoal = async (id) => {
    dispatch({ type: 'DEL_GOAL', id })
    try { await goalsAPI.delete(id) }
    catch (err) { addToast('Erro ao excluir', 'error') }
  }

  const addLot = async (name) => {
    try {
      const lot = await lotsAPI.create({ name, user_id: state.user.id, team_size: 5, hours_per_day: 8, work_days: 22 })
      dispatch({ type: 'ADD_LOT', lot: { ...lot, lot_items: [], lot_expenses: [], workers: [] } })
      dispatch({ type: 'SET_LOT_IDX', idx: state.lots.length })
      addToast('Lote criado!')
    } catch (err) { addToast(err.message, 'error') }
  }

  const updateLot = async (idx, data) => {
    const lot = state.lots[idx]
    dispatch({ type: 'UPDATE_LOT', idx, data })
    try { await lotsAPI.update(lot.id, data) }
    catch (err) { addToast('Erro ao salvar lote', 'error') }
  }

  const addLotItem = async (lotIdx) => {
    const lot = state.lots[lotIdx]
    const pos = (lot.lot_items || []).length
    try {
      const item = await lotsAPI.addItem({
        lot_id: lot.id, user_id: state.user.id,
        ref: `V${String(pos + 1).padStart(3, '0')}`, description: 'Nova peça',
        value: 0, time_per_piece: '01:00:00', quantity: 1, position: pos,
      })
      dispatch({ type: 'ADD_LOT_ITEM', lotIdx, item })
    } catch (err) { addToast(err.message, 'error') }
  }

  const updateLotItem = async (lotIdx, itemId, data) => {
    dispatch({ type: 'UPDATE_LOT_ITEM', lotIdx, itemId, data })
    try { await lotsAPI.updateItem(itemId, data) }
    catch (err) { addToast('Erro ao salvar peça', 'error') }
  }

  const deleteItem = async (lotIdx, itemId) => {
    dispatch({ type: 'DEL_LOT_ITEM', lotIdx, itemId })
    try { await lotsAPI.deleteItem(itemId) }
    catch (err) { addToast('Erro ao excluir peça', 'error') }
  }

  const addExpense = async (lotIdx) => {
    const lot = state.lots[lotIdx]
    try {
      const expense = await lotsAPI.addExpense({
        lot_id: lot.id, user_id: state.user.id,
        description: 'Novo gasto', value: 0, date: todayStr(),
      })
      dispatch({ type: 'ADD_LOT_EXPENSE', lotIdx, expense })
    } catch (err) { addToast(err.message, 'error') }
  }

  const deleteExpense = async (lotIdx, expId) => {
    dispatch({ type: 'DEL_LOT_EXPENSE', lotIdx, expId })
    try { await lotsAPI.deleteExpense(expId) }
    catch (err) { addToast('Erro ao excluir', 'error') }
  }

  const addWorker = async (lotIdx, name) => {
    const lot = state.lots[lotIdx]
    try {
      const worker = await lotsAPI.addWorker({ lot_id: lot.id, user_id: state.user.id, name })
      dispatch({ type: 'ADD_LOT_WORKER', lotIdx, worker: { ...worker, worker_items: [] } })
    } catch (err) { addToast(err.message, 'error') }
  }

  const updateWorkerItem = async (lotIdx, workerIdx, ref, val) => {
    dispatch({ type: 'UPDATE_WORKER_ITEM', lotIdx, workerIdx, ref, val })
    const worker = state.lots[lotIdx]?.workers?.[workerIdx]
    if (!worker) return
    const existing = (worker.worker_items || []).find(x => x.lot_item_ref === ref)
    try {
      await lotsAPI.upsertWorkerItem({
        ...(existing ? { id: existing.id } : {}),
        worker_id: worker.id, user_id: state.user.id,
        lot_item_ref: ref, value: val,
      })
    } catch (err) { addToast('Erro ao salvar', 'error') }
  }

  const upsertVPL = async (project) => {
    try {
      const saved = await vplAPI.upsert({ ...project, user_id: state.user.id })
      dispatch({ type: 'SET_VPL', projects: await vplAPI.getAll(state.user.id) })
      addToast('Projeto salvo!')
      return saved
    } catch (err) { addToast(err.message, 'error') }
  }

  const deleteVPL = async (id) => {
    try {
      await vplAPI.delete(id)
      dispatch({ type: 'SET_VPL', projects: await vplAPI.getAll(state.user.id) })
    } catch (err) { addToast(err.message, 'error') }
  }

  const updateIncome = async (val) => {
    const income = parseFloat(val) || 0
    dispatch({ type: 'SET_PROFILE', profile: { ...state.profile, income } })
    try { await profileAPI.update(state.user.id, { income }) }
    catch (err) { addToast('Erro ao salvar renda', 'error') }
  }

  const value = {
    state, dispatch, addToast,
    login, signup, logout, resetPwd, updatePwd,
    addTx, updateTx, deleteTx,
    updateGoal, deleteGoal,
    addLot, updateLot,
    addLotItem, updateLotItem, deleteItem,
    addExpense, deleteExpense,
    addWorker, updateWorkerItem,
    upsertVPL, deleteVPL,
    updateIncome,
    loadUserData,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be inside AppProvider')
  return ctx
}
