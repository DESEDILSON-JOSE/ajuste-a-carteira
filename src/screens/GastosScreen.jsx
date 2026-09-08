import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { R$, todayStr, MONTHS } from '../utils/formatters'
import { txAPI } from '../utils/api'

const TABS = [
  {
    id: 'essencial',
    label: 'Essências',
    sub: 'Fixo',
    icon: '🏠',
    color: '#1d4ed8',
    bg: '#eff6ff',
    border: '#bfdbfe',
    desc: 'Aluguel, energia, água, internet, mensalidades fixas',
  },
  {
    id: 'necessario',
    label: 'Necessários',
    sub: 'Variável',
    icon: '🛒',
    color: '#15803d',
    bg: '#f0fdf4',
    border: '#bbf7d0',
    desc: 'Alimentação, saúde, transporte, higiene',
  },
  {
    id: 'util',
    label: 'Úteis',
    sub: 'Opcional',
    icon: '🔧',
    color: '#b45309',
    bg: '#fffbeb',
    border: '#fde68a',
    desc: 'Assinaturas, ferramentas, educação, lazer moderado',
  },
  {
    id: 'desnecessario',
    label: 'Desnecessários',
    sub: 'Evitar',
    icon: '⚠️',
    color: '#dc2626',
    bg: '#fef2f2',
    border: '#fecaca',
    desc: 'Impulso, gastos evitáveis, desperdício',
  },
]

const CATS = [
  'Alimentação', 'Transporte', 'Saúde', 'Educação', 'Lazer',
  'Moradia', 'Vestuário', 'Serviços', 'Assinatura', 'Outros',
]

