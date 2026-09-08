import { useState, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, ReferenceLine, PieChart, Pie, Cell } from 'recharts'
import { useApp } from '../context/AppContext'
import { R$, pct, todayStr, parseTimeSecs, fmtHours, MONTHS } from '../utils/formatters'
import { calcVPL, calcTIR, calcPayback, calcIL } from '../utils/calculations'
import { dreAPI, vplAPI } from '../utils/api'

// ─── FACÇÕES TAB ─────────────────────────────────────────────
function FaccoesTab({ lot, lotIdx }) {
  const { updateLot, addLotItem, updateLotItem, deleteItem, addExpense, deleteExpense, addWorker, updateWorker, deleteWorker, updateWorkerItem } = useApp()
  const [newWorkerName, setNewWorkerName] = useState('')

  const items = lot.lot_items || []
  const expenses = lot.lot_expenses || []
  const workers = lot.workers || []

  // ── Totais básicos ──────────────────────────────────────────
  const totalProd = items.reduce((s, i) => s + (parseFloat(i.value) || 0) * (parseInt(i.quantity) || 0), 0)
  const totalExp = expenses.reduce((s, e) => s + (parseFloat(e.value) || 0), 0)
  const totalHoursSecs = items.reduce((s, i) => s + parseTimeSecs(i.time_per_piece) * (parseInt(i.quantity) || 0), 0)
  const totalHours = totalHoursSecs / 3600
  const availableHours = (lot.team_size || 0) * (lot.hours_per_day || 0) * (lot.work_days || 0)
  const usedPct = availableHours > 0 ? (totalHours / availableHours) * 100 : 0

  const setLotField = (key, val) => updateLot(lotIdx, { [key]: val })
  const setItemField = (item, key, val) => updateLotItem(lotIdx, item.id, { [key]: val })

  // ── Análise por colaborador ─────────────────────────────────
  const workerAnalysis = workers.map((w, wi) => {
    const wi_items = w.worker_items || []
    // Horas que esse colaborador vai trabalhar (% do tempo de cada peça)
    const workerHoursSecs = items.reduce((s, item) => {
      const p = parseFloat(wi_items.find(x => x.lot_item_ref === item.ref)?.value || 0)
      const itemSecs = parseTimeSecs(item.time_per_piece) * (parseInt(item.quantity) || 0)
      return s + (p / 100) * itemSecs
    }, 0)
    // Ganho total (% do valor do item)
    const earned = items.reduce((s, item) => {
      const p = parseFloat(wi_items.find(x => x.lot_item_ref === item.ref)?.value || 0)
      const itemTotal = (parseFloat(item.value) || 0) * (parseInt(item.quantity) || 0)
      return s + (p / 100) * itemTotal
    }, 0)
    const hoursPerDay = lot.hours_per_day || 8
    const daysNeeded = hoursPerDay > 0 ? (workerHoursSecs / 3600) / hoursPerDay : 0
    const dailyEarned = daysNeeded > 0 ? earned / daysNeeded : 0
    const dailyRate = parseFloat(w.daily_rate) || 0
    const isUnderMin = dailyRate > 0 && dailyEarned < dailyRate
    return { worker: w, wi, workerHoursSecs, earned, daysNeeded, dailyEarned, dailyRate, isUnderMin }
  })

  // Colaborador com menor ganho/dia (referência para análise de prejuízo)
  const minEarner = workerAnalysis.filter(a => a.dailyEarned > 0)
    .reduce((min, a) => (!min || a.dailyEarned < min.dailyEarned) ? a : min, null)

  // Prazo: dias que o lote leva (quem demorar mais define o prazo)
  const maxDays = workerAnalysis.length > 0
    ? Math.max(...workerAnalysis.map(a => a.daysNeeded))
    : (lot.hours_per_day || 8) > 0 ? totalHours / (lot.hours_per_day || 8) : 0

  // Data de término baseada na data de início
  const startDate = lot.start_date ? new Date(lot.start_date + 'T12:00:00') : null
  const endDate = startDate && maxDays > 0
    ? new Date(startDate.getTime() + Math.ceil(maxDays) * 24 * 3600 * 1000) : null
  const fmtD = d => d ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '–'

  // Custo total dos colaboradores e lucro real
  const totalWorkerCost = workerAnalysis.reduce((s, a) => s + a.earned, 0)
  const trueProfit = totalProd - totalWorkerCost - totalExp
  const trueProfitPerDay = maxDays > 0 ? trueProfit / maxDays : 0

  return (
    <div>
      {/* Capacidade */}
      <div className="card">
        <div className="card-title">📊 Capacidade da Equipe</div>
        <div className="g3" style={{ marginBottom: 12 }}>
          {[['team_size', 'Funcionários'], ['hours_per_day', 'Horas/dia'], ['work_days', 'Dias ref.']].map(([key, label]) => (
            <div key={key}>
              <label className="label">{label}</label>
              <input className="input" type="number" inputMode="numeric"
                value={lot[key] || ''} onChange={e => setLotField(key, parseInt(e.target.value) || 0)} />
            </div>
          ))}
        </div>
        {/* Data de início */}
        <div style={{ marginBottom: 10 }}>
          <label className="label">Data de início do lote</label>
          <input className="input" type="date" value={lot.start_date || ''}
            onChange={e => setLotField('start_date', e.target.value)} />
        </div>
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
            <span>Horas totais do lote: <b>{fmtHours(totalHoursSecs)}</b></span>
            <span style={{ color: usedPct > 100 ? '#ef4444' : usedPct > 90 ? '#f59e0b' : '#22c55e', fontWeight: 700 }}>{usedPct.toFixed(0)}%</span>
          </div>
          <div className="prog">
            <div className="prog-fill" style={{ width: `${Math.min(100, usedPct)}%`, background: usedPct > 100 ? '#ef4444' : usedPct > 90 ? '#f59e0b' : '#22c55e' }} />
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
            {usedPct > 100 ? `🔴 Excede em ${fmtHours((totalHoursSecs - availableHours * 3600))}` :
              usedPct > 90 ? '🟡 Capacidade no limite' : '🟢 Capacidade OK'}
          </div>
        </div>
      </div>

      {/* Prazo do lote */}
      {(maxDays > 0 || startDate) && (
        <div className="card" style={{ background: endDate ? '#f0fdf4' : '#f8fafc', borderColor: endDate ? '#86efac' : '#e2e8f0' }}>
          <div className="card-title">📅 Prazo do Lote</div>
          <div className="g2" style={{ gap: 10 }}>
            <div className="stat">
              <div className="stat-label">Dias para concluir</div>
              <div style={{ fontWeight: 700, fontSize: 18, color: '#1d4ed8' }}>{maxDays > 0 ? Math.ceil(maxDays) : '–'}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Início</div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{startDate ? fmtD(startDate) : '—'}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Término previsto</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#15803d' }}>{endDate ? fmtD(endDate) : '—'}</div>
            </div>
          </div>
          {!lot.start_date && maxDays > 0 && (
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>Defina a data de início para ver o prazo.</div>
          )}
        </div>
      )}

      {/* Tabela produção */}
      <div className="card">
        <div className="card-title">🪡 Itens de Produção</div>
        <div className="scroll-x">
          <table className="tbl">
            <thead><tr><th>REF</th><th>Descrição</th><th>R$/pç</th><th>Tempo</th><th>Qtd</th><th>H.Total</th><th>Total R$</th><th></th></tr></thead>
            <tbody>
              {items.map(item => {
                const itemSecs = parseTimeSecs(item.time_per_piece) * (parseInt(item.quantity) || 0)
                return (
                  <tr key={item.id}>
                    <td><input className="tbl-input" style={{ width: 50 }} value={item.ref || ''} onChange={e => setItemField(item, 'ref', e.target.value)} /></td>
                    <td><input className="tbl-input" style={{ width: 100 }} value={item.description || ''} onChange={e => setItemField(item, 'description', e.target.value)} /></td>
                    <td><input className="tbl-input" style={{ width: 60 }} type="number" inputMode="decimal" value={item.value || ''} onChange={e => setItemField(item, 'value', parseFloat(e.target.value) || 0)} /></td>
                    <td><input className="tbl-input" style={{ width: 70 }} placeholder="01:00:00" value={item.time_per_piece || ''} onChange={e => setItemField(item, 'time_per_piece', e.target.value)} /></td>
                    <td><input className="tbl-input" style={{ width: 40 }} type="number" inputMode="numeric" value={item.quantity || ''} onChange={e => setItemField(item, 'quantity', parseInt(e.target.value) || 0)} /></td>
                    <td style={{ fontSize: 11, color: '#64748b' }}>{fmtHours(itemSecs)}</td>
                    <td style={{ fontWeight: 600 }}>{R$((item.value || 0) * (item.quantity || 0))}</td>
                    <td><button onClick={() => deleteItem(lotIdx, item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>🗑</button></td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} style={{ textAlign: 'right', fontWeight: 600 }}>TOTAL</td>
                <td></td>
                <td style={{ fontWeight: 700, color: '#1d4ed8', fontSize: 12 }}>{fmtHours(totalHoursSecs)}</td>
                <td style={{ fontWeight: 700, color: '#15803d' }}>{R$(totalProd)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
        <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => addLotItem(lotIdx)}>+ Peça</button>
      </div>

      {/* Gastos */}
      <div className="card">
        <div className="card-title">💸 Gastos do Lote</div>
        <div className="scroll-x">
          <table className="tbl">
            <thead><tr><th>Data</th><th>Descrição</th><th>Valor</th><th></th></tr></thead>
            <tbody>
              {expenses.map(e => (
                <tr key={e.id}>
                  <td style={{ fontSize: 11 }}>{e.date}</td>
                  <td>{e.description}</td>
                  <td style={{ fontWeight: 600, color: '#dc2626' }}>{R$(e.value)}</td>
                  <td><button onClick={() => deleteExpense(lotIdx, e.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>🗑</button></td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td colSpan={2} style={{ textAlign: 'right' }}>TOTAL GASTOS</td><td colSpan={2} style={{ fontWeight: 700, color: '#dc2626' }}>{R$(totalExp)}</td></tr></tfoot>
          </table>
        </div>
        <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => addExpense(lotIdx)}>+ Gasto</button>
      </div>

      {/* Costureiras */}
      <div className="card">
        <div className="card-title">👥 Funcionários / Costureiras</div>
        {workerAnalysis.map(({ worker: w, wi, workerHoursSecs, earned, daysNeeded, dailyEarned, dailyRate, isUnderMin }) => (
          <div key={w.id} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '0.5px solid #e2e8f0' }}>
            {/* Cabeçalho */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{w.name}</div>
                {isUnderMin && <span style={{ fontSize: 11, background: '#fef2f2', color: '#dc2626', borderRadius: 4, padding: '2px 6px', fontWeight: 600 }}>⚠ Abaixo do mínimo</span>}
              </div>
              <button onClick={() => deleteWorker(lotIdx, w.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 16 }}
                title="Excluir colaborador">🗑</button>
            </div>
            {/* Mínimo/dia */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <label className="label" style={{ margin: 0, whiteSpace: 'nowrap' }}>Mínimo/dia (R$):</label>
              <input className="input" type="number" inputMode="decimal"
                value={w.daily_rate || ''} placeholder="0,00"
                style={{ maxWidth: 110, fontSize: 12, padding: '6px 8px' }}
                onChange={e => updateWorker(lotIdx, wi, w.id, { daily_rate: parseFloat(e.target.value) || 0 })} />
            </div>
            {/* % por peça */}
            {items.map(item => {
              const pctVal = parseFloat((w.worker_items || []).find(x => x.lot_item_ref === item.ref)?.value || 0)
              const itemTotal = (parseFloat(item.value) || 0) * (parseInt(item.quantity) || 0)
              const itemSecs = parseTimeSecs(item.time_per_piece) * (parseInt(item.quantity) || 0)
              const earned_item = (pctVal / 100) * itemTotal
              const secs_item = (pctVal / 100) * itemSecs
              return (
                <div key={item.ref} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6, fontSize: 12 }}>
                  <span style={{ width: 44, color: '#64748b', flexShrink: 0 }}>{item.ref}</span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#374151' }}>{item.description}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                    <input className="input" type="number" inputMode="decimal"
                      value={pctVal || ''} placeholder="0"
                      style={{ width: 54, fontSize: 12, padding: '5px 6px', textAlign: 'right' }}
                      onChange={e => updateWorkerItem(lotIdx, wi, item.ref, parseFloat(e.target.value) || 0)} />
                    <span style={{ color: '#64748b' }}>%</span>
                  </div>
                  <span style={{ color: '#15803d', width: 66, textAlign: 'right', flexShrink: 0, fontWeight: 600 }}>{R$(earned_item)}</span>
                  <span style={{ color: '#94a3b8', width: 60, textAlign: 'right', flexShrink: 0 }}>{secs_item > 0 ? fmtHours(secs_item) : ''}</span>
                </div>
              )
            })}
            {/* Resumo do colaborador */}
            <div style={{ background: isUnderMin ? '#fef2f2' : '#f0fdf4', borderRadius: 8, padding: '10px 12px', marginTop: 10 }}>
              <div className="g2" style={{ gap: 8 }}>
                <div className="stat" style={{ background: 'transparent' }}>
                  <div className="stat-label">Total ganho</div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#15803d' }}>{R$(earned)}</div>
                </div>
                <div className="stat" style={{ background: 'transparent' }}>
                  <div className="stat-label">Horas totais</div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{fmtHours(workerHoursSecs)}</div>
                </div>
                <div className="stat" style={{ background: 'transparent' }}>
                  <div className="stat-label">Dias necessários</div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#1d4ed8' }}>{daysNeeded > 0 ? daysNeeded.toFixed(1) : '–'}</div>
                </div>
                <div className="stat" style={{ background: 'transparent' }}>
                  <div className="stat-label">Ganho/dia</div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: isUnderMin ? '#dc2626' : '#15803d' }}>
                    {dailyEarned > 0 ? R$(dailyEarned) : '–'}
                    {dailyRate > 0 && <span style={{ fontSize: 11, marginLeft: 4, opacity: 0.8 }}>/ mín {R$(dailyRate)}</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="input" placeholder="Nome da costureira" value={newWorkerName} onChange={e => setNewWorkerName(e.target.value)} style={{ flex: 1 }} />
          <button className="btn btn-dark btn-sm" onClick={() => { if (newWorkerName.trim()) { addWorker(lotIdx, newWorkerName.trim()); setNewWorkerName('') } }}>+ Adicionar</button>
        </div>
      </div>

      {/* Relatório de capacidade por colaborador */}
      {workerAnalysis.length > 0 && totalHoursSecs > 0 && (
        <div className="card">
          <div className="card-title">📋 Relatório de Capacidade</div>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>
            Distribuição das horas do lote ({fmtHours(totalHoursSecs)} totais)
          </div>
          {workerAnalysis.map(({ worker: w, workerHoursSecs: wSecs, daysNeeded, dailyEarned, dailyRate, isUnderMin }) => {
            const pctOfTotal = totalHoursSecs > 0 ? (wSecs / totalHoursSecs) * 100 : 0
            return (
              <div key={w.id} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>{w.name}</span>
                  <span style={{ color: '#64748b' }}>{fmtHours(wSecs)} · {daysNeeded.toFixed(1)} dias</span>
                </div>
                <div className="prog">
                  <div className="prog-fill" style={{
                    width: `${Math.min(100, pctOfTotal)}%`,
                    background: isUnderMin ? '#ef4444' : '#22c55e'
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginTop: 3 }}>
                  <span>{pctOfTotal.toFixed(0)}% do tempo total</span>
                  <span style={{ color: isUnderMin ? '#dc2626' : '#64748b', fontWeight: isUnderMin ? 700 : 400 }}>
                    {dailyEarned > 0 ? `${R$(dailyEarned)}/dia` : ''}
                    {isUnderMin ? ` ⚠ abaixo do mín (${R$(dailyRate)})` : ''}
                  </span>
                </div>
              </div>
            )
          })}
          {/* Referência: menor ganhador */}
          {minEarner && (
            <div style={{ background: '#fef3c7', borderRadius: 8, padding: '8px 10px', fontSize: 12, marginTop: 4 }}>
              <b>Referência (menor ganho/dia):</b> {minEarner.worker.name} · {R$(minEarner.dailyEarned)}/dia
              {minEarner.isUnderMin && ` — ⚠ abaixo do mínimo definido (${R$(minEarner.dailyRate)})`}
            </div>
          )}
        </div>
      )}

      {/* Resumo Financeiro Real */}
      <div className="card">
        <div className="card-title">💰 Resumo Financeiro Real</div>
        {/* Linha detalhada */}
        {[
          { label: 'Receita bruta (lote)', val: totalProd, color: '#15803d' },
          { label: '(-) Custo colaboradores', val: -totalWorkerCost, color: '#dc2626' },
          { label: '(-) Outros gastos', val: -totalExp, color: '#dc2626' },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: '0.5px solid #f1f5f9' }}>
            <span style={{ color: '#64748b' }}>{label}</span>
            <span style={{ fontWeight: 600, color }}>{R$(Math.abs(val))}</span>
          </div>
        ))}
        {/* Resultado */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginTop: 10, padding: '12px', borderRadius: 10,
          background: trueProfit >= 0 ? '#dcfce7' : '#fef2f2',
          border: `1.5px solid ${trueProfit >= 0 ? '#86efac' : '#fca5a5'}`
        }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>
            {trueProfit >= 0 ? '✅ LUCRO REAL' : '❌ PREJUÍZO'}
          </span>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 700, fontSize: 18, color: trueProfit >= 0 ? '#15803d' : '#dc2626' }}>{R$(trueProfit)}</div>
            {maxDays > 0 && <div style={{ fontSize: 12, color: '#64748b' }}>{R$(trueProfitPerDay)}/dia · {maxDays > 0 ? Math.ceil(maxDays) : 0} dias</div>}
          </div>
        </div>
        {totalWorkerCost > 0 && totalProd > 0 && (
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <div className="stat" style={{ flex: 1 }}>
              <div className="stat-label">Margem real</div>
              <div style={{ fontWeight: 700, color: trueProfit >= 0 ? '#15803d' : '#dc2626' }}>{pct((trueProfit / totalProd) * 100)}</div>
            </div>
            <div className="stat" style={{ flex: 1 }}>
              <div className="stat-label">% colaboradores</div>
              <div style={{ fontWeight: 700, color: '#b45309' }}>{pct((totalWorkerCost / totalProd) * 100)}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── DRE TAB ────────────────────────────────────────────────
const DRE_STRUCTURE = [
  { key: 'rec_bruta', label: 'RECEITA BRUTA', type: 'input', rows: true },
  { key: 'deducoes', label: '(-) DEDUÇÕES', type: 'input', rows: true },
  { key: 'rec_liq', label: '(=) RECEITA LÍQUIDA', type: 'calc', color: '#dcfce7' },
  { key: 'cmv', label: '(-) CMV (Facção)', type: 'auto', color: '#fef3c7' },
  { key: 'lucro_bruto', label: '(=) LUCRO BRUTO', type: 'calc', color: '#dcfce7' },
  { key: 'desp_op', label: '(-) DESPESAS OPERACIONAIS', type: 'input', rows: true },
  { key: 'ebitda', label: '(=) EBITDA', type: 'calc', color: '#dcfce7' },
  { key: 'desp_fin', label: '(-) DESPESAS FINANCEIRAS', type: 'input' },
  { key: 'rec_fin', label: '(+) RECEITAS FINANCEIRAS', type: 'input' },
  { key: 'lair', label: '(=) LAIR', type: 'calc', color: '#dcfce7' },
  { key: 'ir', label: '(-) IR e CSLL', type: 'input' },
  { key: 'lucro_liq', label: '(=) LUCRO LÍQUIDO', type: 'calc', color: '#dcfce7', big: true },
]

function DreTab({ lots, userId }) {
  const now = new Date()
  const [period, setPeriod] = useState(`${MONTHS[now.getMonth()]}/${now.getFullYear()}`)
  const [dre, setDre] = useState({
    rec_bruta: [{ desc: 'Receita principal', val: 0 }],
    deducoes: [{ desc: 'Devoluções', val: 0 }],
    desp_op: [{ desc: 'Despesas gerais', val: 0 }],
    desp_fin: 0, rec_fin: 0, ir: 0,
  })
  const [saving, setSaving] = useState(false)
  const { addToast, state } = useApp()

  const cmv = (lots[0]?.lot_items || []).reduce((s, i) => s + (i.value || 0) * (i.quantity || 0), 0)

  const calcDRE = () => {
    const rec_bruta = (dre.rec_bruta || []).reduce((s, r) => s + (parseFloat(r.val) || 0), 0)
    const deducoes = (dre.deducoes || []).reduce((s, r) => s + (parseFloat(r.val) || 0), 0)
    const rec_liq = rec_bruta - deducoes
    const lucro_bruto = rec_liq - cmv
    const desp_op = (dre.desp_op || []).reduce((s, r) => s + (parseFloat(r.val) || 0), 0)
    const ebitda = lucro_bruto - desp_op
    const lair = ebitda - (parseFloat(dre.desp_fin) || 0) + (parseFloat(dre.rec_fin) || 0)
    const lucro_liq = lair - (parseFloat(dre.ir) || 0)
    return { rec_bruta, deducoes, rec_liq, lucro_bruto, desp_op, ebitda, lair, lucro_liq }
  }
  const calc = calcDRE()

  const setRow = (key, idx, field, val) => {
    setDre(d => ({
      ...d,
      [key]: d[key].map((r, i) => i === idx ? { ...r, [field]: val } : r),
    }))
  }

  const addRow = (key) => setDre(d => ({ ...d, [key]: [...(d[key] || []), { desc: '', val: 0 }] }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await dreAPI.upsert(userId, period, { ...dre, ...calc, cmv })
      addToast('DRE salva!')
    } catch { addToast('Erro ao salvar', 'error') }
    setSaving(false)
  }

  const barData = [
    { name: 'Receita Bruta', val: calc.rec_bruta },
    { name: 'Deduções', val: -calc.deducoes },
    { name: 'CMV', val: -cmv },
    { name: 'Desp.Op', val: -calc.desp_op },
    { name: 'EBITDA', val: calc.ebitda },
  ].filter(d => d.val !== 0)

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontWeight: 700 }}>Período</div>
          <input className="input" style={{ width: 140 }} placeholder="Mês/Ano" value={period} onChange={e => setPeriod(e.target.value)} />
        </div>

        {DRE_STRUCTURE.map(row => {
          if (row.type === 'input' && row.rows) {
            return (
              <div key={row.key} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>{row.label}</div>
                {(dre[row.key] || []).map((r, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                    <input className="input" style={{ flex: 1 }} placeholder="Descrição" value={r.desc} onChange={e => setRow(row.key, i, 'desc', e.target.value)} />
                    <input className="input" style={{ width: 100 }} type="number" inputMode="decimal" placeholder="0" value={r.val || ''} onChange={e => setRow(row.key, i, 'val', e.target.value)} />
                  </div>
                ))}
                <button className="btn btn-ghost btn-sm" onClick={() => addRow(row.key)}>+ linha</button>
              </div>
            )
          }
          if (row.type === 'input') {
            return (
              <div key={row.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 13, color: '#64748b' }}>{row.label}</span>
                <input className="input" style={{ width: 120 }} type="number" inputMode="decimal"
                  value={dre[row.key] || ''} onChange={e => setDre(d => ({ ...d, [row.key]: e.target.value }))} />
              </div>
            )
          }
          if (row.type === 'auto') {
            return (
              <div key={row.key} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: row.color, borderRadius: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{row.label}</span>
                <span style={{ fontWeight: 700, color: '#dc2626' }}>{R$(cmv)}</span>
              </div>
            )
          }
          // calc
          const val = calc[row.key]
          return (
            <div key={row.key} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: row.color, borderRadius: 8, marginBottom: 10 }}>
              <span style={{ fontSize: row.big ? 15 : 13, fontWeight: 700 }}>{row.label}</span>
              <span style={{ fontSize: row.big ? 18 : 14, fontWeight: 700, color: val >= 0 ? '#15803d' : '#dc2626' }}>{R$(val)}</span>
            </div>
          )
        })}
      </div>

      {barData.length > 0 && (
        <div className="card">
          <div className="card-title">Cascata DRE</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={barData}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={v => [R$(Math.abs(v)), '']} />
              <Bar dataKey="val" fill="#22c55e">
                {barData.map((entry, i) => <Cell key={i} fill={entry.val >= 0 ? '#22c55e' : '#ef4444'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <button className="btn btn-dark btn-full" onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : '💾 Salvar DRE'}</button>

      {/* Integração ao Orçamento Pessoal */}
      <div className="card" style={{ marginTop: 12 }}>
        <div className="card-title">💼 Integrar ao Orçamento Pessoal</div>
        <div style={{ fontSize: 13, color: 'var(--text-sub)', marginBottom: 12, lineHeight: 1.6 }}>
          Adicione o Lucro Líquido mensal do negócio à sua renda pessoal para cálculo de comprometimento.
          <br /><b style={{ color: 'var(--text)' }}>Lucro Líquido: {R$(calc.lucro_liq)}</b>
        </div>
        <button className="btn btn-green btn-full" onClick={() => {
          const val = calc.lucro_liq > 0 ? calc.lucro_liq : 0
          localStorage.setItem('businessMonthlyIncome', String(val))
          addToast(val > 0 ? `✓ Renda do negócio integrada: ${R$(val)}/mês` : 'Renda zerada (lucro negativo)', val > 0 ? 'success' : 'error')
        }}>
          💼 Integrar {R$(Math.max(0, calc.lucro_liq))}/mês ao Orçamento
        </button>
        {parseFloat(localStorage.getItem('businessMonthlyIncome') || '0') > 0 && (
          <button className="btn btn-ghost btn-full" style={{ marginTop: 8 }} onClick={() => {
            localStorage.removeItem('businessMonthlyIncome')
            addToast('Renda do negócio removida do orçamento', 'info')
          }}>
            ✕ Remover integração
          </button>
        )}
      </div>
    </div>
  )
}

// ─── VPL TAB ────────────────────────────────────────────────
function VplTab({ userId }) {
  const { state, upsertVPL, deleteVPL, addToast } = useApp()
  const { vplProjects } = state
  const [form, setForm] = useState({ name: 'Novo Projeto', investment: 50000, rate: 1.5, periods: 12 })
  const [flows, setFlows] = useState(Array.from({ length: 12 }, (_, i) => ({ receitas: 0, custos: 0 })))
  const [sens, setSens] = useState({ tma: 0, receitas: 0, custos: 0 })
  const [saving, setSaving] = useState(false)

  const fcsLiq = flows.map(f => (parseFloat(f.receitas) || 0) - (parseFloat(f.custos) || 0))

  const adjustedFlows = fcsLiq.map((fc, i) => {
    const r = (parseFloat(flows[i].receitas) || 0) * (1 + sens.receitas / 100)
    const c = (parseFloat(flows[i].custos) || 0) * (1 + sens.custos / 100)
    return r - c
  })
  const adjRate = parseFloat(form.rate) + parseFloat(sens.tma)
  const vpl = calcVPL(form.investment, adjustedFlows, adjRate)
  const tir = fcsLiq.some(f => f !== 0) ? calcTIR(form.investment, adjustedFlows) : 0
  const payback = calcPayback(form.investment, fcsLiq)
  const il = calcIL(form.investment, adjustedFlows, adjRate)

  const handlePeriods = (n) => {
    const num = parseInt(n) || 0
    setFlows(Array.from({ length: num }, (_, i) => flows[i] || { receitas: 0, custos: 0 }))
    setForm(f => ({ ...f, periods: num }))
  }

  const replicateFirst = () => {
    const first = flows[0] || { receitas: 0, custos: 0 }
    setFlows(flows.map(() => ({ ...first })))
  }

  const handleSave = async () => {
    setSaving(true)
    await upsertVPL({ ...form, cash_flows: flows })
    setSaving(false)
  }

  const chartData = flows.map((f, i) => {
    const fc = fcsLiq.slice(0, i + 1).reduce((s, x) => s + x, 0) - form.investment
    const r = parseFloat(form.rate) / 100
    const pv = fcsLiq[i] / Math.pow(1 + r, i + 1)
    return { mes: `M${i + 1}`, fc, pv }
  })

  return (
    <div>
      {/* Form */}
      <div className="card">
        <div className="card-title">Novo Projeto VPL</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div><label className="label">Nome</label><input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div className="g2">
            <div><label className="label">Investimento (R$)</label><input className="input" type="number" value={form.investment} onChange={e => setForm(f => ({ ...f, investment: parseFloat(e.target.value) || 0 }))} /></div>
            <div><label className="label">TMA (%/mês)</label><input className="input" type="number" step="0.1" value={form.rate} onChange={e => setForm(f => ({ ...f, rate: parseFloat(e.target.value) || 0 }))} /></div>
          </div>
          <div><label className="label">Períodos (meses)</label><input className="input" type="number" value={form.periods} onChange={e => handlePeriods(e.target.value)} /></div>
        </div>
      </div>

      {/* Fluxo de caixa */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div className="card-title" style={{ marginBottom: 0 }}>Fluxo de Caixa</div>
          <button className="btn btn-ghost btn-sm" onClick={replicateFirst}>Replicar mês 1</button>
        </div>
        <div className="scroll-x">
          <table className="tbl">
            <thead><tr><th>Mês</th><th>Receitas</th><th>Custos</th><th>FC Líq.</th><th>FC Desc.</th></tr></thead>
            <tbody>
              {flows.map((f, i) => {
                const r = parseFloat(form.rate) / 100
                const fcLiq = (parseFloat(f.receitas) || 0) - (parseFloat(f.custos) || 0)
                const fcDesc = fcLiq / Math.pow(1 + r, i + 1)
                return (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{i + 1}</td>
                    <td><input className="tbl-input" style={{ width: 80 }} type="number" inputMode="decimal" value={f.receitas || ''} onChange={e => setFlows(fl => fl.map((x, j) => j === i ? { ...x, receitas: e.target.value } : x))} /></td>
                    <td><input className="tbl-input" style={{ width: 80 }} type="number" inputMode="decimal" value={f.custos || ''} onChange={e => setFlows(fl => fl.map((x, j) => j === i ? { ...x, custos: e.target.value } : x))} /></td>
                    <td style={{ fontWeight: 600, color: fcLiq >= 0 ? '#15803d' : '#dc2626' }}>{R$(fcLiq)}</td>
                    <td style={{ color: '#64748b', fontSize: 11 }}>{R$(fcDesc)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resultados */}
      <div className="g2" style={{ marginBottom: 12 }}>
        <div className="stat"><div className="stat-label">VPL</div><div className="stat-value" style={{ fontSize: 16, color: vpl >= 0 ? '#15803d' : '#dc2626' }}>{R$(vpl)}</div></div>
        <div className="stat"><div className="stat-label">TIR</div><div className="stat-value" style={{ fontSize: 16 }}>{pct(tir, 2)}</div></div>
        <div className="stat"><div className="stat-label">Payback</div><div className="stat-value" style={{ fontSize: 16 }}>{payback ? `${payback}m` : '–'}</div></div>
        <div className="stat"><div className="stat-label">IL</div><div className="stat-value" style={{ fontSize: 16, color: il >= 1 ? '#15803d' : '#dc2626' }}>{il.toFixed(2)}</div></div>
      </div>

      <div className="card" style={{ textAlign: 'center', background: vpl >= 0 ? '#dcfce7' : '#fef2f2', borderColor: vpl >= 0 ? '#22c55e' : '#ef4444' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: vpl >= 0 ? '#15803d' : '#dc2626' }}>
          {vpl >= 0 ? '✅ PROJETO VIÁVEL' : '❌ PROJETO INVIÁVEL'}
        </div>
        <div style={{ fontSize: 12, marginTop: 4, color: '#64748b' }}>VPL {vpl >= 0 ? 'positivo' : 'negativo'} · TIR {pct(tir, 2)} · IL {il.toFixed(2)}</div>
      </div>

      {/* Gráfico */}
      {chartData.length > 0 && (
        <div className="card">
          <div className="card-title">Evolução do FC</div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData}>
              <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={v => [R$(v), '']} />
              <ReferenceLine y={0} stroke="#64748b" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="fc" stroke="#3b82f6" strokeWidth={2} dot={false} name="FC Acum." />
              <Line type="monotone" dataKey="pv" stroke="#22c55e" strokeWidth={2} dot={false} name="FC Desc." />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Sensibilidade */}
      <div className="card">
        <div className="card-title">Análise de Sensibilidade</div>
        {[['tma', 'TMA (%)', -5, 5], ['receitas', 'Receitas (%)', -20, 20], ['custos', 'Custos (%)', -20, 20]].map(([key, label, min, max]) => (
          <div key={key} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
              <span>{label}</span><span style={{ fontWeight: 600 }}>{sens[key] > 0 ? '+' : ''}{sens[key]}%</span>
            </div>
            <input type="range" min={min} max={max} step={0.5} value={sens[key]}
              onChange={e => setSens(s => ({ ...s, [key]: parseFloat(e.target.value) }))}
              style={{ width: '100%' }} />
          </div>
        ))}
        <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, color: vpl >= 0 ? '#15803d' : '#dc2626' }}>
          VPL ajustado: {R$(vpl)}
        </div>
      </div>

      <button className="btn btn-dark btn-full" onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : '💾 Salvar Projeto'}</button>

      {/* Lista projetos */}
      {vplProjects.length > 0 && (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="card-title">Projetos Salvos</div>
          {vplProjects.map(p => {
            const fcs = (p.cash_flows || []).map(f => (f.receitas || 0) - (f.custos || 0))
            const v = calcVPL(p.investment, fcs, p.rate)
            return (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '0.5px solid #e2e8f0' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Inv: {R$(p.investment)} · VPL: <span style={{ color: v >= 0 ? '#15803d' : '#dc2626' }}>{R$(v)}</span></div>
                </div>
                <button onClick={() => { if (window.confirm('Excluir?')) deleteVPL(p.id) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>🗑</button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── MAIN ────────────────────────────────────────────────────
export default function NegocioScreen() {
  const { state, dispatch, addLot, addToast } = useApp()
  const { lots, activeLotIdx, activeNegTab, user } = state
  const [newLotName, setNewLotName] = useState('')
  const [showNewLot, setShowNewLot] = useState(false)

  const lot = lots[activeLotIdx]

  return (
    <div>
      <div className="hdr hdr-slate">
        <h1>Módulo Negócio</h1>
        <p>Facções · DRE · VPL</p>
      </div>

      <div style={{ padding: '0 16px' }}>
        <div className="tabs" style={{ marginTop: 12 }}>
          {[['faccoes', 'Facções'], ['dre', 'DRE'], ['vpl', 'VPL/TIR']].map(([id, label]) => (
            <button key={id} className={`tab${activeNegTab === id ? ' active' : ''}`}
              onClick={() => dispatch({ type: 'SET_NEG_TAB', tab: id })}>{label}</button>
          ))}
        </div>

        {activeNegTab === 'faccoes' && (
          <>
            {/* Seletor de lotes */}
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 12 }}>
              {lots.map((l, i) => (
                <button key={l.id} onClick={() => dispatch({ type: 'SET_LOT_IDX', idx: i })}
                  className={`btn btn-sm ${i === activeLotIdx ? 'btn-dark' : 'btn-ghost'}`} style={{ whiteSpace: 'nowrap' }}>
                  {l.name}
                </button>
              ))}
              {!showNewLot ? (
                <button className="btn btn-ghost btn-sm" onClick={() => setShowNewLot(true)} style={{ whiteSpace: 'nowrap' }}>+ Novo Lote</button>
              ) : (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input className="input" style={{ width: 120 }} placeholder="Nome do lote" value={newLotName} onChange={e => setNewLotName(e.target.value)} />
                  <button className="btn btn-dark btn-sm" onClick={() => { if (newLotName.trim()) { addLot(newLotName.trim()); setNewLotName(''); setShowNewLot(false) } }}>✓</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowNewLot(false)}>✗</button>
                </div>
              )}
            </div>

            {lot ? <FaccoesTab lot={lot} lotIdx={activeLotIdx} /> : (
              <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                <div style={{ fontSize: 40 }}>🪡</div>
                <div style={{ marginTop: 8 }}>Nenhum lote criado</div>
                <button className="btn btn-dark" style={{ marginTop: 12 }} onClick={() => setShowNewLot(true)}>Criar primeiro lote</button>
              </div>
            )}
          </>
        )}

        {activeNegTab === 'dre' && <DreTab lots={lots} userId={user?.id} />}
        {activeNegTab === 'vpl' && <VplTab userId={user?.id} />}
      </div>
    </div>
  )
}
