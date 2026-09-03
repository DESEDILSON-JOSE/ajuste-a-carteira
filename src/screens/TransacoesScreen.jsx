import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { R$, fmtDateFull, CAT_ICON } from '../utils/formatters'

export default function TransacoesScreen() {
  const { state, updateTx, deleteTx } = useApp()
  const { transactions } = state
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      const matchType = filter === 'all' || t.type === filter
      const matchSearch = !search || t.description.toLowerCase().includes(search.toLowerCase()) || t.category.toLowerCase().includes(search.toLowerCase())
      return matchType && matchSearch
    })
  }, [transactions, filter, search])

  const grouped = useMemo(() => {
    const groups = {}
    filtered.forEach(t => {
      if (!groups[t.date]) groups[t.date] = []
      groups[t.date].push(t)
    })
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
  }, [filtered])

  const totals = useMemo(() => {
    const inc = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.value, 0)
    const exp = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.value, 0)
    return { inc, exp, bal: inc - exp }
  }, [filtered])

  const handleDelete = (t) => {
    if (window.confirm(`Excluir "${t.description}"?`)) deleteTx(t.id)
  }

  return (
    <div>
      {/* Header */}
      <div className="hdr hdr-dark">
        <h1 style={{ marginBottom: 12 }}>Transações</h1>
        <input className="input" placeholder="🔍 Buscar..." value={search} onChange={e => setSearch(e.target.value)} style={{ background: 'rgba(255,255,255,.12)', color: '#fff', border: '0.5px solid rgba(255,255,255,.2)' }} />
      </div>

      <div style={{ padding: '0 16px' }}>
        {/* Filtros */}
        <div className="tabs" style={{ marginTop: 12 }}>
          {[['all', 'Todas'], ['income', 'Receitas'], ['expense', 'Despesas']].map(([id, label]) => (
            <button key={id} className={`tab${filter === id ? ' active' : ''}`} onClick={() => setFilter(id)}>{label}</button>
          ))}
        </div>

        {/* Subtotais */}
        <div className="g3" style={{ marginBottom: 12 }}>
          <div className="stat">
            <div className="stat-label">Receitas</div>
            <div className="stat-value" style={{ fontSize: 14, color: '#15803d' }}>{R$(totals.inc)}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Despesas</div>
            <div className="stat-value" style={{ fontSize: 14, color: '#dc2626' }}>{R$(totals.exp)}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Saldo</div>
            <div className="stat-value" style={{ fontSize: 14, color: totals.bal >= 0 ? '#15803d' : '#dc2626' }}>{R$(totals.bal)}</div>
          </div>
        </div>

        {/* Lista agrupada */}
        {grouped.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📭</div>
            <div>Nenhuma transação encontrada</div>
          </div>
        ) : grouped.map(([date, txs]) => (
          <div key={date}>
            <div className="date-group-label">{fmtDateFull(date)}</div>
            {txs.map(t => (
              <div key={t.id} className="tx-item">
                <button className="tx-avatar" title="Alternar pago" onClick={() => updateTx(t.id, { paid: !t.paid })}>
                  {CAT_ICON[t.category] || '📌'}
                </button>
                <div className="tx-info">
                  <div className="tx-desc" style={{ opacity: t.type === 'expense' && !t.paid ? .6 : 1 }}>{t.description}</div>
                  <div className="tx-sub">
                    {t.category} · {t.account}
                    {t.type === 'expense' && !t.paid && <span className="badge badge-orange" style={{ marginLeft: 4 }}>pendente</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className={`tx-value ${t.type === 'income' ? 'income' : 'expense'}`}>
                    {t.type === 'income' ? '+' : '-'}{R$(t.value)}
                  </div>
                  <button onClick={() => handleDelete(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#94a3b8', padding: 4 }}>🗑</button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
