import { useState, useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useApp } from '../context/AppContext'
import { R$, pct, MONTHS } from '../utils/formatters'
import { monthsToGoal, projectFIRE, calcScore } from '../utils/calculations'

const PILARES = [
  { id: 'obrig', label: '🏠 Obrigatórias', pct: 50, cats: ['Alimentação', 'Habitação', 'Transporte e Comunicação', 'Saúde e Cuidados'] },
  { id: 'invest', label: '💰 Investimentos', pct: 20, cats: [] },
  { id: 'opcio', label: '🎉 Opcionais', pct: 20, cats: ['Lazer', 'Vestuário', 'Despesas Pessoais'] },
  { id: 'proj', label: '📚 Projetos de Vida', pct: 10, cats: ['Educação'] },
]

function Speedometer({ score }) {
  const cx = 100, cy = 90, r = 70
  const angle = Math.PI * (1 - score / 1000)
  const nx = cx + r * Math.cos(angle)
  const ny = cy - r * Math.sin(angle)
  const color = score < 400 ? '#ef4444' : score < 700 ? '#f59e0b' : '#22c55e'
  const largeArc = score > 500 ? 1 : 0

  return (
    <svg viewBox="0 0 200 110" style={{ width: '100%', maxWidth: 240, display: 'block', margin: '0 auto' }}>
      <path d="M 30,90 A 70,70 0 0 1 170,90" stroke="#e2e8f0" strokeWidth={16} fill="none" strokeLinecap="round" />
      {score > 0 && (
        <path d={`M 30,90 A 70,70 0 ${largeArc} 1 ${nx.toFixed(1)},${ny.toFixed(1)}`}
          stroke={color} strokeWidth={16} fill="none" strokeLinecap="round" />
      )}
      <line x1={cx} y1={cy} x2={nx.toFixed(1)} y2={ny.toFixed(1)} stroke="#1e293b" strokeWidth={3} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={5} fill="#1e293b" />
      <text x={cx} y={cy - 10} textAnchor="middle" fontSize={28} fontWeight="700" fill="#1e293b">{score}</text>
      <text x={cx} y={cy + 6} textAnchor="middle" fontSize={10} fill="#64748b">SCORE</text>
    </svg>
  )
}

