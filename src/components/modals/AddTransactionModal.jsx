import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { CATS_EXPENSE, CATS_INCOME, ACCOUNTS, todayStr, R$ } from '../../utils/formatters'

const TYPES = [
  { id: 'expense', label: 'Despesa', color: '#ef4444' },
  { id: 'income', label: 'Receita', color: '#22c55e' },
  { id: 'transfer', label: 'Transferência', color: '#3b82f6' },
]

const PARCELAS = Array.from({ length: 24 }, (_, i) => i + 1)

// Presets de categorias sugeridas
const PRESETS_EXPENSE = [
  { icon: '🏠', label: 'Casa', category: 'Habitação', hint: 'Aluguel / Condomínio / Energia' },
  { icon: '🛒', label: 'Mercado', category: 'Supermercado', hint: 'Supermercado / Feira' },
  { icon: '🚗', label: 'Transporte', category: 'Transporte', hint: 'Combustível / Uber / Ônibus' },
  { icon: '💊', label: 'Saúde', category: 'Saúde', hint: 'Plano / Medicamento / Consulta' },
  { icon: '🍽️', label: 'Alim. Fora', category: 'Alimentação', hint: 'Restaurante / Lanche' },
  { icon: '💇', label: 'Beleza', category: 'Outros', hint: 'Cabelo / Salão / Barbearia' },
  { icon: '🏥', label: 'Médico', category: 'Saúde', hint: 'Dentista / Psicólogo / Exames' },
  { icon: '👨‍👩‍👧', label: 'Família', category: 'Outros', hint: 'Filhos / Dependentes' },
  { icon: '🎓', label: 'Educação', category: 'Educação', hint: 'Cursos / Livros / Faculdade' },
  { icon: '🐾', label: 'Pet', category: 'Pet', hint: 'Ração / Vet / Banho e Tosa' },
  { icon: '🧹', label: 'Serviços', category: 'Outros', hint: 'Diarista / Jardineiro / Babá' },
  { icon: '🏦', label: 'Financeiro', category: 'Outros', hint: 'Tarifas / Conta / Cartão' },
  { icon: '📄', label: 'Impostos', category: 'Outros', hint: 'IPTU / IPVA / IR' },
  { icon: '🛡️', label: 'Seguros', category: 'Seguros', hint: 'Vida / Auto / Residência' },
  { icon: '💳', label: 'Dívidas', category: 'Outros', hint: 'Financiamento / Empréstimo' },
  { icon: '🎬', label: 'Lazer', category: 'Lazer', hint: 'Cinema / Shows / Passeios' },
  { icon: '👕', label: 'Roupas', category: 'Outros', hint: 'Moda / Calçados / Acessórios' },
  { icon: '✈️', label: 'Viagem', category: 'Lazer', hint: 'Hotel / Passagem / Excursão' },
  { icon: '📱', label: 'Assinaturas', category: 'Assinaturas', hint: 'Netflix / Spotify / Apps' },
  { icon: '🎁', label: 'Presentes', category: 'Outros', hint: 'Aniversário / Doações' },
]

const PRESETS_INCOME = [
  { icon: '💼', label: 'Salário', category: 'Trabalho', hint: 'Salário / CLT / PJ' },
  { icon: '🏢', label: 'Empresa', category: 'Trabalho', hint: 'Pró-labore / Lucro' },
  { icon: '🏘️', label: 'Aluguel', category: 'Renda Extra', hint: 'Aluguel recebido' },
  { icon: '📈', label: 'Investimento', category: 'Investimentos', hint: 'Dividendos / Rendimentos' },
  { icon: '🛠️', label: 'Freelance', category: 'Renda Extra', hint: 'Freela / Serviço avulso' },
  { icon: '🎯', label: 'Bônus', category: 'Renda Extra', hint: 'Comissão / 13º / PLR' },
]

export default function AddTransactionModal() {
  const { dispatch, addTx, state } = useApp()
  const [type, setType] = useState('expense')
  const [form, setForm] = useState(() => {
    let defaultDate = todayStr()
    try { const stored = localStorage.getItem('addTxDefaultDate'); if (stored) { defaultDate = stored; localStorage.removeItem('addTxDefaultDate') } } catch(e) {}
    return { description: '', value: '', date: defaultDate, category: 'Alimentação', account: 'Dinheiro', paid: true, notes: '', installments: 1, person: '' }
  })
  const [loading, setLoading] = useState(false)
  const [showPresets, setShowPresets] = useState(true)

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

          {/* Presets */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label className="label" style={{ marginBottom: 0 }}>Sugestões rápidas</label>
              <button onClick={() => setShowPresets(v => !v)} style={{ background: 'none', border: 'none', fontSize: 11, color: '#64748b', cursor: 'pointer' }}>{showPresets ? 'ocultar ▲' : 'ver ▼'}</button>
            </div>
            {showPresets && (
              <div style={{ display: 'flex', overflowX: 'auto', gap: 6, paddingBottom: 4, scrollbarWidth: 'none' }}>
                {(type === 'income' ? PRESETS_INCOME : PRESETS_EXPENSE).map(p => (
                  <button key={p.label} onClick={() => { set('category', p.category); if (!form.description) set('description', p.hint) }}
                    style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, background: form.category === p.category ? 'rgba(139,92,246,0.25)' : 'rgba(255,255,255,0.06)', border: form.category === p.category ? '1px solid #8b5cf6' : '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '6px 10px', cursor: 'pointer', minWidth: 58 }}>
                    <span style={{ fontSize: 20 }}>{p.icon}</span>
                    <span style={{ fontSize: 10, color: '#e2e8f0', fontWeight: 600, whiteSpace: 'nowrap' }}>{p.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

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
