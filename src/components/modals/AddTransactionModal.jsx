import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { CATS_EXPENSE, CATS_INCOME, ACCOUNTS, todayStr, R$ } from '../../utils/formatters'

const TYPES = [
  { id: 'expense', label: 'Despesa', color: '#ef4444' },
  { id: 'income', label: 'Receita', color: '#22c55e' },
  { id: 'transfer', label: 'Transferência', color: '#3b82f6' },
]

const PARCELAS = Array.from({ length: 24 }, (_, i) => i + 1)

export default function AddTransactionModal() {
  const { dispatch, addTx, state } = useApp()
  const [type, setType] = useState('expense')
  const [form, setForm] = useState(() => {
    let defaultDate = todayStr()
    try { const stored = localStorage.getItem('addTxDefaultDate'); if (stored) { defaultDate = stored; localStorage.removeItem('addTxDefaultDate') } } catch(e) {}
    return { description: '', value: '', date: defaultDate, category: 'Alimentação', account: 'Dinheiro', paid: true, notes: '', installments: 1, person: '' }
  })
  const [loading, setLoading] = useState(false)

  const close = () => dispatch({ type: 'SET_MODAL', modal: null })

  const cats = type === 'income' ? CATS_INCOME : CATS_EXPENSE
  const typeColor = TYPES.find(t => t.id === type)?.color
  const isCredit = form.account === 'Cartão de Crédito'
  const parcVal = form.value && form.installments > 1 && isCredit
    ? form.installments + 'x de ' + R$(parseFloat(form.value) / form.installments)
    : ''

  const members = state.profile?.members || []

  const handleSave = async () => {
    if (!form.value || !form.description) return
    setLoading(true)
    const baseVal = parseFloat(form.value) || 0
    await addTx({
      type,
      description: form.description,
      value: baseVal,
      date: form.date,
      category: form.category,
      account: form.account,
      paid: type === 'income' ? true : (isCredit ? false : form.paid),
      notes: form.notes,
      installments: isCredit ? form.installments : 1,
      person: form.person || null,
      spending_type: null,
    })
    setLoading(false)
    close()
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="overlay" onClick={close}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />

        {/* Tipo */}
        <div className="tabs" style={{ marginBottom: 16 }}>
          {TYPES.map(t => (
            <button key={t.id} className={'tab' + (type === t.id ? ' active' : '')}
              style={type === t.id ? { background: t.color } : {}}
              onClick={() => {
                setType(t.id)
                set('category', t.id === 'income' ? 'Trabalho' : 'Alimentação')
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Valor */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>VALOR</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <span style={{ fontSize: 24, fontWeight: 700, color: typeColor }}>R$</span>
            <input
              type="number" inputMode="decimal" step="0.01" min="0"
              value={form.value}
              onChange={e => set('value', e.target.value)}
              placeholder="0,00"
              style={{ fontSize: 36, fontWeight: 700, color: typeColor, border: 'none', outline: 'none', width: 160, textAlign: 'center', fontFamily: 'inherit', background: 'transparent' }}
            />
          </div>
          {parcVal && <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>{parcVal}</div>}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          <div>
            <label className="label">Descrição</label>
            <input className="input" placeholder="Ex: Supermercado" value={form.description} onChange={e => set('description', e.target.value)} />
          </div>

          <div className="g2">
            <div>
              <label className="label">Data</label>
              <input className="input" type="date" value={form.date} onChange={e => set('date', e.target.value)} />
            </div>
            <div>
              <label className="label">Conta</label>
              <select className="input" value={form.account} onChange={e => {
                const acc = e.target.value
                setForm(f => ({ ...f, account: acc, paid: acc === 'Cartão de Crédito' ? false : f.paid }))
              }}>
                {ACCOUNTS.map(a => <option key={a}>{a}</option>)}
              </select>
            </div>
          </div>

          {isCredit && type === 'expense' && (
            <div>
              <label className="label">Parcelas (cartão)</label>
              <select className="input" value={form.installments} onChange={e => set('installments', parseInt(e.target.value))}>
                {PARCELAS.map(n => (
                  <option key={n} value={n}>
                    {n === 1 ? '1x (à vista)' : n + 'x' + (form.value ? ' de ' + R$(parseFloat(form.value) / n) : '')}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="label">Categoria</label>
            <select className="input" value={form.category} onChange={e => set('category', e.target.value)}>
              {cats.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          {members.length > 0 ? (
            <div>
              <label className="label">👤 Para quem?</label>
              <select className="input" value={form.person} onChange={e => set('person', e.target.value)}>
                <option value="">— Geral (todos) —</option>
                {members.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          ) : (
            <div>
              <label className="label">👤 Para quem? <span style={{ fontSize: 10, color: '#94a3b8' }}>(configure membros em Conta)</span></label>
              <input className="input" placeholder="Ex: Desedilson, Jackellyne..." value={form.person} onChange={e => set('person', e.target.value)} />
            </div>
          )}

          {type === 'expense' && (
            isCredit ? (
              <div style={{ fontSize: 12, color: '#f87171', background: 'rgba(248,113,113,0.1)', borderRadius: 8, padding: '8px 10px' }}>
                💳 Cartão de Crédito — aparece como <strong>pendente</strong> até você marcar como pago na fatura
              </div>
            ) : (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.paid} onChange={e => set('paid', e.target.checked)} style={{ width: 16, height: 16 }} />
                Já foi pago
              </label>
            )
          )}

          <div>
            <label className="label">Notas (opcional)</label>
            <input className="input" placeholder="Observações..." value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>

          <div className="g2" style={{ marginTop: 4 }}>
            <button className="btn btn-ghost btn-full" onClick={close}>Cancelar</button>
            <button className="btn btn-dark btn-full" onClick={handleSave} disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