export default function GastosScreen() {
  const { state, addTx, deleteTx, addToast } = useApp()
  const { txs } = state

  const now = new Date()
  const [month, setMonth] = useState(now.getMonth())
  const [year, setYear] = useState(now.getFullYear())
  const [activeTab, setActiveTab] = useState('essencial')
  const [form, setForm] = useState({ desc: '', value: '', category: 'Outros', date: todayStr() })
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)

  const tab = TABS.find(t => t.id === activeTab)

  // Filter txs for current month/year and expense type
  const monthTxs = useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`
    return (txs || []).filter(t => t.type === 'expense' && t.date?.startsWith(prefix))
  }, [txs, month, year])

  // Group by spending_type
  const byType = useMemo(() => {
    const map = {}
    TABS.forEach(t => { map[t.id] = [] })
    map['sem_tipo'] = []
    monthTxs.forEach(t => {
      const key = t.spending_type || 'sem_tipo'
      if (map[key]) map[key].push(t)
      else map['sem_tipo'].push(t)
    })
    return map
  }, [monthTxs])

  const tabTxs = byType[activeTab] || []
  const tabTotal = tabTxs.reduce((s, t) => s + (parseFloat(t.value) || 0), 0)
  const grandTotal = monthTxs.reduce((s, t) => s + (parseFloat(t.value) || 0), 0)

  const handleAdd = async () => {
    if (!form.desc.trim() || !form.value) return addToast('Preencha descrição e valor', 'error')
    setSaving(true)
    try {
      await addTx({
        type: 'expense',
        description: form.desc.trim(),
        value: parseFloat(form.value),
        category: form.category,
        date: form.date,
        account: 'Dinheiro',
        paid: true,
        spending_type: activeTab,
      })
      setForm({ desc: '', value: '', category: 'Outros', date: todayStr() })
      setAdding(false)
    } catch (_) {}
    setSaving(false)
  }

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  return (
    <div className="screen">
      {/* Header */}
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 4 }}>📊 Rastreio de Gastos</div>
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>Saiba para onde vai cada real</div>

        {/* Month nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <button onClick={prevMonth} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#475569' }}>‹</button>
          <span style={{ fontWeight: 700, fontSize: 15 }}>{MONTHS[month]} {year}</span>
          <button onClick={nextMonth} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#475569' }}>›</button>
        </div>

        {/* Summary strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 16 }}>
          {TABS.map(t => {
            const total = (byType[t.id] || []).reduce((s, tx) => s + (parseFloat(tx.value) || 0), 0)
            const pct = grandTotal > 0 ? (total / grandTotal) * 100 : 0
            return (
              <button key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{
                  background: activeTab === t.id ? t.bg : 'var(--card)',
                  border: `1.5px solid ${activeTab === t.id ? t.border : 'transparent'}`,
                  borderRadius: 10, padding: '8px 6px', cursor: 'pointer', textAlign: 'center',
                  boxShadow: activeTab === t.id ? `0 0 0 2px ${t.border}` : 'none',
                  transition: 'all 0.15s',
                }}>
                <div style={{ fontSize: 16 }}>{t.icon}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: activeTab === t.id ? t.color : '#374151', lineHeight: 1.2 }}>{t.label}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: activeTab === t.id ? t.color : '#6b7280', marginTop: 2 }}>{R$(total)}</div>
                {grandTotal > 0 && <div style={{ fontSize: 10, color: '#94a3b8' }}>{pct.toFixed(0)}%</div>}
              </button>
            )
          })}
        </div>

        {/* Total bar */}
        <div style={{ background: 'var(--card)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#64748b' }}>Total do mês</span>
          <span style={{ fontWeight: 800, fontSize: 16, color: '#dc2626' }}>{R$(grandTotal)}</span>
        </div>
      </div>

      {/* Tab content */}
      <div style={{ padding: '0 16px 120px' }}>
        <div style={{ background: tab.bg, border: `1px solid ${tab.border}`, borderRadius: 12, padding: '10px 14px', marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: tab.color }}>{tab.icon} {tab.label} <span style={{ fontWeight: 400, fontSize: 12, opacity: 0.8 }}>· {tab.sub}</span></div>
          <div style={{ fontSize: 12, color: tab.color, opacity: 0.75, marginTop: 2 }}>{tab.desc}</div>
          <div style={{ fontWeight: 800, fontSize: 18, color: tab.color, marginTop: 6 }}>{R$(tabTotal)}</div>
        </div>

        {/* List */}
        {tabTxs.length === 0 && !adding && (
          <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: '24px 0' }}>
            Nenhum gasto registrado nessa categoria
          </div>
        )}

        {tabTxs.map(tx => (
          <div key={tx.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--card)', borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.description}</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>{tx.category} · {tx.date}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: '#dc2626' }}>{R$(parseFloat(tx.value) || 0)}</span>
              <button onClick={() => deleteTx(tx.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 15 }}>🗑</button>
            </div>
          </div>
        ))}

        {/* Add form */}
        {adding ? (
          <div style={{ background: 'var(--card)', borderRadius: 12, padding: 14, marginTop: 8, border: `1.5px solid ${tab.border}` }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: tab.color, marginBottom: 10 }}>+ Novo gasto — {tab.label}</div>
            <input className="input" placeholder="Descrição" value={form.desc}
              onChange={e => setForm(f => ({ ...f, desc: e.target.value }))}
              style={{ marginBottom: 8 }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <input className="input" type="number" inputMode="decimal" placeholder="Valor R$"
                value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} />
              <input className="input" type="date" value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <select className="input" value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              style={{ marginBottom: 12 }}>
              {CATS.map(c => <option key={c}>{c}</option>)}
            </select>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-dark" style={{ flex: 1, background: tab.color }} onClick={handleAdd} disabled={saving}>
                {saving ? 'Salvando…' : '✓ Salvar'}
              </button>
              <button className="btn" style={{ flex: 1 }} onClick={() => setAdding(false)}>Cancelar</button>
            </div>
          </div>
        ) : (
          <button className="btn btn-dark btn-sm" style={{ width: '100%', marginTop: 8, background: tab.color }}
            onClick={() => setAdding(true)}>
            + Adicionar {tab.label.toLowerCase()}
          </button>
        )}
      </div>
    </div>
  )
}
