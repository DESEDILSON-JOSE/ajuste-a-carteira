import { useState } from 'react'
import { useApp } from '../../context/AppContext'

export default function EditGoalModal() {
  const { state, dispatch, updateGoal } = useApp()
  const goal = state.editingGoal

  const [form, setForm] = useState({
    name: goal?.name || '',
    icon: goal?.icon || '🎯',
    color: goal?.color || '#22c55e',
    target: goal?.target || '',
    current_val: goal?.current_val || '',
    monthly: goal?.monthly || '',
    rate: goal?.rate || '',
    invest: goal?.invest || '',
    description: goal?.description || '',
    monthly_desired: goal?.monthly_desired || '',
  })
  const [loading, setLoading] = useState(false)

  const close = () => dispatch({ type: 'SET_MODAL', modal: null })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setLoading(true)
    await updateGoal({
      ...goal,
      name: form.name,
      icon: form.icon,
      color: form.color,
      target: parseFloat(form.target) || 0,
      current_val: parseFloat(form.current_val) || 0,
      monthly: parseFloat(form.monthly) || 0,
      rate: parseFloat(form.rate) || 0,
      invest: form.invest,
      description: form.description,
      monthly_desired: parseFloat(form.monthly_desired) || 0,
    })
    setLoading(false)
    close()
  }

  if (!goal) return null

  const ICONS = ['🎯', '🛡️', '✈️', '🔨', '🔑', '💎', '🏠', '🚗', '📚', '💼', '❤️', '⚡']
  const COLORS = ['#22c55e', '#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#1d4ed8', '#15803d', '#c2410c', '#7c3aed', '#b45309', '#06b6d4']

  return (
    <div className="overlay" onClick={close}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Editar Objetivo</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Ícone */}
          <div>
            <label className="label">Ícone</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {ICONS.map(ic => (
                <button key={ic} onClick={() => set('icon', ic)}
                  style={{ fontSize: 22, background: form.icon === ic ? '#e2e8f0' : 'transparent', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer' }}>
                  {ic}
                </button>
              ))}
            </div>
          </div>

          {/* Cor */}
          <div>
            <label className="label">Cor</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {COLORS.map(c => (
                <button key={c} onClick={() => set('color', c)}
                  style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: form.color === c ? '3px solid #0f172a' : '2px solid transparent', cursor: 'pointer' }} />
              ))}
            </div>
          </div>

          <div>
            <label className="label">Nome</label>
            <input className="input" value={form.name} onChange={e => set('name', e.target.value)} />
          </div>

          <div>
            <label className="label">Descrição / Prazo</label>
            <input className="input" value={form.description} onChange={e => set('description', e.target.value)} />
          </div>

          <div className="g2">
            <div>
              <label className="label">Meta (R$)</label>
              <input className="input" type="number" inputMode="decimal" value={form.target} onChange={e => set('target', e.target.value)} />
            </div>
            <div>
              <label className="label">Atual (R$)</label>
              <input className="input" type="number" inputMode="decimal" value={form.current_val} onChange={e => set('current_val', e.target.value)} />
            </div>
          </div>

          <div className="g2">
            <div>
              <label className="label">Aporte/mês (R$)</label>
              <input className="input" type="number" inputMode="decimal" value={form.monthly} onChange={e => set('monthly', e.target.value)} />
            </div>
            <div>
              <label className="label">Taxa mensal (%)</label>
              <input className="input" type="number" inputMode="decimal" step="0.1" value={form.rate} onChange={e => set('rate', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="label">Onde investe</label>
            <input className="input" placeholder="Ex: Tesouro Selic" value={form.invest} onChange={e => set('invest', e.target.value)} />
          </div>

          {goal.position === 4 && (
            <div>
              <label className="label">Renda desejada no FIRE (R$/mês)</label>
              <input className="input" type="number" inputMode="decimal" value={form.monthly_desired} onChange={e => set('monthly_desired', e.target.value)} />
            </div>
          )}

          <div className="g2" style={{ marginTop: 4 }}>
            <button className="btn btn-ghost btn-full" onClick={close}>Cancelar</button>
            <button className="btn btn-dark btn-full" onClick={handleSave} disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
