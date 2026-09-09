import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { R$, fmtDateFull, CAT_ICON } from '../utils/formatters'

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function currentYearMonth() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
}

export default function TransacoesScreen() {
  const { state, updateTx, deleteTx } = useApp()
  const { transactions } = state
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [monthFilter, setMonthFilter] = useState(currentYearMonth())

  const years = useMemo(() => {
    const ys = new Set(transactions.map(t => t.date?.slice(0, 4)).filter(Boolean))
    return Array.from(ys).sort().reverse()
  }, [transactions])

  const [selectedYear, setSelectedYear] = useState(() => String(new Date().getFullYear()))

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      const matchMonth = !monthFilter || t.date?.startsWith(monthFilter)
      const matchType = filter === 'all' || t.type === filter
      const matchSearch = !search || t.description?.toLowerCase().includes(search.toLowerCase()) || t.category?.toLowerCase().includes(search.toLowerCase())
      return matchMonth && matchType && matchSearch
    })
  }, [transactions, filter, search, monthFilter])

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
    if (window.confirm('Excluir "' + t.description + '"?')) deleteTx(t.id)
  }

  const curYM = currentYearMonth()

  return (
    <div>
      {/* Header */}
      <div className="hdr hdr-dark">
        <h1 style={{ marginBottom: 12 }}>Transações</h1>
        <input className="input" placeholder="🔍 Buscar..." value={search} onChange={e => setSearch(e.target.value)} style={{ background: 'rgba(255,255,255,.12)', color: '#fff', border: '0.5px solid rgba(255,255,255,.2)' }} />
      </div>

      <div style={{ padding: '0 16px' }}>
        {/* Seletor de ano */}
        {years.length > 1 && (
          <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
            {years.map(y => (
              <button key={y}
                onClick={() => { setSelectedYear(y); setMonthFilter(y + '-' + String(new Date().getMonth()+1).padStart(2,'0')) }}
                style={{
                  background: selectedYear === y ? 'rgba(96,165,250,0.2)' : 'rgba(255,255,255,0.06)',
                  border: '1.5px solid ' + (selectedYear === y ? '#60a5fa' : 'rgba(255,255,255,0.1)'),
                  borderRadius: 20, padding: '4px 14px', cursor: 'pointer',
                  fontSize: 12, fontWeight: selectedYear === y ? 700 : 400,
                  color: selectedYear === y ? '#60a5fa' : '#94a3b8',
                }}>
                {y}
              </button>
            ))}
          </div>
        )}

        {/* Seletor de mês — scroll horizontal */}
        <div style={{ overflowX: 'auto', marginTop: 10, paddingBottom: 4 }}>
          <div style={{ display: 'flex', gap: 6, minWidth: 'max-content' }}>
            {MONTHS.map((m, i) => {
              const ym = selectedYear + '-' + String(i + 1).padStart(2, '0')
              const isActive = monthFilter === ym
              const isCurrent = ym === curYM
              return (
                <button key={ym}
                  onClick={() => setMonthFilter(ym)}
                  style={{
                    background: isActive ? 'rgba(96,165,250,0.2)' : isCurrent ? 'rgba(74,222,128,0.08)' : 'rgba(255,255,255,0.04)',
                    border: '1.5px solid ' + (isActive ? '#60a5fa' : isCurrent ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.08)'),
                    borderRadius: 20, padding: '5px 14px', cursor: 'pointer',
                    fontSize: 12, fontWeight: isActive ? 700 : 400,
                    color: isActive ? '#60a5fa' : isCurrent ? '#4ade80' : '#94a3b8',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s',
                  }}>
                  {m.slice(0, 3)}{isCurrent && !isActive ? ' ●' : ''}
                </button>
              )
            })}
          </div>
        </div>

        {/* Filtros tipo */}
        <div className="tabs" style={{ marginTop: 10 }}>
          {[['all', 'Todas'], ['income', 'Receitas'], ['expense', 'Despesas']].map(([id, label]) => (
            <button key={id} className={'tab' + (filter === id ? ' active' : '')} onClick={() => setFilter(id)}>{label}</button>
          ))}
        </div>

        {/* Subtotais */}
        <div className="g3" style={{ marginBottom: 12 }}>
          <div className="stat">
            <div className="stat-label">Receitas</div>
            <div className="stat-value" style={{ fontSize: 14, color: '#4ade80' }}>{R$(totals.inc)}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Despesas</div>
            <div className="stat-value" style={{ fontSize: 14, color: '#f87171' }}>{R$(totals.exp)}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Saldo</div>
            <div className="stat-value" style={{ fontSize: 14, color: totals.bal >= 0 ? '#4ade80' : '#f87171' }}>{R$(totals.bal)}</div>
          </div>
        </div>

        {/* Aviso mês atual */}
        {monthFilter === curYM && (
          <div style={{ fontSize: 11, color: '#4ade80', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 8, padding: '6px 10px', marginBottom: 10 }}>
            ✅ Você está no mês atual — {MONTHS[parseInt(curYM.split('-')[1]) - 1]} de {curYM.split('-')[0]}
          </div>
        )}
        {monthFilter !== curYM && (
          <div style={{ fontSize: 11, color: '#fbbf24', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 8, padding: '6px 10px', marginBottom: 10 }}>
            ⚠️ Visualizando {MONTHS[parseInt(monthFilter.split('-')[1]) - 1]} de {monthFilter.split('-')[0]} — não é o mês atual
          </div>
        )}

        {/* Lista agrupada */}
        {grouped.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📭</div>
            <div>Nenhuma transação em {MONTHS[parseInt(monthFilter.split('-')[1]) - 1]}</div>
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
                  <div className={'tx-value ' + (t.type === 'income' ? 'income' : 'expense')}>
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
