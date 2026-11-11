// v2
import React, { useState, useMemo } from 'react'
import CategorySelect from '../components/CategorySelect'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useApp } from '../context/AppContext'
import { R$, pct, MONTHS } from '../utils/formatters'
import { monthsToGoal, projectFIRE } from '../utils/calculations'


const FIXOS_CATS = ['Habitação','Alimentação','Supermercado','Açougue','Padaria','Utilities','Saúde','Transporte','Educação','Lazer','Seguros','Pet','Assinaturas','Outros']
const FIXOS_ICONS = {'Habitação':'🏠','Alimentação':'🍽️','Supermercado':'🛒','Açougue':'🥩','Padaria':'🥖','Utilities':'💡','Saúde':'💊','Transporte':'🚗','Educação':'📚','Lazer':'🎬','Seguros':'🛡️','Pet':'🐾','Assinaturas':'📱','Outros':'📌'}

function GastosFixosTabP() {
  const { state, addFixo, deleteRecurringGroup, updateFixo } = useApp()
  const [form, setForm] = React.useState({ description: '', value: '', category: 'Habitação', dueDay: 5 })
  const [showForm, setShowForm] = React.useState(false)
  const [editingFixo, setEditingFixo] = React.useState(null)
  const [editForm, setEditForm] = React.useState({ description: '', value: '', category: 'Habitação', dueDay: 5 })
  const [saving, setSaving] = React.useState(false)

  const fixos = React.useMemo(() => {
    const groups = {}
    state.transactions.filter(t => t.recurring && t.type === 'expense').forEach(t => {
      if (!groups[t.recurring_id]) {
        const d = new Date(t.date + 'T12:00:00')
        groups[t.recurring_id] = {
          recurring_id: t.recurring_id,
          description: t.description,
          value: t.value,
          category: t.category,
          dueDay: d.getDate(),
        }
      }
    })
    return Object.values(groups).sort((a,b) => a.description.localeCompare(b.description, "pt-BR"))
  }, [state.transactions])

  const total = fixos.reduce((s, f) => s + f.value, 0)
  const totalAnual = total * 12
  const [showRetroInfo, setShowRetroInfo] = React.useState(false)

  const handleSave = async () => {
    if (!form.description || !form.value) return
    setSaving(true)
    await addFixo({ ...form, value: parseFloat(form.value) })
    setSaving(false)
    setForm({ description: '', value: '', category: 'Habitação', dueDay: 5 })
    setShowForm(false)
  }

  const startEdit = (f) => {
    setEditingFixo(f)
    setEditForm({ description: f.description, value: String(f.value), category: f.category, dueDay: f.dueDay })
  }

  const handleUpdate = async () => {
    if (!editForm.value) return
    setSaving(true)
    await updateFixo(editingFixo.recurring_id, { ...editForm, value: parseFloat(editForm.value) })
    setSaving(false)
    setEditingFixo(null)
  }

  const remove = (rid) => deleteRecurringGroup(rid)

  return (
    <div>
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

      <div style={{ fontSize: 11, color: '#60a5fa', background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: 8, padding: '8px 12px', marginBottom: 12, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <span>ℹ️</span>
        <span>Ao adicionar um gasto fixo, ele é lançado automaticamente em <strong>todos os 12 meses do ano</strong>. Para lançar em meses passados manualmente, vá em <strong>Transações → selecione o mês → ➕ Lançar neste mês</strong>.</span>
      </div>

      {showForm ? (
        <div className="card">
          <div className="card-title">Novo Gasto Fixo</div>
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
              <CategorySelect type="expense" baseList={FIXOS_CATS} value={form.category} onChange={v => setForm(f => ({ ...f, category: v }))} />
            </div>
            <div style={{ fontSize: 12, color: '#60a5fa', padding: '4px 0' }}>
              📅 Serão criadas despesas para todos os 12 meses do ano automaticamente.
            </div>
            <div className="g2">
              <button className="btn btn-ghost btn-full" onClick={() => { setShowForm(false); setForm({ description: '', value: '', category: 'Habitação', dueDay: 5 }) }}>Cancelar</button>
              <button className="btn btn-dark btn-full" onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      ) : (
        <button className="btn btn-dark btn-full" style={{ marginBottom: 16 }} onClick={() => setShowForm(true)}>+ Adicionar Gasto Fixo</button>
      )}

      {fixos.length > 0 && (
        <div className="card">
          {fixos.map(f => (
            <div key={f.recurring_id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 12, marginBottom: editingFixo?.recurring_id === f.recurring_id ? 0 : 10, border: '1px solid rgba(255,255,255,0.08)' }}>
                <span style={{ fontSize: 20 }}>{FIXOS_ICONS[f.category] || '📌'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.description}</div>
                  <div style={{ fontSize: 11, color: 'var(--cinza)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.category} · dia {f.dueDay} · todos os meses</div>
                </div>
                <span style={{ fontWeight: 700, color: '#f87171', fontSize: 14, flexShrink: 0 }}>{R$(f.value)}</span>
                <button onClick={() => editingFixo?.recurring_id === f.recurring_id ? setEditingFixo(null) : startEdit(f)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15 }}>✏️</button>
                <button onClick={() => remove(f.recurring_id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 15 }}>🗑</button>
              </div>
              {editingFixo?.recurring_id === f.recurring_id && (
                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 12, marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 11, color: '#60a5fa', marginBottom: 2 }}>✏️ Atualiza apenas meses a partir de hoje</div>
                  <div>
                    <label className="label">Descrição</label>
                    <input className="input" value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
                  </div>
                  <div className="g2">
                    <div>
                      <label className="label">Novo valor (R$)</label>
                      <input className="input" type="number" inputMode="decimal" value={editForm.value} onChange={e => setEditForm(f => ({ ...f, value: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label">Vence dia</label>
                      <input className="input" type="number" min="1" max="31" value={editForm.dueDay} onChange={e => setEditForm(f => ({ ...f, dueDay: parseInt(e.target.value) || 1 }))} />
                    </div>
                  </div>
                  <div>
                    <label className="label">Categoria</label>
                    <CategorySelect type="expense" baseList={FIXOS_CATS} value={editForm.category} onChange={v => setEditForm(f => ({ ...f, category: v }))} />
                  </div>
                  <div className="g2">
                    <button className="btn btn-ghost btn-full" onClick={() => setEditingFixo(null)}>Cancelar</button>
                    <button className="btn btn-dark btn-full" onClick={handleUpdate} disabled={saving}>{saving ? 'Salvando...' : 'Atualizar'}</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {fixos.length === 0 && !showForm && (
        <div style={{ textAlign: 'center', padding: 32, color: 'var(--cinza)' }}>
          <div style={{ fontSize: 40 }}>🏷️</div>
          <div style={{ marginTop: 8 }}>Nenhum gasto fixo cadastrado</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Gastos fixos aparecem automaticamente em todos os meses</div>
        </div>
      )}
    </div>
  )
}

const RECEITA_CATS = ['Salário','Freela','Aluguel','Dividendos','Comissão','Pensão','Benefício','Outros']
const RECEITA_ICONS = {'Salário':'💼','Freela':'💻','Aluguel':'🏠','Dividendos':'📈','Comissão':'🤝','Pensão':'👴','Benefício':'🎁','Outros':'💰'}

function ReceitaPrevistaTab() {
  const { state, addReceitaFixa, deleteRecurringGroup, updateFixo } = useApp()
  const [form, setForm] = React.useState({ description: '', value: '', category: 'Salário', receiveDay: 5 })
  const [showForm, setShowForm] = React.useState(false)
  const [editingId, setEditingId] = React.useState(null)
  const [editForm, setEditForm] = React.useState({ description: '', value: '', category: 'Salário', receiveDay: 5 })
  const [saving, setSaving] = React.useState(false)

  const receitas = React.useMemo(() => {
    const groups = {}
    state.transactions.filter(t => t.recurring && t.type === 'income').forEach(t => {
      if (!groups[t.recurring_id]) {
        const d = new Date(t.date + 'T12:00:00')
        groups[t.recurring_id] = {
          recurring_id: t.recurring_id,
          description: t.description,
          value: t.value,
          category: t.category,
          receiveDay: d.getDate(),
        }
      }
    })
    return Object.values(groups).sort((a,b) => a.description.localeCompare(b.description, "pt-BR"))
  }, [state.transactions])

  const totalMensal = receitas.reduce((s, r) => s + r.value, 0)
  const totalAnual = totalMensal * 12

  const handleSave = async () => {
    if (!form.description || !form.value) return
    setSaving(true)
    await addReceitaFixa({ ...form, value: parseFloat(form.value) })
    setSaving(false)
    setForm({ description: '', value: '', category: 'Salário', receiveDay: 5 })
    setShowForm(false)
  }

  const startEdit = (r) => {
    setEditingId(r)
    setEditForm({ description: r.description, value: String(r.value), category: r.category, receiveDay: r.receiveDay })
  }

  const handleUpdate = async () => {
    if (!editForm.value) return
    setSaving(true)
    await updateFixo(editingId.recurring_id, { ...editForm, value: parseFloat(editForm.value), dueDay: editForm.receiveDay })
    setSaving(false)
    setEditingId(null)
  }

  return (
    <div>
      <div className="g2" style={{ marginBottom: 12 }}>
        <div className="stat">
          <div className="stat-label">Total Mensal</div>
          <div className="stat-value" style={{ fontSize: 16, color: '#22c55e' }}>{R$(totalMensal)}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Total Anual</div>
          <div className="stat-value" style={{ fontSize: 16, color: '#22c55e' }}>{R$(totalAnual)}</div>
        </div>
      </div>

      <div style={{ fontSize: 11, color: '#86efac', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, padding: '8px 12px', marginBottom: 12, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <span>💡</span>
        <span>Cadastre aqui sua receita mensal previsível (salário, freela recorrente, aluguel). Ela será lançada automaticamente em <strong>todos os 12 meses do ano</strong>.</span>
      </div>

      {showForm ? (
        <div className="card">
          <div className="card-title">Nova Receita Fixa</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label className="label">Descrição</label>
              <input className="input" placeholder="Ex: Salário CLT, Freela mensal..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="g2">
              <div>
                <label className="label">Valor (R$)</label>
                <input className="input" type="number" inputMode="decimal" placeholder="0,00" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} />
              </div>
              <div>
                <label className="label">Recebe dia</label>
                <input className="input" type="number" min="1" max="31" value={form.receiveDay} onChange={e => setForm(f => ({ ...f, receiveDay: parseInt(e.target.value) || 1 }))} />
              </div>
            </div>
            <div>
              <label className="label">Categoria</label>
              <CategorySelect type="income" baseList={RECEITA_CATS} value={form.category} onChange={v => setForm(f => ({ ...f, category: v }))} />
            </div>
            <div style={{ fontSize: 12, color: '#86efac', padding: '4px 0' }}>
              📅 Serão criadas receitas para todos os 12 meses do ano automaticamente.
            </div>
            <div className="g2">
              <button className="btn btn-ghost btn-full" onClick={() => { setShowForm(false); setForm({ description: '', value: '', category: 'Salário', receiveDay: 5 }) }}>Cancelar</button>
              <button className="btn btn-dark btn-full" onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      ) : (
        <button className="btn btn-dark btn-full" onClick={() => setShowForm(true)}>+ Adicionar Receita Fixa</button>
      )}

      {receitas.length > 0 && (
        <div className="card">
          {receitas.map(r => (
            <div key={r.recurring_id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 12, marginBottom: editingId?.recurring_id === r.recurring_id ? 0 : 10, border: '1px solid rgba(255,255,255,0.08)' }}>
                <span style={{ fontSize: 20 }}>{RECEITA_ICONS[r.category] || '💰'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.description}</div>
                  <div style={{ fontSize: 11, color: 'var(--cinza)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.category} · dia {r.receiveDay} · todos os meses</div>
                </div>
                <span style={{ fontWeight: 700, color: '#86efac', fontSize: 14 }}>{R$(r.value)}</span>
                <button onClick={() => editingId?.recurring_id === r.recurring_id ? setEditingId(null) : startEdit(r)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15 }}>✏️</button>
                <button onClick={() => deleteRecurringGroup(r.recurring_id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 15 }}>🗑</button>
              </div>
              {editingId?.recurring_id === r.recurring_id && (
                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 12, marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 11, color: '#86efac', marginBottom: 2 }}>✏️ Atualiza apenas meses a partir de hoje</div>
                  <div>
                    <label className="label">Descrição</label>
                    <input className="input" value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
                  </div>
                  <div className="g2">
                    <div>
                      <label className="label">Novo valor (R$)</label>
                      <input className="input" type="number" inputMode="decimal" value={editForm.value} onChange={e => setEditForm(f => ({ ...f, value: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label">Recebe dia</label>
                      <input className="input" type="number" min="1" max="31" value={editForm.receiveDay} onChange={e => setEditForm(f => ({ ...f, receiveDay: parseInt(e.target.value) || 1 }))} />
                    </div>
                  </div>
                  <div>
                    <label className="label">Categoria</label>
                    <CategorySelect type="income" baseList={RECEITA_CATS} value={editForm.category} onChange={v => setEditForm(f => ({ ...f, category: v }))} />
                  </div>
                  <div className="g2">
                    <button className="btn btn-ghost btn-full" onClick={() => setEditingId(null)}>Cancelar</button>
                    <button className="btn btn-dark btn-full" onClick={handleUpdate} disabled={saving}>{saving ? 'Salvando...' : 'Atualizar'}</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {receitas.length === 0 && !showForm && (
        <div style={{ textAlign: 'center', padding: 32, color: 'var(--cinza)' }}>
          <div style={{ fontSize: 40 }}>💰</div>
          <div style={{ marginTop: 8 }}>Nenhuma receita fixa cadastrada</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Cadastre seu salário ou receitas mensais previsíveis</div>
        </div>
      )}
    </div>
  )
}


const PILARES = [
  { id: 'obrig', label: '🏠 Obrigatórias', pct: 50, cats: ['Alimentação','Supermercado','Açougue','Padaria','Restaurante','Habitação','Transporte','Transporte e Comunicação','Saúde','Saúde e Cuidados','Utilities','Seguros','Pet','Assinaturas'] },
  { id: 'invest', label: '💰 Investimentos', pct: 20, cats: [] },
  { id: 'opcio', label: '🎉 Opcionais', pct: 20, cats: ['Lazer','Vestuário','Despesas Pessoais'] },
  { id: 'proj', label: '📚 Projetos de Vida', pct: 10, cats: ['Educação','Outros'] },
]

function Speedometer({ score }) {
  const cx = 100, cy = 90, r = 70
  const angle = Math.PI * (1 - score / 1000)
  const nx = cx + r * Math.cos(angle)
  const ny = cy - r * Math.sin(angle)
  const color = score < 400 ? '#ef4444' : score < 700 ? '#f59e0b' : '#22c55e'
  const largeArc = 0

  return (
    <svg viewBox="0 0 200 110" style={{ width: '100%', maxWidth: 240, display: 'block', margin: '0 auto' }}>
      <path d="M 30,90 A 70,70 0 0 1 170,90" stroke="#e2e8f0" strokeWidth={16} fill="none" strokeLinecap="round" />
      {score > 0 && (
        <path d={`M 30,90 A 70,70 0 ${largeArc} 1 ${nx.toFixed(1)},${ny.toFixed(1)}`}
          stroke={color} strokeWidth={16} fill="none" strokeLinecap="round" />
      )}
      <line x1={cx} y1={cy} x2={nx.toFixed(1)} y2={ny.toFixed(1)} stroke="#1e293b" strokeWidth={3} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={5} fill="#94a3b8" />
      <text x={cx} y={cy - 10} textAnchor="middle" fontSize={28} fontWeight="700" fill="#f1f5f9">{score}</text>
      <text x={cx} y={cy + 6} textAnchor="middle" fontSize={10} fill="#64748b">SCORE</text>
    </svg>
  )
}

function DiagnosticoTab({ goals, transactions, income }) {
  const curM = new Date().getMonth() + 1
  const curY = new Date().getFullYear()
  const curTxs = transactions.filter(t => {
    const d = new Date(t.date + 'T12:00:00')
    return d.getMonth() + 1 === curM && d.getFullYear() === curY
  })
  const totalInc = curTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.value, 0)
  const totalExp = curTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.value, 0)
  const saldo = totalInc - totalExp
  const pctComp = totalInc > 0 ? (totalExp / totalInc) * 100 : 0

  const obrigCats = ['Alimentação','Supermercado','Açougue','Padaria','Restaurante','Habitação','Transporte','Transporte e Comunicação','Saúde','Saúde e Cuidados','Utilities','Seguros','Pet','Assinaturas']
  const obrig = curTxs.filter(t => t.type === 'expense' && obrigCats.includes(t.category)).reduce((s, t) => s + t.value, 0)
  const opcio = curTxs.filter(t => t.type === 'expense' && ['Lazer','Vestuário','Despesas Pessoais'].includes(t.category)).reduce((s, t) => s + t.value, 0)
  const totalAp = goals.reduce((s, g) => s + (g.monthly || 0), 0)
  const poupPct = income > 0 ? (totalAp / income) * 100 : 0
  const obrigPct = income > 0 ? (obrig / income) * 100 : 0
  const moradiaExp = curTxs.filter(t => t.type === 'expense' && t.category === 'Habitação').reduce((s, t) => s + t.value, 0)
  const moradiaPct = income > 0 ? (moradiaExp / income) * 100 : 0
  const opcPct = income > 0 ? (opcio / income) * 100 : 0
  const fontes = new Set(curTxs.filter(t => t.type === 'income').map(t => t.category)).size

  const emergGoal = goals.find(g => g.position === 0)
  const emergScore = emergGoal && emergGoal.target > 0 ? Math.min(100, (emergGoal.current_val / emergGoal.target) * 100) : 0

  const pillars = [
    { label: '🎛️ Controle de Gastos', score: pctComp <= 70 ? 100 : pctComp <= 90 ? 70 : 40, desc: 'Comprometimento: ' + pctComp.toFixed(1) + '%' },
    { label: '💰 Capacidade de Poupança', score: Math.min(100, poupPct * 5), desc: 'Taxa de poupança: ' + poupPct.toFixed(1) + '%' },
    { label: '🌿 Diversificação de Renda', score: Math.min(100, fontes * 35), desc: fontes + ' fonte(s) de receita' },
    { label: '🏠 Comprometimento Moradia', score: moradiaPct <= 30 ? 100 : moradiaPct <= 40 ? 70 : 40, desc: 'Moradia: ' + moradiaPct.toFixed(1) + '% da renda' },
    { label: '🎉 Gastos Não Obrigatórios', score: opcPct <= 20 ? 100 : opcPct <= 30 ? 70 : 40, desc: 'Opcionais: ' + opcPct.toFixed(1) + '% da renda' },
    { label: '🛡️ Segurança Financeira', score: emergScore, desc: 'Reserva de emergência' },
  ]
  const totalScore = Math.round(pillars.reduce((s, p) => s + p.score, 0) / pillars.length)
  const scoreLabel = totalScore < 40 ? 'Atenção' : totalScore < 60 ? 'Regular' : totalScore < 80 ? 'Bom' : 'Excelente'
  const scoreColor = totalScore < 40 ? '#ef4444' : totalScore < 60 ? '#f97316' : totalScore < 80 ? '#22c55e' : '#15803d'

  const recs = []
  if (moradiaPct <= 30) recs.push({ ok: true, text: 'Comprometimento de moradia dentro do ideal' })
  if (obrigPct <= 50) recs.push({ ok: true, text: 'Despesas obrigatórias dentro do limite de 50% (' + obrigPct.toFixed(0) + '%)' })
  else recs.push({ ok: false, text: 'Despesas obrigatórias acima de 50% (' + obrigPct.toFixed(0) + '%) — revise os fixos' })
  if (poupPct >= 20) recs.push({ ok: true, text: 'Poupança em ' + poupPct.toFixed(0) + '% — acima da meta de 20%' })
  else recs.push({ ok: false, text: 'Poupança em ' + poupPct.toFixed(0) + '% — meta mínima: 10% (Babilônia) ou 20% (50/30/20)' })
  if (fontes >= 2) recs.push({ ok: true, text: 'Renda diversificada (' + fontes + ' fontes)' })
  else recs.push({ ok: null, text: 'Considere diversificar fontes de renda' })
  if (saldo >= 0) recs.push({ ok: true, text: 'Saldo positivo de ' + R$(saldo) + ' neste mês' })
  else recs.push({ ok: false, text: 'Saldo negativo de ' + R$(Math.abs(saldo)) + ' — despesas acima da receita' })

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        {[
          { label: 'RECEITA TOTAL', value: R$(totalInc), color: '#22c55e' },
          { label: 'TOTAL DESPESAS', value: R$(totalExp), color: '#ef4444' },
          { label: 'SALDO LIVRE', value: R$(saldo), color: saldo >= 0 ? '#22c55e' : '#ef4444' },
          { label: '% COMPROMETIDO', value: pctComp.toFixed(1) + '%', color: pctComp <= 70 ? '#22c55e' : pctComp <= 90 ? '#f59e0b' : '#ef4444' },
        ].map(c => (
          <div key={c.label} className="stat" style={{ padding: '10px 12px' }}>
            <div style={{ fontSize: 10, color: '#64748b', letterSpacing: 1, textTransform: 'uppercase' }}>{c.label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: c.color, marginTop: 2 }}>{c.value}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-title">🩺 Score Financeiro por Pilar</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ color: '#64748b', fontSize: 10 }}>
                <th style={{ textAlign: 'left', padding: '4px 6px' }}>Pilar</th>
                <th style={{ textAlign: 'center', padding: '4px 6px' }}>Score</th>
                <th style={{ textAlign: 'center', padding: '4px 6px' }}>Avaliação</th>
                <th style={{ textAlign: 'center', padding: '4px 6px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {pillars.map(p => {
                const c = p.score < 40 ? '#ef4444' : p.score < 70 ? '#f59e0b' : '#22c55e'
                const lbl = p.score < 40 ? 'Atenção' : p.score < 70 ? 'Regular' : p.score < 90 ? 'Bom' : 'Excelente'
                return (
                  <tr key={p.label} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '8px 6px' }}>
                      <div style={{ fontWeight: 600 }}>{p.label}</div>
                      <div style={{ fontSize: 10, color: '#64748b' }}>{p.desc}</div>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 800, color: c, fontSize: 15 }}>{Math.round(p.score)}</td>
                    <td style={{ textAlign: 'center', color: c, fontSize: 11 }}>{lbl}</td>
                    <td style={{ textAlign: 'center', fontSize: 16 }}>{p.score >= 70 ? '✅' : '⚠️'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 10, paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 800, fontSize: 14 }}>SCORE TOTAL</span>
          <span style={{ fontWeight: 800, fontSize: 18, color: scoreColor }}>{totalScore}/100 <span style={{ fontSize: 13 }}>{scoreLabel}</span></span>
        </div>
      </div>

      <div className="card">
        <div className="card-title">💡 Recomendações Automáticas</div>
        {recs.map((r, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 0', borderBottom: i < recs.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', fontSize: 13 }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>{r.ok === true ? '✅' : r.ok === false ? '⚠️' : '💡'}</span>
            <span style={{ color: r.ok === false ? '#f87171' : r.ok === true ? '#86efac' : '#fbbf24' }}>{r.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}


// ─── FAMÍLIA TAB ─────────────────────────────────────────────
function FamiliaTab() {
  const { state, addFamilyMember, removeFamilyMember } = useApp()
  const members = state.profile?.family_members || []
  const [name, setName] = React.useState('')

  const handleAdd = async () => {
    if (!name.trim()) return
    await addFamilyMember(name.trim())
    setName('')
  }

  return (
    <div style={{ paddingTop: 12 }}>
      <div className="card">
        <div className="card-title" style={{ marginBottom: 12 }}>👨‍👩‍👧 Membros da Família</div>
        <p style={{ fontSize: 13, color: 'var(--cinza)', marginBottom: 16 }}>
          Cadastre os membros para identificar quem é o responsável de cada gasto ou receita.
        </p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            className="input"
            style={{ flex: 1 }}
            placeholder="Nome do membro"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <button className="btn btn-dark" onClick={handleAdd}>+ Adicionar</button>
        </div>
        {members.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--cinza)', fontSize: 13 }}>
            Nenhum membro cadastrado ainda
          </div>
        ) : (
          <div>
            {members.map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, marginBottom: 8, border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#fff' }}>
                    {m.name[0].toUpperCase()}
                  </div>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{m.name}</span>
                </div>
                <button onClick={() => removeFamilyMember(m.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 18 }}>🗑</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function PlanejamentoScreen() {
  const { state, dispatch, updateGoal, updateIncome } = useApp()
  const { goals, transactions, profile, selM, selY } = state
  const [subTab, setSubTab] = useState('objetivos')
  const [fireForm, setFireForm] = useState({ renda: 5000, patrimonio: 0, aporte: 1000, taxa: 0.8 })

  const income = profile?.income || 3000

  const fixosMensais = useMemo(() => {
    const groups = {}
    transactions.filter(t => t.recurring && t.type === 'expense').forEach(t => {
      if (!groups[t.recurring_id]) groups[t.recurring_id] = t.value
    })
    return Object.values(groups).reduce((s, v) => s + v, 0)
  }, [transactions])

  const totalAporte = goals.reduce((s, g) => s + (g.monthly || 0), 0)
  const savingPct = income > 0 ? (totalAporte / income) * 100 : 0
  const fixosPct = income > 0 ? (fixosMensais / income) * 100 : 0
  const babylonOk = savingPct >= 10

  const monthExpenses = useMemo(() => transactions.filter(t => {
    const d = new Date(t.date + 'T12:00:00')
    return t.type === 'expense' && d.getMonth() + 1 === selM && d.getFullYear() === selY
  }), [transactions, selM, selY])

  const fireNumber = fireForm.renda * 300
  const fireMonths = monthsToGoal(fireNumber, Number(fireForm.patrimonio), Number(fireForm.aporte), Number(fireForm.taxa))
  const fireYears = Math.ceil(fireMonths / 12)
  const fireData = projectFIRE(Number(fireForm.patrimonio), Number(fireForm.aporte), Number(fireForm.taxa), Math.min(fireYears, 40) * 12)

  const openEdit = (goal) => dispatch({ type: 'SET_MODAL', modal: 'edit-goal', editingGoal: goal })

  return (
    <div>
      <div className="hdr hdr-purple">
        <h1>Planejamento Financeiro</h1>
        <p>Objetivos · Pilares · FIRE · Diagnóstico · Fixos · Receita</p>
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        <div className="tabs" style={{ marginTop: 0 }}>
          {[['objetivos', 'Objetivos'], ['pilares', 'Pilares'], ['fire', 'FIRE'], ['diagnostico', '🩺 Diagnóstico'], ['fixos', '🏷️ Fixos'], ['receita', '💰 Receita'], ['familia', '👨‍👩‍👧 Família']].map(([id, label]) => (
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

            {/* BABILÔNIA */}
            <div className="card" style={{ borderTop: '3px solid #f59e0b' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>📜 O Homem Mais Rico da Babilônia</div>
                <span style={{ fontSize: 20 }}>{babylonOk ? '✅' : '⚠️'}</span>
              </div>
              <div style={{ fontSize: 12, color: '#92400e', background: '#fef3c7', borderRadius: 8, padding: '8px 10px', marginBottom: 10, lineHeight: 1.6 }}>
                <strong>Questão Primordial:</strong> "De cada 10 moedas que ganhas, guarda pelo menos 1 para ti mesmo." — Arkad
              </div>
              <div className="g2" style={{ marginBottom: 8 }}>
                <div className="stat">
                  <div className="stat-label">Gastos Fixos/Renda</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: fixosPct > 70 ? '#ef4444' : fixosPct > 55 ? '#f59e0b' : '#22c55e' }}>{fixosPct.toFixed(1)}%</div>
                </div>
                <div className="stat">
                  <div className="stat-label">Taxa de Poupança</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: babylonOk ? '#22c55e' : '#ef4444' }}>{savingPct.toFixed(1)}%</div>
                </div>
              </div>
              <div className="prog" style={{ marginBottom: 4 }}>
                <div className="prog-fill" style={{ width: `${Math.min(100, savingPct * 5)}%`, background: babylonOk ? '#22c55e' : '#ef4444' }} />
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10 }}>
                {babylonOk ? '✅ Você está pagando a si mesmo primeiro!' : `⚠️ Meta: guardar 10% da renda — faltam ${R$(income * 0.1 - totalAporte)}/mês`}
              </div>
              <div style={{ fontSize: 11, color: '#64748b', borderTop: '1px solid rgba(0,0,0,0.07)', paddingTop: 8 }}>
                <strong style={{ color: '#92400e' }}>7 Curas para uma Bolsa Vazia:</strong><br />
                1️⃣ Pague-se primeiro (10%) &nbsp;·&nbsp; 2️⃣ Controle os gastos &nbsp;·&nbsp; 3️⃣ Multiplique seu ouro<br />
                4️⃣ Proteja seu patrimônio &nbsp;·&nbsp; 5️⃣ Casa própria &nbsp;·&nbsp; 6️⃣ Renda futura &nbsp;·&nbsp; 7️⃣ Aumente sua capacidade
              </div>
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
            {fixosMensais > 0 && (
              <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 12 }}>
                <div style={{ fontWeight: 700, color: '#f59e0b', marginBottom: 4 }}>📌 Seus gastos fixos mensais: {R$(fixosMensais)}</div>
                <div style={{ color: '#94a3b8' }}>Para cobrir só os fixos, você precisaria de <strong style={{ color: '#f1f5f9' }}>{R$(fixosMensais * 300)}</strong> investidos (Regra 4%).</div>
                {Number(fireForm.renda) < fixosMensais && (
                  <div style={{ color: '#ef4444', marginTop: 4 }}>⚠️ Renda desejada é menor que seus gastos fixos atuais!</div>
                )}
              </div>
            )}

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

        {subTab === 'diagnostico' && <DiagnosticoTab goals={goals} transactions={transactions} income={income} />}

        {/* GASTOS FIXOS */}
        {subTab === 'fixos' && <GastosFixosTabP />}

        {/* RECEITA PREVISTA */}
        {subTab === 'receita' && <ReceitaPrevistaTab />}

        {/* FAMÍLIA */}
        {subTab === 'familia' && <FamiliaTab />}

      </div>
    </div>
  )
}
