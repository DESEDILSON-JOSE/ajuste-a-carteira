import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { CATS_EXPENSE, CATS_INCOME, ACCOUNTS, todayStr, R$ } from '../../utils/formatters'

const TYPES = [
  { id: 'expense', label: 'Despesa', color: '#ef4444' },
  { id: 'income', label: 'Receita', color: '#22c55e' },
  { id: 'transfer', label: 'Transferência', color: '#3b82f6' },
]

const SPENDING_TYPES = [
  { id: 'essencial', icon: '🏠', label: 'Essências', sub: 'Anual (12×)', color: '#1d4ed8', bg: '#eff6ff' },
  { id: 'necessario', icon: '🛒', label: 'Necessários', sub: 'Único', color: '#15803d', bg: '#f0fdf4' },
  { id: 'util', icon: '🔧', label: 'Úteis', sub: 'Único', color: '#b45309', bg: '#fffbeb' },
  { id: 'desnecessario', icon: '⚠️', label: 'Desnecessários', sub: 'Único', color: '#dc2626', bg: '#fef2f2' },
]

const PARCELAS = Array.from({ length: 24 }, (_, i) => i + 1)
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

export default function AddTransactionModal() {
  const { dispatch, addTx, addToast, state } = useApp()
  const [type, setType] = useState('expense')
  const [spendingType, setSpendingType] = useState(null)
  const [form, setForm] = useState({
    description: '', value: '', date: todayStr(),
    category: 'Alimentação', account: 'Dinheiro', paid: true, notes: '',
    installments: 1, person: '',
  })
  const [loading, setLoading] = useState(false)

  const close = () => dispatch({ type: 'SET_MODAL', modal: null })

  const cats = type === 'income' ? CATS_INCOME : CATS_EXPENSE
  const typeColor = TYPES.find(t => t.id === type)?.color
  const isCredit = form.account === 'Cartão de Crédito'
  const parcVal = form.value && form.installments > 1
    ? `${form.installments}x de ${R$(parseFloat(form.value) / form.installments)}`
    : ''

  const members = state.profile?.members || []

  const handleSave = async () => {
    if (!form.value || !form.description) return
    setLoading(true)

    const baseVal = parseFloat(form.value) || 0

    // Essências = lança 12 meses recorrentes
    if (type === 'expense' && spendingType === 'essencial') {
      const year = new Date().getFullYear()
      const rid = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2)
      let ok = 0
      for (let m = 0; m < 12; m++) {
        const day = Math.min(parseInt(form.date.split('-')[2]) || 7, DAYS_IN_MONTH[m])
        const date = `${year}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        try {
          await addTx({
            type: 'expense',
            description: form.description,
            value: baseVal,
            date,
            category: form.category,
            account: form.account,
            paid: false,
            notes: form.notes || 'Essência fixa',
            recurring: true,
            recurring_id: rid,
            spending_type: 'essencial',
            person: form.person || null,
          })
          ok++
        } catch (_) {}
      }
      addToast(ok === 12 ? `${form.description}: 12 meses lançados!` : `${ok}/12 lançamentos criados`, ok === 12 ? 'success' : 'error')
      setLoading(false)
      close()
      return
    }

    // Demais tipos — lançamento único
    await addTx({
      type,
      description: form.description,
      value: baseVal,
      date: form.date,
      category: form.category,
      account: form.account,
      paid: type === 'income' ? true : form.paid,
      notes: form.notes,
      installments: isCredit ? form.installments : 1,
      person: form.person || null,
      spending_type: type === 'expense' ? spendingType : null,
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
            <button key={t.id} className={`tab${type === t.id ? ' active' : ''}`}
              style={type === t.id ? { background: t.color } : {}}
              onClick={() => {
                setType(t.id)
                setSpendingType(null)
                set('category', t.id === 'income' ? 'Trabalho' : 'Alimentação')
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Classificação de despesa */}
        {type === 'expense' && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, marginBottom: 8, letterSpacing: 0.5 }}>CLASSIFICAR COMO</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {SPENDING_TYPES.map(st => (
                <button key={st.id}
                  onClick={() => setSpendingType(prev => prev === st.id ? null : st.id)}
                  style={{
                    background: spendingType === st.id ? st.bg : 'var(--card)',
                    border: `1.5px solid ${spendingType === st.id ? st.color : 'transparent'}`,
                    borderRadius: 10, padding: '7px 4px', cursor: 'pointer', textAlign: 'center',
                    transition: 'all 0.15s',
                  }}>
                  <div style={{ fontSize: 18 }}>{st.icon}</div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: spendingType === st.id ? st.color : '#374151', lineHeight: 1.2, marginTop: 2 }}>{st.label}</div>
                  <div style={{ fontSize: 9, color: spendingType === st.id ? st.color : '#94a3b8', opacity: 0.85 }}>{st.sub}</div>
                </button>
              ))}
            </div>
            {spendingType === 'essencial' && (
              <div style={{ marginTop: 6, fontSize: 11, color: '#1d4ed8', background: '#eff6ff', borderRadius: 6, padding: '5px 10px' }}>
                🏠 Essência fixa — vai criar 12 lançamentos mensais para {new Date().getFullYear()} automaticamente
              </div>
            )}
          </div>
        )}

        {/* Valor */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>VALOR</div>
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
              <select className="input" value={form.account} onChange={e => set('account', e.target.value)}>
                {ACCOUNTS.map(a => <option key={a}>{a}</option>)}
              </select>
            </div>
          </div>

          {isCredit && type === 'expense' && (
            <div>
              <label className="label">Parcelas</label>
              <select className="input" value={form.installments} onChange={e => set('installments', parseInt(e.target.value))}>
                {PARCELAS.map(n => (
                  <option key={n} value={n}>
                    {n === 1 ? '1x (à vista)' : `${n}x${form.value ? ` de ${R$(parseFloat(form.value) / n)}` : ''}`}
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

          {type === 'expense' && spendingType !== 'essencial' && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.paid} onChange={e => set('paid', e.target.checked)} style={{ width: 16, height: 16 }} />
              Já foi pago
            </label>
          )}

          <div>
            <label className="label">Notas (opcional)</label>
            <input className="input" placeholder="Observações..." value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>

          <div className="g2" style={{ marginTop: 4 }}>
            <button className="btn btn-ghost btn-full" onClick={close}>Cancelar</button>
            <button className="btn btn-dark btn-full" onClick={handleSave} disabled={loading}>
              {loading ? 'Salvando...' : spendingType === 'essencial' ? '💾 Salvar 12 meses' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
