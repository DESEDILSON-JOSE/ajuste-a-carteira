import { useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { useApp } from '../context/AppContext'
import UserHeader from '../components/UserHeader'
import { R$, fmtDate, CAT_COLOR, CAT_ICON, MONTHS, todayStr } from '../utils/formatters'

const RADIAN = Math.PI / 180
const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null
  const radius = innerRadius + (outerRadius - innerRadius) * 0.6
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="600">{`${(percent * 100).toFixed(0)}%`}</text>
}

export default function DashboardScreen() {
  const { state, dispatch } = useApp()
  const { transactions, selM, selY, goals, profile } = state
  const today = todayStr()

  const { monthTxs, totalIncome, totalExpense, balance, prevBalance, byCategory, overdue, dueToday, last8 } = useMemo(() => {
    const monthTxs = transactions.filter(t => {
      const d = new Date(t.date + 'T12:00:00')
      return d.getMonth() + 1 === selM && d.getFullYear() === selY
    })
    const prevM = selM === 1 ? 12 : selM - 1
    const prevY = selM === 1 ? selY - 1 : selY
    const prevTxs = transactions.filter(t => {
      const d = new Date(t.date + 'T12:00:00')
      return d.getMonth() + 1 === prevM && d.getFullYear() === prevY
    })
    const sumTxs = (txs) => txs.reduce((s, t) =>
      t.type === 'income' ? { ...s, inc: s.inc + t.value } :
      t.type === 'expense' ? { ...s, exp: s.exp + t.value } : s,
      { inc: 0, exp: 0 })
    const { inc, exp } = sumTxs(monthTxs)
    const { inc: pInc, exp: pExp } = sumTxs(prevTxs)
    const byCategory = {}
    monthTxs.filter(t => t.type === 'expense').forEach(t => {
      byCategory[t.category] = (byCategory[t.category] || 0) + t.value
    })
    const overdue = transactions.filter(t => t.type === 'expense' && !t.paid && t.date < today)
    const dueToday = transactions.filter(t => t.type === 'expense' && !t.paid && t.date === today)
    return {
      monthTxs, totalIncome: inc, totalExpense: exp, balance: inc - exp,
      prevBalance: pInc - pExp,
      byCategory, overdue, dueToday,
      last8: transactions.slice(0, 8),
    }
  }, [transactions, selM, selY, today])

  const variation = balance - prevBalance
  const catData = Object.entries(byCategory).sort((a, b) => b[1] - a[1])
  const top5 = catData.slice(0, 5)
  const maxCat = top5[0]?.[1] || 1

  const changeMonth = (delta) => {
    let m = selM + delta, y = selY
    if (m > 12) { m = 1; y++ }
    if (m < 1) { m = 12; y-- }
    dispatch({ type: 'SET_PERIOD', m, y })
  }

  const income = profile?.income || 3000
  const savingRate = income > 0 ? ((totalIncome - totalExpense) / income * 100).toFixed(1) : 0

  const tips = []
  if (goals.length > 0) {
    const emerg = goals.find(g => g.position === 0)
    if (emerg && emerg.target > 0) {
      const pct = ((emerg.current_val / emerg.target) * 100).toFixed(0)
      tips.push(`🛡️ Reserva de emergência: ${pct}% da meta`)
    }
  }
  if (totalExpense > 0 && income > 0) {
    const rate = ((totalExpense / income) * 100).toFixed(0)
    if (rate > 80) tips.push(`⚠️ Você gastou ${rate}% da sua renda este mês`)
  }
  tips.push(`💰 Taxa de poupança: ${savingRate}%`)

  return (
    <div>
      {/* Header */}
      <div className="hdr hdr-dark">
        <UserHeader />
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div className="period-sel" style={{ justifyContent: 'center', marginBottom: 8 }}>
            <button onClick={() => changeMonth(-1)}>‹</button>
            <span>{MONTHS[selM - 1]} {selY}</span>
            <button onClick={() => changeMonth(1)}>›</button>
          </div>
          <div style={{ fontSize: 36, fontWeight: 700, color: balance >= 0 ? '#4ade80' : '#f87171' }}>{R$(balance)}</div>
          <div style={{ fontSize: 12, opacity: .6, marginBottom: 8 }}>Saldo do mês</div>
          <div className="g2" style={{ gap: 8 }}>
            <div style={{ background: 'rgba(255,255,255,.08)', borderRadius: 10, padding: '8px 12px' }}>
              <div style={{ fontSize: 11, color: '#4ade80', marginBottom: 2 }}>↑ Receitas</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{R$(totalIncome)}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,.08)', borderRadius: 10, padding: '8px 12px' }}>
              <div style={{ fontSize: 11, color: '#f87171', marginBottom: 2 }}>↓ Despesas</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{R$(totalExpense)}</div>
            </div>
          </div>
          {variation !== 0 && (
            <div style={{ fontSize: 12, marginTop: 8, color: variation > 0 ? '#4ade80' : '#f87171' }}>
              {variation > 0 ? '▲' : '▼'} {R$(Math.abs(variation))} vs mês anterior
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>
        {/* Alertas */}
        {overdue.length > 0 && (
          <div className="card" style={{ borderColor: '#ef4444', borderWidth: 1 }}>
            <div className="card-title" style={{ color: '#dc2626' }}>⚠️ Despesas atrasadas ({overdue.length})</div>
            {overdue.slice(0, 3).map(t => (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                <span>{t.description}</span>
                <span style={{ color: '#dc2626', fontWeight: 600 }}>{R$(t.value)}</span>
              </div>
            ))}
          </div>
        )}

        {dueToday.length > 0 && (
          <div className="card" style={{ borderColor: '#f59e0b', borderWidth: 1 }}>
            <div className="card-title" style={{ color: '#b45309' }}>📅 Vence hoje ({dueToday.length})</div>
            {dueToday.map(t => (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                <span>{t.description}</span>
                <span style={{ color: '#b45309', fontWeight: 600 }}>{R$(t.value)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Pie chart */}
        {catData.length > 0 && (
          <div className="card">
            <div className="card-title">Gastos por categoria</div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={catData.map(([name, value]) => ({ name, value }))}
                  cx="50%" cy="50%" outerRadius={75} dataKey="value"
                  labelLine={false} label={renderLabel}>
                  {catData.map(([name]) => (
                    <Cell key={name} fill={CAT_COLOR[name] || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip formatter={v => [R$(v), '']} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', marginTop: 8 }}>
              {catData.map(([name, value]) => (
                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: CAT_COLOR[name] || '#94a3b8' }} />
                  <span style={{ color: '#64748b' }}>{name}</span>
                  <span style={{ fontWeight: 600 }}>{R$(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top 5 categorias */}
        {top5.length > 0 && (
          <div className="card">
            <div className="card-title">Top categorias</div>
            {top5.map(([name, value]) => (
              <div key={name} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span>{CAT_ICON[name] || '📌'} {name}</span>
                  <span style={{ fontWeight: 600 }}>{R$(value)}</span>
                </div>
                <div className="prog">
                  <div className="prog-fill" style={{ width: `${(value / maxCat) * 100}%`, background: CAT_COLOR[name] || '#94a3b8' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Últimas transações */}
        {last8.length > 0 && (
          <div className="card">
            <div className="card-title">Últimas transações</div>
            {last8.map(t => (
              <div key={t.id} className="tx-item">
                <div style={{ fontSize: 22 }}>{CAT_ICON[t.category] || '📌'}</div>
                <div className="tx-info">
                  <div className="tx-desc">{t.description}</div>
                  <div className="tx-sub">{t.category} · {fmtDate(t.date)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className={`tx-value ${t.type === 'income' ? 'income' : 'expense'}`}>
                    {t.type === 'income' ? '+' : '-'}{R$(t.value)}
                  </div>
                  {t.type === 'expense' && !t.paid && <span className="badge badge-orange">pendente</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Dicas inteligentes */}
        <div className="card" >
          <div className="card-title">💡 Dicas</div>
          {tips.map((tip, i) => (
            <div key={i} style={{ fontSize: 13, color: '#334155', marginBottom: 6, lineHeight: 1.4 }}>{tip}</div>
          ))}
        </div>

        {/* Atalhos */}
        <div className="g2" style={{ marginBottom: 16 }}>
          <button className="btn btn-green btn-full" onClick={() => { dispatch({ type: 'SET_MODAL', modal: 'add-tx' }); dispatch({ type: 'SET_MODAL_TYPE', modalType: 'income' }) }}>
            ↑ Receita
          </button>
          <button className="btn btn-red btn-full" onClick={() => { dispatch({ type: 'SET_MODAL', modal: 'add-tx' }); dispatch({ type: 'SET_MODAL_TYPE', modalType: 'expense' }) }}>
            ↓ Despesa
          </button>
        </div>
      </div>
    </div>
  )
}