export default function PlanejamentoScreen() {
  const { state, dispatch, updateGoal, updateIncome } = useApp()
  const { goals, transactions, profile, selM, selY } = state
  const [subTab, setSubTab] = useState('objetivos')
  const [fireForm, setFireForm] = useState({ renda: 5000, patrimonio: 0, aporte: 1000, taxa: 0.8 })

  const income = profile?.income || 3000

  const monthExpenses = useMemo(() => transactions.filter(t => {
    const d = new Date(t.date + 'T12:00:00')
    return t.type === 'expense' && d.getMonth() + 1 === selM && d.getFullYear() === selY
  }), [transactions, selM, selY])

  const fireNumber = fireForm.renda * 300
  const fireMonths = monthsToGoal(fireNumber, Number(fireForm.patrimonio), Number(fireForm.aporte), Number(fireForm.taxa))
  const fireYears = Math.ceil(fireMonths / 12)
  const fireData = projectFIRE(Number(fireForm.patrimonio), Number(fireForm.aporte), Number(fireForm.taxa), Math.min(fireYears, 40) * 12)

  const score = calcScore(goals, transactions, income)
  const scoreLabel = score < 300 ? 'Atenção' : score < 500 ? 'Regular' : score < 700 ? 'Bom' : score < 900 ? 'Muito Bom' : 'Excelente'
  const scoreColor = score < 300 ? '#ef4444' : score < 500 ? '#f97316' : score < 700 ? '#f59e0b' : score < 900 ? '#22c55e' : '#15803d'

  const openEdit = (goal) => dispatch({ type: 'SET_MODAL', modal: 'edit-goal', editingGoal: goal })

  return (
    <div>
      <div className="hdr hdr-purple">
        <h1>Planejamento Financeiro</h1>
        <p>Objetivos · Pilares · FIRE · Score</p>
      </div>

      <div style={{ padding: '0 16px' }}>
        <div className="tabs" style={{ marginTop: 12 }}>
          {[['objetivos', 'Objetivos'], ['pilares', 'Pilares'], ['fire', 'FIRE'], ['score', 'Score']].map(([id, label]) => (
            <button key={id} className={`tab${subTab === id ? ' active' : ''}`} onClick={() => setSubTab(id)}>{label}</button>
          ))}
        </div>

        {/* OBJETIVOS */}
        {subTab === 'objetivos' && (
          <div>
            {goals.map(goal => {
              const months = monthsToGoal(goal.target, goal.current_val, goal.monthly, goal.rate)
              const prog = goal.target > 0 ? Math.min(100, (goal.current_val / goal.target) * 100) : 0
              return (
                <div key={goal.id} className="card" style={{ borderTop: `3px solid ${goal.color}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 22, marginBottom: 4 }}>{goal.icon}</div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{goal.name}</div>
                      {goal.description && <div style={{ fontSize: 12, color: '#64748b' }}>{goal.description}</div>}
                    </div>
                    <button onClick={() => openEdit(goal)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#64748b' }}>✏️</button>
                  </div>
                  <div className="prog" style={{ marginBottom: 6 }}>
                    <div className="prog-fill" style={{ width: `${prog}%`, background: goal.color }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                    <span>{R$(goal.current_val)} de {R$(goal.target)}</span>
                    <span style={{ fontWeight: 700, color: goal.color }}>{prog.toFixed(1)}%</span>
                  </div>
                  <div className="g2" style={{ gap: 8 }}>
                    <div style={{ fontSize: 12 }}>
                      <div style={{ color: '#64748b' }}>Aporte/mês</div>
                      <div style={{ fontWeight: 700 }}>{R$(goal.monthly)}</div>
                    </div>
                    <div style={{ fontSize: 12 }}>
                      <div style={{ color: '#64748b' }}>Meses restantes</div>
                      <div style={{ fontWeight: 700 }}>{goal.current_val >= goal.target ? '✓ Concluído' : months > 0 ? `${months} meses` : '–'}</div>
                    </div>
                  </div>
                  {goal.invest && <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>📈 {goal.invest}</div>}
                </div>
              )
            })}
          </div>
        )}

        {/* PILARES */}
        {subTab === 'pilares' && (
          <div>
            <div className="card">
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 6 }}>Renda mensal</div>
              <input className="input" type="number" inputMode="decimal" value={income}
                onChange={e => updateIncome(e.target.value)} />
            </div>
            {PILARES.map(p => {
              const budget = income * (p.pct / 100)
              let real = 0
              if (p.id === 'invest') {
                real = goals.reduce((s, g) => s + (g.monthly || 0), 0)
              } else {
                real = monthExpenses.filter(t => p.cats.includes(t.category)).reduce((s, t) => s + t.value, 0)
              }
              const progPct = budget > 0 ? Math.min(100, (real / budget) * 100) : 0
              const status = progPct <= 85 ? '🟢' : progPct <= 100 ? '🟡' : '🔴'
              const color = progPct <= 85 ? '#22c55e' : progPct <= 100 ? '#f59e0b' : '#ef4444'
              return (
                <div key={p.id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ fontWeight: 700 }}>{p.label} <span style={{ color: '#64748b', fontWeight: 400, fontSize: 12 }}>({p.pct}%)</span></div>
                    <span>{status}</span>
                  </div>
                  <div className="g2" style={{ marginBottom: 8 }}>
                    <div className="stat"><div className="stat-label">Budget</div><div style={{ fontSize: 15, fontWeight: 700 }}>{R$(budget)}</div></div>
                    <div className="stat"><div className="stat-label">Realizado</div><div style={{ fontSize: 15, fontWeight: 700, color }}>{R$(real)}</div></div>
                  </div>
                  <div className="prog">
                    <div className="prog-fill" style={{ width: `${progPct}%`, background: color }} />
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 4, textAlign: 'right' }}>{progPct.toFixed(1)}% utilizado</div>
                </div>
              )
            })}
            <div className="card" style={{ background: '#f8fafc' }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>📐 Regra 50/30/20</div>
              <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>50% para necessidades obrigatórias, 20% para investimentos e proteção, 20% para desejos e lazer, 10% para projetos de vida e educação.</div>
            </div>
          </div>
        )}

        {/* FIRE */}
        {subTab === 'fire' && (
          <div>
            <div className="fire-card">
              <div className="fire-label">Número FIRE (Regra dos 4%)</div>
              <div className="fire-number">{R$(fireNumber)}</div>
              <div className="fire-label">Patrimônio necessário para {R$(fireForm.renda)}/mês</div>
            </div>

            <div className="card">
              <div className="card-title">Parâmetros</div>
              <div className="g2" style={{ gap: 10 }}>
                {[
                  { label: 'Renda desejada/mês (R$)', key: 'renda' },
                  { label: 'Patrimônio atual (R$)', key: 'patrimonio' },
                  { label: 'Aporte mensal (R$)', key: 'aporte' },
                  { label: 'Taxa mensal (%)', key: 'taxa' },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <label className="label">{label}</label>
                    <input className="input" type="number" inputMode="decimal"
                      value={fireForm[key]}
                      onChange={e => setFireForm(f => ({ ...f, [key]: e.target.value }))} />
                  </div>
                ))}
              </div>
            </div>

            <div className="g3" style={{ marginBottom: 12 }}>
              <div className="stat"><div className="stat-label">Anos</div><div className="stat-value" style={{ color: '#b45309' }}>{fireYears}</div></div>
              <div className="stat"><div className="stat-label">Meses</div><div className="stat-value">{fireMonths}</div></div>
              <div className="stat"><div className="stat-label">Taxa %</div><div className="stat-value">{fireForm.taxa}%</div></div>
            </div>

            {fireData.length > 1 && (
              <div className="card">
                <div className="card-title">Projeção Patrimonial (mil R$)</div>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={fireData}>
                    <XAxis dataKey="ano" tick={{ fontSize: 10 }} interval={Math.floor(fireData.length / 5)} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}k`} />
                    <Tooltip formatter={v => [`R$ ${v}k`, 'Patrimônio']} />
                    <Area type="monotone" dataKey="patrimônio" stroke="#b45309" fill="#fef3c7" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="card" style={{ background: '#fef3c7', borderColor: '#f59e0b' }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>💡 Regra dos 4%</div>
              <div style={{ fontSize: 12, color: '#92400e', lineHeight: 1.5 }}>Se você retirar apenas 4% ao ano do seu patrimônio acumulado, a carteira tem alta probabilidade de durar 30+ anos. O "Número FIRE" = renda desejada × 12 meses ÷ 4% = renda × 300.</div>
            </div>
          </div>
        )}

        {/* SCORE */}
        {subTab === 'score' && (
          <div>
            <div className="card" style={{ textAlign: 'center' }}>
              <div className="card-title">Score Financeiro</div>
              <Speedometer score={score} />
              <div style={{ marginTop: 8 }}>
                <span className="badge" style={{ background: scoreColor + '22', color: scoreColor, fontSize: 14, padding: '6px 16px' }}>{scoreLabel}</span>
              </div>
            </div>

            <div className="card">
              <div className="card-title">Componentes do Score</div>
              {[
                { label: '🛡️ Reserva de Emergência', max: 200, val: (() => { const e = goals.find(g => g.position === 0); return e && e.target > 0 ? Math.min(200, (e.current_val / e.target) * 200) : 0 })() },
                { label: '💰 Taxa de Poupança', max: 200, val: Math.min(200, (goals.reduce((s, g) => s + (g.monthly || 0), 0) / Math.max(income, 1)) * 10 * 100) },
                { label: '🎯 Objetivos ativos', max: 100, val: Math.min(100, goals.filter(g => g.current_val > 0).length * 20) },
                { label: '✅ Sem atrasos', max: 150, val: transactions.filter(t => t.type === 'expense' && !t.paid && t.date < new Date().toISOString().split('T')[0]).length === 0 ? 150 : 0 },
                { label: '📊 Diversificação', max: 150, val: Math.min(150, goals.length * 30) },
                { label: '⭐ Base', max: 50, val: 50 },
              ].map(({ label, max, val }) => (
                <div key={label} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span>{label}</span>
                    <span style={{ fontWeight: 700 }}>{Math.round(val)}/{max}</span>
                  </div>
                  <div className="prog">
                    <div className="prog-fill" style={{ width: `${(val / max) * 100}%`, background: val >= max * 0.7 ? '#22c55e' : val >= max * 0.4 ? '#f59e0b' : '#ef4444' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
