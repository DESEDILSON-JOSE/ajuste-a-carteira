import React from 'react'
import { useApp } from '../context/AppContext'

export default function CategorySelect({ type, value, onChange, baseList }) {
  const { state, addCustomCategory } = useApp()
  const [newCat, setNewCat] = React.useState('')
  const [adding, setAdding] = React.useState(false)
  const [saving, setSaving] = React.useState(false)

  const field = type === 'income' ? 'custom_income_cats' : 'custom_expense_cats'
  const customCats = state.profile?.[field] || []
  const allCats = [...baseList, ...customCats.filter(c => !baseList.includes(c))]

  const handleSave = async () => {
    if (!newCat.trim()) return
    setSaving(true)
    await addCustomCategory(type, newCat.trim())
    setSaving(false)
    onChange(newCat.trim())
    setNewCat('')
    setAdding(false)
  }

  return (
    <div>
      <select className="input" value={value} onChange={e => {
        if (e.target.value === '__nova__') { setAdding(true) }
        else { onChange(e.target.value) }
      }}>
        {allCats.map(c => <option key={c} value={c}>{c}</option>)}
        <option value="__nova__">➕ Nova categoria...</option>
      </select>
      {adding && (
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          <input
            className="input"
            placeholder="Nome da nova categoria"
            value={newCat}
            onChange={e => setNewCat(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            autoFocus
            style={{ flex: 1 }}
          />
          <button className="btn btn-dark" onClick={handleSave} disabled={saving}
            style={{ padding: '0 12px', fontSize: 12, minWidth: 60 }}>
            {saving ? '...' : 'Salvar'}
          </button>
          <button className="btn btn-ghost" onClick={() => { setAdding(false); setNewCat('') }}
            style={{ padding: '0 10px', fontSize: 14 }}>✕</button>
        </div>
      )}
    </div>
  )
}
