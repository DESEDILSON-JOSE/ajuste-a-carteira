import React, { useState, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { useApp } from '../context/AppContext'
import { R$, pct, CAT_COLOR, CAT_ICON, MONTHS, fmtDate } from '../utils/formatters'
import { profileAPI } from '../utils/api'

// ─── 7 DIAS ────────────────────────────────────────────────
function SevenDaysTab({ transactions }) {
  const data = useMemo(() => {
    const now = new Date()
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now)
      d.setDate(d.getDate() - (6 - i))
      const dateStr = d.toISOString().split('T')[0]
      const dayTxs = transactions.filter(t => t.date === dateStr)
      const inc = dayTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.value, 0)
      const exp = dayTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.value, 0)
      return { dia: d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' }), receita: inc, despesa: exp, saldo: inc - exp }
    })
  }, [transactions])

  const top3 = useMemo(() => {
    const now = new Date()
    const cutoff = new Date(now); cutoff.setDate(cutoff.getDate() - 6)
    return transactions
      .filter(t => t.type === 'expense' && new Date(t.date + 'T12:00:00') >= cutoff)
      .sort((a, b) => b.value - a.value)
      .slice(0, 3)
  }, [transactions])

  return (
    <div>
      <div className="card">
        <div className="card-title">Últimos 7 dias</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data}>
            <XAxis dataKey="dia" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={v => [R$(v), '']} />
            <Bar dataKey="receita" fill="#22c55e" name="Receita" />
            <Bar dataKey="despesa" fill="#ef4444" name="Despesa" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <div className="card-title">Tabela diária</div>
        <div className="scroll-x">
          <table className="tbl">
            <thead><tr><th>Dia</th><th>Receita</th><th>Despesa</th><th>Saldo</th></tr></thead>
            <tbody>
              {data.map((d, i) => {
                let acc = 0
                for (let j = 0; j <= i; j++) acc += data[j].saldo
                return (
                  <tr key={i}>
                    <td>{d.dia}</td>
                    <td style={{ color: '#15803d' }}>{R$(d.receita)}</td>
                    <td style={{ color: '#dc2626' }}>{R$(d.despesa)}</td>
                    <td style={{ fontWeight: 600, color: d.saldo >= 0 ? '#15803d' : '#dc2626' }}>{R$(d.saldo)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {top3.length > 0 && (
        <div className="card">
          <div className="card-title">🔥 Top 3 maiores gastos</div>
          {top3.map(t => (
            <div key={t.id} className="tx-item" style={{ paddingBottom: 8 }}>
              <span style={{ fontSize: 20 }}>{CAT_ICON[t.category] || '📌'}</span>
              <div className="tx-info"><div className="tx-desc">{t.description}</div><div className="tx-sub">{t.category} · {fmtDate(t.date)}</div></div>
              <span style={{ fontWeight: 700, color: '#dc2626' }}>{R$(t.value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── MENSAL ────────────────────────────────────────────────
function MensalTab({ transactions }) {
  const now = new Date()
  const [selM, setSelM] = useState(now.getMonth() + 1)
  const [selY, setSelY] = useState(now.getFullYear())

  const changeMonth = (delta) => {
    let m = selM + delta, y = selY
    if (m > 12) { m = 1; y++ }
    if (m < 1) { m = 12; y-- }
    setSelM(m); setSelY(y)
  }

  const { monthTxs, prevTxs, inc, exp, byCategory } = useMemo(() => {
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
    const inc = monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.value, 0)
    const exp = monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.value, 0)
    const byCategory = {}
    monthTxs.filter(t => t.type === 'expense').forEach(t => {
      byCategory[t.category] = (byCategory[t.category] || 0) + t.value
    })
    return { monthTxs, prevTxs, inc, exp, byCategory }
  }, [transactions, selM, selY])

  const prevExp = prevTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.value, 0)
  const savingRate = inc > 0 ? ((inc - exp) / inc * 100) : 0
  const catData = Object.entries(byCategory).sort((a, b) => b[1] - a[1])

  return (
    <div>
      <div className="period-sel" style={{ justifyContent: 'center', marginBottom: 16 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => changeMonth(-1)}>‹</button>
        <span style={{ fontSize: 16, fontWeight: 700 }}>{MONTHS[selM - 1]} {selY}</span>
        <button className="btn btn-ghost btn-sm" onClick={() => changeMonth(1)}>›</button>
      </div>

      <div className="g2" style={{ marginBottom: 12 }}>
        <div className="stat"><div className="stat-label">Receitas</div><div className="stat-value" style={{ fontSize: 16, color: '#15803d' }}>{R$(inc)}</div></div>
        <div className="stat"><div className="stat-label">Despesas</div><div className="stat-value" style={{ fontSize: 16, color: '#dc2626' }}>{R$(exp)}</div></div>
        <div className="stat"><div className="stat-label">Saldo</div><div className="stat-value" style={{ fontSize: 16, color: inc - exp >= 0 ? '#15803d' : '#dc2626' }}>{R$(inc - exp)}</div></div>
        <div className="stat"><div className="stat-label">Poupança</div><div className="stat-value" style={{ fontSize: 16 }}>{pct(savingRate)}</div></div>
      </div>

      {catData.length > 0 && (
        <div className="card">
          <div className="card-title">Por Categoria</div>
          <div className="scroll-x">
            <table className="tbl">
              <thead><tr><th>Categoria</th><th>Valor</th><th>%</th><th>vs Ant.</th></tr></thead>
              <tbody>
                {catData.map(([cat, val]) => {
                  const prevCat = prevTxs.filter(t => t.type === 'expense' && t.category === cat).reduce((s, t) => s + t.value, 0)
                  const delta = prevCat > 0 ? ((val - prevCat) / prevCat) * 100 : null
                  return (
                    <tr key={cat}>
                      <td>{CAT_ICON[cat]} {cat}</td>
                      <td style={{ fontWeight: 600 }}>{R$(val)}</td>
                      <td>{exp > 0 ? pct((val / exp) * 100) : '0%'}</td>
                      <td style={{ color: delta === null ? '#64748b' : delta > 0 ? '#dc2626' : '#15803d', fontWeight: 600 }}>
                        {delta === null ? '–' : `${delta > 0 ? '▲' : '▼'} ${Math.abs(delta).toFixed(0)}%`}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <button className="btn btn-ghost btn-full" onClick={() => window.print()}>🖨️ Imprimir</button>
    </div>
  )
}

// ─── ANUAL ────────────────────────────────────────────────
function AnualTab({ transactions }) {
  const [selY, setSelY] = useState(new Date().getFullYear())

  const { monthlyData, totals } = useMemo(() => {
    const monthlyData = MONTHS.map((m, mi) => {
      const txs = transactions.filter(t => {
        const d = new Date(t.date + 'T12:00:00')
        return d.getMonth() === mi && d.getFullYear() === selY
      })
      const inc = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.value, 0)
      const exp = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.value, 0)
      return { mes: m, receita: inc, despesa: exp, saldo: inc - exp }
    })
    const activeMonths = monthlyData.filter(m => m.receita > 0 || m.despesa > 0)
    const totals = {
      inc: monthlyData.reduce((s, m) => s + m.receita, 0),
      exp: monthlyData.reduce((s, m) => s + m.despesa, 0),
      avgInc: activeMonths.length > 0 ? monthlyData.reduce((s, m) => s + m.receita, 0) / Math.max(activeMonths.length, 1) : 0,
      avgExp: activeMonths.length > 0 ? monthlyData.reduce((s, m) => s + m.despesa, 0) / Math.max(activeMonths.length, 1) : 0,
    }
    return { monthlyData, totals }
  }, [transactions, selY])

  const bestMonth = monthlyData.reduce((best, m) => m.saldo > (best?.saldo || -Infinity) ? m : best, null)
  const worstMonth = monthlyData.reduce((worst, m) => m.saldo < (worst?.saldo || Infinity) ? m : worst, null)

  const top10 = useMemo(() => {
    return transactions
      .filter(t => t.type === 'expense' && new Date(t.date + 'T12:00:00').getFullYear() === selY)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [transactions, selY])

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => setSelY(y => y - 1)}>‹</button>
        <span style={{ fontSize: 18, fontWeight: 700 }}>{selY}</span>
        <button className="btn btn-ghost btn-sm" onClick={() => setSelY(y => y + 1)}>›</button>
      </div>

      <div className="g2" style={{ marginBottom: 12 }}>
        <div className="stat"><div className="stat-label">Receitas</div><div className="stat-value" style={{ fontSize: 14, color: '#15803d' }}>{R$(totals.inc)}</div></div>
        <div className="stat"><div className="stat-label">Despesas</div><div className="stat-value" style={{ fontSize: 14, color: '#dc2626' }}>{R$(totals.exp)}</div></div>
        <div className="stat"><div className="stat-label">Média Rec.</div><div className="stat-value" style={{ fontSize: 14 }}>{R$(totals.avgInc)}</div></div>
        <div className="stat"><div className="stat-label">Média Desp.</div><div className="stat-value" style={{ fontSize: 14 }}>{R$(totals.avgExp)}</div></div>
      </div>

      {bestMonth && (
        <div className="g2" style={{ marginBottom: 12 }}>
          <div className="stat" style={{ background: '#dcfce7' }}><div className="stat-label">Melhor mês</div><div style={{ fontWeight: 700, color: '#15803d' }}>{bestMonth.mes} • {R$(bestMonth.saldo)}</div></div>
          <div className="stat" style={{ background: '#fef2f2' }}><div className="stat-label">Pior mês</div><div style={{ fontWeight: 700, color: '#dc2626' }}>{worstMonth?.mes} • {R$(worstMonth?.saldo || 0)}</div></div>
        </div>
      )}

      <div className="card">
        <div className="card-title">12 Meses</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={monthlyData}>
            <XAxis dataKey="mes" tick={{ fontSize: 9 }} />
            <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={v => [R$(v), '']} />
            <Bar dataKey="receita" fill="#22c55e" name="Receita" />
            <Bar dataKey="despesa" fill="#ef4444" name="Despesa" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <div className="card-title">Tabela Mensal</div>
        <div className="scroll-x">
          <table className="tbl">
            <thead><tr><th>Mês</th><th>Receita</th><th>Despesa</th><th>Saldo</th></tr></thead>
            <tbody>
              {monthlyData.map(m => (
                <tr key={m.mes}>
                  <td>{m.mes}</td>
                  <td style={{ color: '#15803d' }}>{R$(m.receita)}</td>
                  <td style={{ color: '#dc2626' }}>{R$(m.despesa)}</td>
                  <td style={{ fontWeight: 600, color: m.saldo >= 0 ? '#15803d' : '#dc2626' }}>{R$(m.saldo)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr>
              <td style={{ fontWeight: 700 }}>Total</td>
              <td style={{ color: '#15803d', fontWeight: 700 }}>{R$(totals.inc)}</td>
              <td style={{ color: '#dc2626', fontWeight: 700 }}>{R$(totals.exp)}</td>
              <td style={{ fontWeight: 700, color: totals.inc - totals.exp >= 0 ? '#15803d' : '#dc2626' }}>{R$(totals.inc - totals.exp)}</td>
            </tr></tfoot>
          </table>
        </div>
      </div>

      {top10.length > 0 && (
        <div className="card">
          <div className="card-title">Top 10 maiores despesas</div>
          {top10.map((t, i) => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '0.5px solid #e2e8f0', fontSize: 13 }}>
              <span style={{ fontWeight: 700, color: '#64748b', width: 20 }}>#{i + 1}</span>
              <span style={{ flex: 1 }}>{t.description}</span>
              <span style={{ color: '#64748b', fontSize: 11 }}>{fmtDate(t.date)}</span>
              <span style={{ fontWeight: 700, color: '#dc2626' }}>{R$(t.value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


// ─── GASTOS FIXOS ────────────────────────────────────────────
const FIXOS_CATS = ['Habitação','Utilities','Saúde','Transporte','Educação','Lazer','Seguros','Outros']
const FIXOS_ICONS = {'Habitação':'🏠','Utilities':'💡','Saúde':'💊','Transporte':'🚗','Educação':'📚','Lazer':'🎬','Seguros':'🛡️','Outros':'📌'}

function loadFixos() {
  try { return JSON.parse(localStorage.getItem('gastosFixos') || '[]') } catch { return [] }
}
function saveFixos(items) { localStorage.setItem('gastosFixos', JSON.stringify(items)) }

function GastosFixosTab() {
  const [fixos, setFixos] = React.useState(loadFixos)
  const [form, setForm] = React.useState({ description: '', value: '', category: 'Habitação', dueDay: 5, active: true })
  const [editId, setEditId] = React.useState(null)
  const [showForm, setShowForm] = React.useState(false)

  const persist = (items) => { setFixos(items); saveFixos(items) }

  const handleSave = () => {
    if (!form.description || !form.value) return
    const item = { ...form, value: parseFloat(form.value), id: editId || Date.now() }
    persist(editId ? fixos.map(f => f.id === editId ? item : f) : [...fixos, item])
    setForm({ description: '', value: '', category: 'Habitação', dueDay: 5, active: true })
    setEditId(null); setShowForm(false)
  }

  const startEdit = (f) => { setForm({ ...f, value: String(f.value) }); setEditId(f.id); setShowForm(true) }
  const remove = (id) => { if (window.confirm('Excluir este gasto fixo?')) persist(fixos.filter(f => f.id !== id)) }
  const toggle = (id) => persist(fixos.map(f => f.id === id ? { ...f, active: !f.active } : f))

  const ativos = fixos.filter(f => f.active)
  const total = ativos.reduce((s, f) => s + f.value, 0)
  const totalAnual = total * 12

  return (
    <div>
      {/* Resumo */}
      <div className="g2" style={{ marginBottom: 12 }}>
        <div className="stat">
          <div className="stat-label">Total Mensal</div>
          <div className="stat-value" style={{ fontSize: 16, color: '#ef4444' }}>{R$(total)}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Total Anual</div>
          <div className="stat-value" style={{ fontSize: 16, color: '#ef4444' }}>{R$(totalAnual)}</div>
        </div>
      </div>

      {/* Lista */}
      {fixos.length > 0 && (
        <div className="card">
          {fixos.map(f => (
            <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <span style={{ fontSize: 20 }}>{FIXOS_ICONS[f.category] || '📌'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: f.active ? 'var(--text)' : 'var(--cinza)', textDecoration: f.active ? 'none' : 'line-through' }}>{f.description}</div>
                <div style={{ fontSize: 11, color: 'var(--cinza)' }}>{f.category} · vence dia {f.dueDay}</div>
              </div>
              <span style={{ fontWeight: 700, color: f.active ? '#f87171' : 'var(--cinza)', fontSize: 14 }}>{R$(f.value)}</span>
              <button onClick={() => toggle(f.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>{f.active ? '✅' : '⭕'}</button>
              <button onClick={() => startEdit(f)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#60a5fa', fontSize: 14 }}>✏️</button>
              <button onClick={() => remove(f.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 14 }}>🗑</button>
            </div>
          ))}
        </div>
      )}

      {/* Form */}
      {showForm ? (
        <div className="card">
          <div className="card-title">{editId ? 'Editar' : 'Novo'} Gasto Fixo</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label className="label">Descrição</label>
              <input className="input" placeholder="Ex: Aluguel, Internet..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="g2">
              <div>
                <label className="label">Valor (R$)</label>
                <input className="input" type="number" inputMode="decimal" placeholder="0,00" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} />
              </div>
              <div>
                <label className="label">Vence dia</label>
                <input className="input" type="number" min="1" max="31" value={form.dueDay} onChange={e => setForm(f => ({ ...f, dueDay: parseInt(e.target.value) || 1 }))} />
              </div>
            </div>
            <div>
              <label className="label">Categoria</label>
              <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {FIXOS_CATS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="g2">
              <button className="btn btn-ghost btn-full" onClick={() => { setShowForm(false); setEditId(null); setForm({ description: '', value: '', category: 'Habitação', dueDay: 5, active: true }) }}>Cancelar</button>
              <button className="btn btn-dark btn-full" onClick={handleSave}>Salvar</button>
            </div>
          </div>
        </div>
      ) : (
        <button className="btn btn-dark btn-full" onClick={() => setShowForm(true)}>+ Adicionar Gasto Fixo</button>
      )}

      {fixos.length === 0 && !showForm && (
        <div style={{ textAlign: 'center', padding: 32, color: 'var(--cinza)' }}>
          <div style={{ fontSize: 40 }}>🏷️</div>
          <div style={{ marginTop: 8 }}>Nenhum gasto fixo cadastrado</div>
        </div>
      )}
    </div>
  )
}

// ─── COMPROMETIMENTO ORÇAMENTÁRIO ─────────────────────────────
function OrcamentoTab({ transactions }) {
  const { state } = useApp()
  const income = (state.profile?.income || 0) + (parseFloat(localStorage.getItem('businessMonthlyIncome') || '0'))
  const incomeAnual = income * 12
  const fixos = loadFixos().filter(f => f.active)
  const totalFixos = fixos.reduce((s, f) => s + f.value, 0)
  const totalFixosAnual = totalFixos * 12

  const selY = new Date().getFullYear()
  const now = new Date()
  const mesAtual = now.getMonth() + 1

  // Média variáveis últimos 3 meses
  const mediaVariaveis = React.useMemo(() => {
    let total = 0, count = 0
    for (let i = 0; i < 3; i++) {
      let m = mesAtual - i, y = selY
      if (m < 1) { m += 12; y-- }
      const exp = transactions
        .filter(t => { const d = new Date(t.date + 'T12:00:00'); return t.type === 'expense' && d.getMonth() + 1 === m && d.getFullYear() === y })
        .reduce((s, t) => s + t.value, 0)
      if (exp > 0) { total += exp; count++ }
    }
    return count > 0 ? total / count : 0
  }, [transactions, mesAtual, selY])

  const variaveisAnual = mediaVariaveis * 12
  const totalComprometido = totalFixosAnual + variaveisAnual
  const livreAnual = incomeAnual - totalComprometido
  const livreM = income - totalFixos - mediaVariaveis

  const pctFixos = income > 0 ? (totalFixos / income * 100) : 0
  const pctVariaveis = income > 0 ? (mediaVariaveis / income * 100) : 0
  const pctLivre = income > 0 ? (livreM / income * 100) : 0

  const businessIncome = parseFloat(localStorage.getItem('businessMonthlyIncome') || '0')

  const Bar = ({ pct: p, color }) => (
    <div className="prog" style={{ marginBottom: 4 }}>
      <div className="prog-fill" style={{ width: `${Math.min(100, Math.max(0, p))}%`, background: color }} />
    </div>
  )

  return (
    <div>
      {income === 0 && (
        <div className="card" style={{ background: 'rgba(245,158,11,0.15)', borderColor: '#f59e0b' }}>
          <div style={{ fontSize: 13, color: '#fbbf24' }}>⚠️ Configure sua renda mensal em Minha Conta para ver o comprometimento completo.</div>
        </div>
      )}

      {businessIncome > 0 && (
        <div className="card" style={{ background: 'rgba(34,197,94,0.1)', borderColor: '#22c55e' }}>
          <div style={{ fontSize: 13, color: '#4ade80' }}>💼 Renda do negócio integrada: {R$(businessIncome)}/mês</div>
        </div>
      )}

      {/* Renda */}
      <div className="card">
        <div className="card-title">💰 Renda Anual</div>
        <div className="g2">
          <div className="stat"><div className="stat-label">Renda Mensal</div><div className="stat-value" style={{ fontSize: 16, color: '#4ade80' }}>{R$(income)}</div></div>
          <div className="stat"><div className="stat-label">Renda Anual</div><div className="stat-value" style={{ fontSize: 16, color: '#4ade80' }}>{R$(incomeAnual)}</div></div>
        </div>
      </div>

      {/* Comprometimento */}
      <div className="card">
        <div className="card-title">📊 Comprometimento do Orçamento</div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
            <span>🏷️ Gastos Fixos</span>
            <span style={{ fontWeight: 700, color: '#f87171' }}>{R$(totalFixos)}/mês · {pct(pctFixos)}</span>
          </div>
          <Bar pct={pctFixos} color="#ef4444" />
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
            <span>💳 Gastos Variáveis (média 3m)</span>
            <span style={{ fontWeight: 700, color: '#fb923c' }}>{R$(mediaVariaveis)}/mês · {pct(pctVariaveis)}</span>
          </div>
          <Bar pct={pctVariaveis} color="#f97316" />
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
            <span style={{ color: livreM >= 0 ? '#4ade80' : '#f87171' }}>🟢 Disponível</span>
            <span style={{ fontWeight: 700, color: livreM >= 0 ? '#4ade80' : '#f87171' }}>{R$(livreM)}/mês · {pct(Math.max(0, pctLivre))}</span>
          </div>
          <Bar pct={Math.max(0, pctLivre)} color="#22c55e" />
        </div>
      </div>

      {/* Projeção Anual */}
      <div className="card">
        <div className="card-title">📅 Projeção Anual ({selY})</div>
        <div className="scroll-x">
          <table className="tbl">
            <thead><tr><th>Item</th><th>Mensal</th><th>Anual</th><th>%</th></tr></thead>
            <tbody>
              <tr><td>💰 Receitas</td><td style={{ color: '#4ade80' }}>{R$(income)}</td><td style={{ color: '#4ade80' }}>{R$(incomeAnual)}</td><td>100%</td></tr>
              <tr><td>🏷️ Gastos Fixos</td><td style={{ color: '#f87171' }}>{R$(totalFixos)}</td><td style={{ color: '#f87171' }}>{R$(totalFixosAnual)}</td><td style={{ color: '#f87171' }}>{pct(pctFixos)}</td></tr>
              <tr><td>💳 Gastos Variáveis</td><td style={{ color: '#fb923c' }}>{R$(mediaVariaveis)}</td><td style={{ color: '#fb923c' }}>{R$(variaveisAnual)}</td><td style={{ color: '#fb923c' }}>{pct(pctVariaveis)}</td></tr>
            </tbody>
            <tfoot>
              <tr>
                <td>🟢 Disponível</td>
                <td style={{ color: livreM >= 0 ? '#4ade80' : '#f87171' }}>{R$(livreM)}</td>
                <td style={{ color: livreAnual >= 0 ? '#4ade80' : '#f87171' }}>{R$(livreAnual)}</td>
                <td style={{ color: livreM >= 0 ? '#4ade80' : '#f87171' }}>{pct(Math.max(0, pctLivre))}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Fixos por categoria */}
      {fixos.length > 0 && (
        <div className="card">
          <div className="card-title">🏷️ Fixos por Categoria</div>
          {Object.entries(fixos.reduce((acc, f) => { acc[f.category] = (acc[f.category] || 0) + f.value; return acc }, {}))
            .sort((a, b) => b[1] - a[1])
            .map(([cat, val]) => (
              <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <span style={{ fontSize: 14 }}>{FIXOS_ICONS[cat] || '📌'} {cat}</span>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: '#f87171', fontSize: 14 }}>{R$(val)}/mês</div>
                  <div style={{ fontSize: 11, color: 'var(--cinza)' }}>{R$(val * 12)}/ano</div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

// ─── MINHA CONTA ──────────────────────────────────────────
function MinhaContaTab() {
  const { state, logout, updateIncome, updatePwd, addToast } = useApp()
  const { profile, user } = state
  const [name, setName] = useState(profile?.name || '')
  const [income, setIncome] = useState(profile?.income || 3000)
  const [pwd, setPwd] = useState({ new: '', confirm: '' })
  const [saving, setSaving] = useState(false)

  const savePerfil = async () => {
    setSaving(true)
    try {
      await profileAPI.update(user.id, { name, income: parseFloat(income) || 0 })
      addToast('Perfil salvo!')
    } catch { addToast('Erro ao salvar', 'error') }
    setSaving(false)
  }

  const savePwd = async () => {
    if (pwd.new !== pwd.confirm) { addToast('Senhas não coincidem', 'error'); return }
    if (pwd.new.length < 8) { addToast('Mínimo 8 caracteres', 'error'); return }
    try { await updatePwd(pwd.new); addToast('Senha alterada!'); setPwd({ new: '', confirm: '' }) }
    catch (err) { addToast(err.message, 'error') }
  }

  return (
    <div>
      <div className="card">
        <div className="card-title">👤 Dados Pessoais</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div><label className="label">Nome</label><input className="input" value={name} onChange={e => setName(e.target.value)} /></div>
          <div><label className="label">Email (readonly)</label><input className="input" value={user?.email || ''} readOnly style={{ opacity: .7 }} /></div>
          <div><label className="label">Renda mensal (R$)</label><input className="input" type="number" inputMode="decimal" value={income} onChange={e => setIncome(e.target.value)} /></div>
          <button className="btn btn-dark btn-full" onClick={savePerfil} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </div>

      <div className="card">
        <div className="card-title">🔒 Segurança</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div><label className="label">Nova senha</label><input className="input" type="password" value={pwd.new} onChange={e => setPwd(p => ({ ...p, new: e.target.value }))} /></div>
          <div><label className="label">Confirmar senha</label><input className="input" type="password" value={pwd.confirm} onChange={e => setPwd(p => ({ ...p, confirm: e.target.value }))} /></div>
          <button className="btn btn-dark btn-full" onClick={savePwd}>Alterar Senha</button>
        </div>
      </div>

      <div className="card" style={{ background: '#f8fafc' }}>
        <div className="card-title">📱 Instalar como App (PWA)</div>
        <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
          <div><b>Android:</b> Chrome → ⋮ → Adicionar à tela inicial</div>
          <div><b>iPhone:</b> Safari → □↑ → Adicionar à Tela de Início</div>
          <div><b>PC:</b> Chrome → ⊕ na barra de endereço</div>
        </div>
      </div>

      <div className="card" style={{ background: '#f8fafc' }}>
        <div className="card-title">ℹ️ Sobre</div>
        <div style={{ fontSize: 13, color: '#64748b' }}>Ajuste a Carteira v1.0 · React 18 · Supabase · PWA</div>
      </div>

      <button className="btn btn-red btn-full" onClick={logout} style={{ marginTop: 8 }}>Sair da conta</button>
    </div>
  )
}

// ─── MAIN ────────────────────────────────────────────────────
export default function RelatoriosScreen() {
  const { state, dispatch } = useApp()
  const { transactions } = state
  const [subTab, setSubTab] = useState('7dias')

  return (
    <div>
      <div className="hdr hdr-purple">
        <h1>Relatórios</h1>
        <p>7 dias · Mensal · Anual · Fixos · Orçamento</p>
      </div>

      <div style={{ padding: '0 16px' }}>
        <div className="tabs" style={{ marginTop: 12, overflowX: 'auto', flexWrap: 'nowrap' }}>
          {[['7dias', '7 Dias'], ['mensal', 'Mensal'], ['anual', 'Anual'], ['fixos', 'Fixos'], ['orcamento', 'Orçamento'], ['conta', 'Conta']].map(([id, label]) => (
            <button key={id} className={`tab${subTab === id ? ' active' : ''}`} style={{ flex: 'none', minWidth: 'max-content', padding: '9px 12px' }} onClick={() => setSubTab(id)}>{label}</button>
          ))}
        </div>

        {subTab === '7dias' && <SevenDaysTab transactions={transactions} />}
        {subTab === 'mensal' && <MensalTab transactions={transactions} />}
        {subTab === 'anual' && <AnualTab transactions={transactions} />}
        {subTab === 'fixos' && <GastosFixosTab />}
        {subTab === 'orcamento' && <OrcamentoTab transactions={transactions} />}
        {subTab === 'conta' && <MinhaContaTab />}

        {/* Links */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 8, marginBottom: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => dispatch({ type: 'SET_TAB', tab: 'negocio' })}>→ Módulo Negócio</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setSubTab('conta')}>→ Minha Conta</button>
        </div>
      </div>
    </div>
  )
}
