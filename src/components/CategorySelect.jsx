import React from 'react'
import { useApp } from '../context/AppContext'

export default function CategorySelect({ type, value, onChange, baseList }) {
  const { state, addCustomCategory, removeCustomCategory } = useApp()
  const [newCat, setNewCat] = React.useState('')
  const [adding, setAdding] = React.useState(false)
  const [saving, setSaving] = React.useState(false)

  const field = type === 'income' ? 'custom_income_cats' : 'custom_expense_cats'
  const customCats = state.profile?.[field] || []
  const allCats = [...baseList, ...customCats.filter(c => !baseList.includes(c))]

  const handleSave = async () => {
    const name = newCat.trim()
    if (!name) return
    setSaving(true)
    await addCustomCategory(type, name)
    setSaving(false)
    onChange(name)
    setNewCat('')
    setAdding(false)
  }

  const handleDelete = async (cat) => {
    await removeCustomCategory(type, cat)
    if (value === cat) onChange(baseList[0])
  }

  return (
    <div>
      <select className="input" value={value} onChange={e => {
        if (e.target.value === '__nova__') { setAdding(true) }
        else { onChange(e.target.value) }
      }}>
        {allCats.map(c => <option key={c} value={c}>{c}{customCats.includes(c) ? ' ⭐' : ''}</option>)}
        <option value="__nova__">➕ Nova categoria...</option>
      </select>

      {adding && (
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          <input
            className="input"
            placeholder="Nome da nova categoria"
            value={newCat}
            onChange={e => setNewCat(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setAdding(false); setNewCat('') } }}
            autoFocus
            style={{ flex: 1 }}
          />
          <button className="btn btn-dark" onClick={handleSave} disabled={saving}
            style={{ padding: '0 14px', fontSize: 12, minWidth: 60 }}>
            {saving ? '...' : 'Salvar'}
          </button>
          <button className="btn btn-ghost" onClick={() => { setAdding(false); setNewCat('') }}
            style={{ padding: '0 10px', fontSize: 14 }}>✕</button>
        </div>
      )}

      {customCats.length > 0 && !adding && (
        <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {customCats.map(c => (
            <span key={c} style={{ fontSize: 10, background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 20, padding: '2px 8px', color: '#c4b5fd', display: 'flex', alignItems: 'center', gap: 4 }}>
              {c}
              <button onClick={() => handleDelete(c)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 10, padding: 0, lineHeight: 1 }}>✕</button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
