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

// ── Faixa de Saúde Financeira ──────────────────────────────
function HealthTicker({ transactions }) {
  const year = new Date().getFullYear()

  const items = useMemo(() => {
    const months = MONTHS.map((label, mi) => {
      const txs = transactions.filter(t => {
        const d = new Date(t.date + 'T12:00:00')
        return d.getMonth() === mi && d.getFullYear() === year
      })
      const inc = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.value, 0)
      const exp = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.value, 0)
      return { label, saldo: inc - exp, hasData: txs.length > 0 }
    })

    const anualInc = transactions.filter(t => t.type === 'income' && new Date(t.date + 'T12:00:00').getFullYear() === year).reduce((s, t) => s + t.value, 0)
    const anualExp = transactions.filter(t => t.type === 'expense' && new Date(t.date + 'T12:00:00').getFullYear() === year).reduce((s, t) => s + t.value, 0)

    const result = months.map(m => ({
      text: `${m.label}: ${m.saldo >= 0 ? '+' : ''}${R$(m.saldo)}`,
      color: m.saldo === 0 ? '#94a3b8' : m.saldo > 0 ? '#4ade80' : '#f87171',
      icon: m.saldo === 0 ? '⚪' : m.saldo > 0 ? '🟢' : '🔴',
    }))

    result.push({
      text: `${year} (anual): ${anualInc - anualExp >= 0 ? '+' : ''}${R$(anualInc - anualExp)}`,
      color: anualInc - anualExp >= 0 ? '#4ade80' : '#f87171',
      icon: anualInc - anualExp >= 0 ? '✅' : '⚠️',
    })

    return result
  }, [transactions, year])

  if (!items.length) return null

  const tickerText = items.map(i => `${i.icon} ${i.text}`).join('   •   ')
  const full = tickerText + '   •   ' + tickerText // duplicate for seamless loop

  return (
    <div style={{
      background: 'rgba(0,0,0,0.35)',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      overflow: 'hidden',
      padding: '6px 0',
      position: 'relative',
    }}>
      <style>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .health-ticker-inner {
          display: inline-block;
          white-space: nowrap;
          animation: ticker ${Math.max(18, items.length * 4)}s linear infinite;
        }
      `}</style>
      <div className="health-ticker-inner" style={{ fontSize: 12, color: '#cbd5e1', paddingLeft: 16 }}>
        {items.map((item, i) => (
          <span key={i}>
            <span style={{ color: item.color, fontWeight: 600 }}>{item.icon} {item.text}</span>
            {i < items.length - 1 && <span style={{ color: '#475569', margin: '0 12px' }}>•</span>}
          </span>
        ))}
        <span style={{ color: '#475569', margin: '0 12px' }}>•</span>
        {items.map((item, i) => (
          <span key={`dup-${i}`}>
            <span style={{ color: item.color, fontWeight: 600 }}>{item.icon} {item.text}</span>
            {i < items.length - 1 && <span style={{ color: '#475569', margin: '0 12px' }}>•</span>}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function DashboardScreen() {
  const { state, dispatch, updateTx } = useApp()
  const { transactions, selM, selY, goals, profile } = state
  const today = todayStr()

  const { budgets } = state

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
    const overdue = monthTxs.filter(t => t.type === 'expense' && !t.paid && t.date <= today)
    const dueToday = monthTxs.filter(t => t.type === 'expense' && !t.paid && t.date === today)
    return {
      monthTxs, totalIncome: inc, totalExpense: exp, balance: inc - exp,
      prevBalance: pInc - pExp,
      byCategory, overdue, dueToday,
      last8: [...monthTxs].sort((a,b) => b.date.localeCompare(a.date)).slice(0, 8),
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

  const budgetAlerts = useMemo(() => {
    return budgets.map(b => {
      const actual = byCategory[b.category] || 0
      const ratio = b.amount > 0 ? actual / b.amount : 0
      return { ...b, actual, ratio }
    }).filter(b => b.ratio >= 0.7).sort((a, b) => b.ratio - a.ratio)
  }, [budgets, byCategory])

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
      {/* Faixa de Saúde Financeira — acima do cabeçalho */}
      <HealthTicker transactions={transactions} />

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
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, marginBottom: 6 }}>
                <span>{t.description}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: '#dc2626', fontWeight: 600 }}>{R$(t.value)}</span>
                  <button onClick={() => updateTx(t.id, { paid: true })} style={{ background: '#dc2626', border: 'none', color: '#fff', borderRadius: 6, fontSize: 11, fontWeight: 700, padding: '3px 8px', cursor: 'pointer' }}>✓ Pagar</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {dueToday.length > 0 && (
          <div className="card" style={{ borderColor: '#f59e0b', borderWidth: 1 }}>
            <div className="card-title" style={{ color: '#b45309' }}>📅 Vence hoje ({dueToday.length})</div>
            {dueToday.map(t => (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, marginBottom: 6 }}>
                <span>{t.description}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: '#b45309', fontWeight: 600 }}>{R$(t.value)}</span>
                  <button onClick={() => updateTx(t.id, { paid: true })} style={{ background: '#b45309', border: 'none', color: '#fff', borderRadius: 6, fontSize: 11, fontWeight: 700, padding: '3px 8px', cursor: 'pointer' }}>✓ Pagar</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Alertas de Orçamento */}
        {budgetAlerts.length > 0 && (
          <div className="card" style={{ borderColor: budgetAlerts[0].ratio >= 1 ? '#ef4444' : '#f59e0b', borderWidth: 1 }}>
            <div className="card-title" style={{ color: budgetAlerts[0].ratio >= 1 ? '#dc2626' : '#b45309' }}>
              📋 Planejamento por categoria
            </div>
            {budgetAlerts.map(b => {
              const over = b.ratio >= 1
              const pctVal = Math.min(100, b.ratio * 100)
              const color = over ? '#ef4444' : '#f59e0b'
              return (
                <div key={b.id} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 3 }}>
                    <span>{over ? '🔴' : '⚠️'} {b.category}</span>
                    <span style={{ color, fontWeight: 600 }}>{R$(b.actual)} / {R$(b.amount)}</span>
                  </div>
                  <div className="prog">
                    <div className="prog-fill" style={{ width: `${pctVal}%`, background: color }} />
                  </div>
                </div>
              )
            })}
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
                  <div className="tx-sub">{t.category} · {fmtDate(t.date)}{t.person ? ` · 👤 ${t.person}` : ''}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className={`tx-value ${t.type === 'income' ? 'income' : 'expense'}`}>
                    {t.type === 'income' ? '+' : '-'}{R$(t.value)}
                  </div>
                  {t.type === 'expense' && !t.paid && (
                    <button onClick={() => updateTx(t.id, { paid: true })} style={{ background: 'rgba(245,158,11,0.2)', border: '1px solid #f59e0b', color: '#fbbf24', borderRadius: 6, fontSize: 11, fontWeight: 700, padding: '3px 8px', cursor: 'pointer', marginTop: 2 }}>
                      pendente · ✓ Pagar
                    </button>
                  )}
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
