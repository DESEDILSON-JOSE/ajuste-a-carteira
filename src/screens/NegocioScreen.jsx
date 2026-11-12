import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, ReferenceLine, Cell } from 'recharts'
import { useApp } from '../context/AppContext'
import { R$, pct, todayStr, MONTHS } from '../utils/formatters'
import { calcVPL, calcTIR, calcPayback, calcIL } from '../utils/calculations'
import { dreAPI, vplAPI } from '../utils/api'
import { bizAPI } from '../utils/bizAPI'

// ─── CONSTANTS ──────────────────────────────────────────────
const BIZ_TYPES = ['MEI', 'Empresa', 'Autônomo', 'Facção', 'Freelancer', 'Startup', 'Comércio', 'Indústria']
const BIZ_SEGMENTS = ['Moda/Confecção', 'Alimentação', 'Tecnologia', 'Serviços Gerais', 'Comércio', 'Saúde/Bem-estar', 'Educação', 'Construção', 'Beleza/Estética', 'Transporte', 'Agropecuária', 'Outro']
const PAYMENT_METHODS = ['Pix', 'Dinheiro', 'Cartão Débito', 'Cartão Crédito', 'Transferência', 'Boleto', 'Cheque', 'Fiado']
const SALE_STATUS = { pending: { label: 'Pendente', color: '#f59e0b' }, paid: { label: 'Pago', color: '#4ade80' }, cancelled: { label: 'Cancelado', color: '#ef4444' } }
const CF_CATS_IN = ['Venda', 'Serviço', 'Comissão', 'Aluguel Recebido', 'Empréstimo', 'Outro']
const CF_CATS_OUT = ['Fornecedor', 'Aluguel', 'Salário', 'Marketing', 'Equipamento', 'Imposto/Taxa', 'Energia', 'Internet', 'Transporte', 'Outros']
const UNITS = ['un', 'kg', 'g', 'L', 'ml', 'm', 'm²', 'caixa', 'par', 'rolo', 'h']

const nowMonth = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
const monthLabel = (m) => {
  if (!m) return ''
  const [y, mo] = m.split('-')
  return `${MONTHS[parseInt(mo) - 1]}/${y}`
}
const monthOptions = () => {
  const opts = []
  for (let i = 0; i < 12; i++) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    opts.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return opts
}

// ─── VISÃO GERAL TAB ─────────────────────────────────────────
function VisaoGeralTab({ biz }) {
  const [selMonth, setSelMonth] = useState(nowMonth())
  const { profile, sales, cashflow } = biz
  const { state: appState } = useApp()

  const monthSales = useMemo(() => sales.filter(s => s.date?.startsWith(selMonth)), [sales, selMonth])
  const paidSales = useMemo(() => monthSales.filter(s => s.status === 'paid'), [monthSales])
  const cfMonth = useMemo(() => cashflow.filter(cf => cf.date?.startsWith(selMonth)), [cashflow, selMonth])

  const salesRevenue = paidSales.reduce((s, x) => s + (parseFloat(x.total) || 0), 0)
  const pendingRevenue = monthSales.filter(s => s.status === 'pending').reduce((s, x) => s + (parseFloat(x.total) || 0), 0)
  const cfIncome = cfMonth.filter(cf => cf.type === 'entrada').reduce((s, x) => s + (parseFloat(x.value) || 0), 0)
  const cfExpense = cfMonth.filter(cf => cf.type === 'saida').reduce((s, x) => s + (parseFloat(x.value) || 0), 0)

  // Facção lots for selected month
  const monthFaccoesLots = useMemo(() => {
    return appState.lots.map(l => {
      try { return { lot: l, meta: JSON.parse(localStorage.getItem(`lot_meta_${l.id}`) || '{}') } }
      catch (e) { return { lot: l, meta: {} } }
    }).filter(({ meta }) => (meta.entry_date || '').substring(0, 7) === selMonth)
  }, [appState.lots, selMonth])

  // Soma o total de todos os lotes do mês no Painel Negócio (não vai para o app financeiro)
  const faccaoRevenue = monthFaccoesLots.reduce((s, { meta: m }) =>
    s + (parseInt(m.qtd_pecas) || 0) * (parseFloat(m.valor_unitario) || 0), 0)

  const totalRevenue = salesRevenue + cfIncome + faccaoRevenue
  const lotExpenses = monthFaccoesLots.reduce((sum, { lot }) =>
    sum + (lot.lot_expenses || []).reduce((s, e) => s + (parseFloat(e.value) || 0), 0), 0)
  const totalExpense = cfExpense + lotExpenses
  const profit = totalRevenue - totalExpense
  const goal = parseFloat(profile?.monthly_goal) || 0
  const goalPct = goal > 0 ? Math.min(100, (totalRevenue / goal) * 100) : 0

  const productRevMap = {}
  paidSales.forEach(sale => {
    ;(sale.biz_sale_items || []).forEach(item => {
      const name = item.product_name || 'Sem nome'
      productRevMap[name] = (productRevMap[name] || 0) + (parseFloat(item.total) || 0)
    })
  })
  const topProducts = Object.entries(productRevMap)
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([name, value]) => ({ name: name.length > 14 ? name.slice(0, 14) + '…' : name, value }))

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <select className="input" value={selMonth} onChange={e => setSelMonth(e.target.value)}>
          {monthOptions().map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
        </select>
      </div>

      <div className="g2" style={{ marginBottom: 10, gap: 10 }}>
        <div style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>Faturamento</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#4ade80' }}>{R$(totalRevenue)}</div>
          {pendingRevenue > 0 && <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 2 }}>+ {R$(pendingRevenue)} pendente</div>}
        </div>
        <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>Despesas</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#f87171' }}>{R$(totalExpense)}</div>
        </div>
      </div>

      <div style={{ background: profit >= 0 ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)', border: `1px solid ${profit >= 0 ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`, borderRadius: 12, padding: '14px 16px', textAlign: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>Lucro Líquido</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: profit >= 0 ? '#4ade80' : '#f87171' }}>{R$(profit)}</div>
      </div>

      {goal > 0 && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
            <span>Meta mensal</span>
            <span style={{ fontWeight: 600 }}>{R$(totalRevenue)} / {R$(goal)}</span>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 100, height: 8, overflow: 'hidden' }}>
            <div style={{ background: goalPct >= 100 ? '#4ade80' : '#3b82f6', width: `${goalPct}%`, height: '100%', borderRadius: 100, transition: 'width 0.3s' }} />
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4, textAlign: 'right' }}>{goalPct.toFixed(0)}% da meta</div>
        </div>
      )}

      {topProducts.length > 0 && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="card-title">🏆 Top Produtos/Serviços</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={topProducts} layout="vertical" margin={{ left: 0, right: 20 }}>
              <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={90} />
              <Tooltip formatter={v => [R$(v), 'Receita']} />
              <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {monthSales.length > 0 && (
        <div className="card">
          <div className="card-title">🛒 Vendas do Mês ({monthSales.length})</div>
          {monthSales.slice(0, 8).map(sale => {
            const st = SALE_STATUS[sale.status] || SALE_STATUS.pending
            return (
              <div key={sale.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{sale.client_name || 'Cliente Avulso'}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>{sale.date} · {sale.payment_method}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: '#4ade80' }}>{R$(sale.total)}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: st.color }}>{st.label}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {monthFaccoesLots.length > 0 && (
        <div className="card">
          <div className="card-title">🏭 Produção Facções do Mês</div>
          <div className="scroll-x">
            <table className="tbl">
              <thead><tr><th>REF</th><th>Produção</th><th>Cliente</th><th>Qtd</th><th>Total</th></tr></thead>
              <tbody>
                {monthFaccoesLots.map(({ lot: l, meta: m }) => {
                  const ref = l.name.split(' - ')[0] || l.name
                  const prod = l.name.split(' - ').slice(1).join(' - ') || l.name
                  const qty = parseInt(m.qtd_pecas) || 0
                  const total = qty * (parseFloat(m.valor_unitario) || 0)
                  return (
                    <tr key={l.id}>
                      <td style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{ref}</td>
                      <td style={{ fontSize: 12 }}>{prod}</td>
                      <td style={{ fontSize: 11 }}>{m.client || '—'}</td>
                      <td>{qty || '—'}</td>
                      <td style={{ fontWeight: 700, color: '#4ade80' }}>{total > 0 ? R$(total) : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} style={{ textAlign: 'right', fontWeight: 600, fontSize: 12 }}>TOTAL FACÇÕES</td>
                  <td style={{ fontWeight: 700, color: '#4ade80' }}>{R$(faccaoRevenue)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {monthSales.length === 0 && cfMonth.length === 0 && monthFaccoesLots.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
          <div style={{ fontSize: 40 }}>📊</div>
          <div style={{ marginTop: 8, fontWeight: 600 }}>Sem movimentação neste mês</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Registre vendas, facções e lançamentos no Caixa</div>
        </div>
      )}
    </div>
  )
}

// ─── NEGÓCIO SETUP TAB ───────────────────────────────────────
function NegocioSetupTab({ biz }) {
  const { profile, userId, reload, addToast } = biz
  const [form, setForm] = useState({ name: '', type: 'MEI', segment: 'Moda/Confecção', cnpj: '', monthly_goal: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name || '',
        type: profile.type || 'MEI',
        segment: profile.segment || 'Moda/Confecção',
        cnpj: profile.cnpj || '',
        monthly_goal: profile.monthly_goal || '',
      })
    }
  }, [profile])

  const handleSave = async () => {
    if (!form.name.trim()) { addToast('Digite o nome do negócio', 'error'); return }
    setSaving(true)
    try {
      await bizAPI.saveProfile(userId, { ...form, monthly_goal: parseFloat(form.monthly_goal) || 0 })
      await reload()
      addToast('Negócio atualizado!')
    } catch { addToast('Erro ao salvar', 'error') }
    setSaving(false)
  }

  return (
    <div>
      <div className="card">
        <div className="card-title">🏢 Configuração do Negócio</div>
        <p style={{ fontSize: 13, color: 'var(--cinza)', marginBottom: 16, lineHeight: 1.6 }}>
          Configure as informações do seu negócio. Isso personaliza os relatórios e o painel.
        </p>

        <label className="label">Nome do Negócio *</label>
        <input className="input" style={{ marginBottom: 12 }} placeholder="Ex: Confecção Maria, Tech Solutions..." value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />

        <label className="label">Tipo de Negócio</label>
        <select className="input" style={{ marginBottom: 12 }} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
          {BIZ_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <label className="label">Segmento / Nicho</label>
        <select className="input" style={{ marginBottom: 12 }} value={form.segment} onChange={e => setForm(f => ({ ...f, segment: e.target.value }))}>
          {BIZ_SEGMENTS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <label className="label">CNPJ / CPF (opcional)</label>
        <input className="input" style={{ marginBottom: 12 }} placeholder="00.000.000/0001-00" value={form.cnpj} onChange={e => setForm(f => ({ ...f, cnpj: e.target.value }))} />

        <label className="label">Meta Mensal de Faturamento (R$)</label>
        <input className="input" type="number" inputMode="decimal" style={{ marginBottom: 16 }} placeholder="0,00" value={form.monthly_goal} onChange={e => setForm(f => ({ ...f, monthly_goal: e.target.value }))} />

        <button className="btn btn-dark btn-full" onClick={handleSave} disabled={saving}>
          {saving ? 'Salvando...' : '💾 Salvar Configurações'}
        </button>
      </div>

      {profile && profile.name && (
        <div className="card" style={{ marginTop: 12, background: 'rgba(59,130,246,0.08)', borderColor: 'rgba(59,130,246,0.2)' }}>
          <div style={{ fontSize: 24, marginBottom: 4 }}>🏢</div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>{profile.name}</div>
          <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>{profile.type} · {profile.segment}</div>
          {profile.cnpj && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{profile.cnpj}</div>}
          {parseFloat(profile.monthly_goal) > 0 && (
            <div style={{ fontSize: 13, color: '#60a5fa', marginTop: 6 }}>Meta: {R$(profile.monthly_goal)}/mês</div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── CATÁLOGO TAB ────────────────────────────────────────────
function CatalogoTab({ biz }) {
  const { products, userId, reload, addToast } = biz
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'produto', price: '', cost: '', unit: 'un', stock: '' })
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('todos')

  const filtered = useMemo(() => {
    if (filter === 'todos') return products
    return products.filter(p => p.type === filter)
  }, [products, filter])

  const margin = (p) => parseFloat(p.price) > 0 ? ((parseFloat(p.price) - parseFloat(p.cost)) / parseFloat(p.price)) * 100 : 0

  const handleAdd = async () => {
    if (!form.name.trim()) { addToast('Digite o nome', 'error'); return }
    setSaving(true)
    try {
      await bizAPI.addProduct(userId, { ...form, price: parseFloat(form.price) || 0, cost: parseFloat(form.cost) || 0, stock: parseFloat(form.stock) || 0 })
      setForm({ name: '', type: 'produto', price: '', cost: '', unit: 'un', stock: '' })
      setShowAdd(false)
      await reload()
      addToast('Item adicionado!')
    } catch { addToast('Erro ao salvar', 'error') }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    try {
      await bizAPI.softDeleteProduct(id)
      await reload()
      addToast('Item removido')
    } catch { addToast('Erro ao remover', 'error') }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {[['todos', 'Todos'], ['produto', '📦 Produtos'], ['servico', '🔧 Serviços']].map(([v, l]) => (
          <button key={v} className={`btn btn-sm ${filter === v ? 'btn-dark' : 'btn-ghost'}`} onClick={() => setFilter(v)}>{l}</button>
        ))}
        <button className="btn btn-sm btn-dark" style={{ marginLeft: 'auto' }} onClick={() => setShowAdd(!showAdd)}>+ Novo</button>
      </div>

      {showAdd && (
        <div className="card" style={{ marginBottom: 12, border: '1px solid rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.05)' }}>
          <div className="card-title">➕ Novo Item</div>
          <label className="label">Nome *</label>
          <input className="input" style={{ marginBottom: 10 }} placeholder="Nome do produto/serviço" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />

          <div className="g2" style={{ gap: 8, marginBottom: 10 }}>
            <div>
              <label className="label">Tipo</label>
              <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="produto">Produto</option>
                <option value="servico">Serviço</option>
              </select>
            </div>
            <div>
              <label className="label">Unidade</label>
              <select className="input" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div className="g2" style={{ gap: 8, marginBottom: 10 }}>
            <div>
              <label className="label">Preço Venda (R$)</label>
              <input className="input" type="number" inputMode="decimal" placeholder="0,00" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
            </div>
            <div>
              <label className="label">Custo (R$)</label>
              <input className="input" type="number" inputMode="decimal" placeholder="0,00" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} />
            </div>
          </div>

          {form.type === 'produto' && (
            <div style={{ marginBottom: 10 }}>
              <label className="label">Estoque inicial</label>
              <input className="input" type="number" inputMode="decimal" placeholder="0" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} />
            </div>
          )}

          {form.price && form.cost && parseFloat(form.price) > 0 && (
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10 }}>
              Margem: <span style={{ color: ((parseFloat(form.price) - parseFloat(form.cost)) / parseFloat(form.price)) * 100 >= 30 ? '#4ade80' : '#f59e0b', fontWeight: 600 }}>
                {(((parseFloat(form.price) - parseFloat(form.cost)) / parseFloat(form.price)) * 100).toFixed(1)}%
              </span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-dark btn-sm" onClick={handleAdd} disabled={saving}>{saving ? '...' : '✓ Salvar'}</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
          <div style={{ fontSize: 40 }}>📦</div>
          <div style={{ marginTop: 8, fontWeight: 600 }}>Nenhum item cadastrado</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Clique em "+ Novo" para começar</div>
        </div>
      ) : (
        filtered.map(p => {
          const mg = margin(p)
          return (
            <div key={p.id} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', padding: '12px 14px', marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 15 }}>{p.name}</span>
                    <span style={{ fontSize: 10, background: p.type === 'servico' ? 'rgba(139,92,246,0.2)' : 'rgba(59,130,246,0.2)', color: p.type === 'servico' ? '#a78bfa' : '#60a5fa', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                      {p.type === 'servico' ? 'SERVIÇO' : 'PRODUTO'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 13, flexWrap: 'wrap' }}>
                    <span style={{ color: '#4ade80', fontWeight: 600 }}>{R$(p.price)}</span>
                    {parseFloat(p.cost) > 0 && <span style={{ color: '#94a3b8' }}>Custo: {R$(p.cost)}</span>}
                    {parseFloat(p.price) > 0 && <span style={{ color: mg >= 30 ? '#4ade80' : '#f59e0b' }}>{mg.toFixed(0)}% margem</span>}
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                    {p.unit}{p.type === 'produto' && parseFloat(p.stock) > 0 ? ` · Estoque: ${p.stock}` : ''}
                  </div>
                </div>
                <button onClick={() => handleDelete(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 16, padding: '4px' }}>🗑</button>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

// ─── VENDAS TAB ──────────────────────────────────────────────
function VendasTab({ biz }) {
  const { sales, products, clients, userId, reload, addToast } = biz
  const [view, setView] = useState('list')
  const [selMonth, setSelMonth] = useState(nowMonth())
  const [form, setForm] = useState({ client_name: '', date: todayStr(), payment_method: 'Pix', status: 'pending', notes: '' })
  const [items, setItems] = useState([{ product_id: '', product_name: '', quantity: 1, unit_price: 0, total: 0 }])
  const [saving, setSaving] = useState(false)

  const monthSales = useMemo(() => sales.filter(s => s.date?.startsWith(selMonth)), [sales, selMonth])
  const totalSale = items.reduce((s, it) => s + ((parseFloat(it.quantity) || 0) * (parseFloat(it.unit_price) || 0)), 0)

  const handleItemChange = (idx, field, val) => {
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it
      const updated = { ...it, [field]: val }
      if (field === 'product_id' && val) {
        const prod = products.find(p => p.id === val)
        if (prod) { updated.product_name = prod.name; updated.unit_price = prod.price }
      }
      updated.total = (parseFloat(field === 'quantity' ? val : updated.quantity) || 0) * (parseFloat(field === 'unit_price' ? val : updated.unit_price) || 0)
      return updated
    }))
  }

  const addItem = () => setItems(prev => [...prev, { product_id: '', product_name: '', quantity: 1, unit_price: 0, total: 0 }])
  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx))

  const handleSave = async () => {
    if (totalSale <= 0) { addToast('Adicione ao menos um item', 'error'); return }
    setSaving(true)
    try {
      const saleItems = items.filter(it => (parseFloat(it.quantity) || 0) > 0).map(it => ({
        product_id: it.product_id || null,
        product_name: it.product_name || 'Item avulso',
        quantity: parseFloat(it.quantity) || 1,
        unit_price: parseFloat(it.unit_price) || 0,
        total: (parseFloat(it.quantity) || 0) * (parseFloat(it.unit_price) || 0),
      }))
      await bizAPI.addSale(userId, { ...form, total: totalSale }, saleItems)
      setForm({ client_name: '', date: todayStr(), payment_method: 'Pix', status: 'pending', notes: '' })
      setItems([{ product_id: '', product_name: '', quantity: 1, unit_price: 0, total: 0 }])
      setView('list')
      await reload()
      addToast('Venda registrada!')
    } catch { addToast('Erro ao salvar venda', 'error') }
    setSaving(false)
  }

  const handlePay = async (id) => {
    try { await bizAPI.updateSaleStatus(id, 'paid'); await reload(); addToast('Venda paga!') }
    catch { addToast('Erro', 'error') }
  }
  const handleCancel = async (id) => {
    try { await bizAPI.updateSaleStatus(id, 'cancelled'); await reload(); addToast('Venda cancelada') }
    catch { addToast('Erro', 'error') }
  }
  const handleDelete = async (id) => {
    try { await bizAPI.deleteSale(id); await reload(); addToast('Venda excluída') }
    catch { addToast('Erro', 'error') }
  }

  if (view === 'new') {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setView('list')}>← Voltar</button>
          <span style={{ fontWeight: 700, fontSize: 16 }}>Nova Venda</span>
        </div>

        <div className="card">
          <div className="card-title">Cliente & Pagamento</div>
          <label className="label">Cliente</label>
          {clients.length > 0 ? (
            <select className="input" style={{ marginBottom: 10 }} value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value === '__manual' ? '' : e.target.value }))}>
              <option value="">Cliente Avulso</option>
              {clients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              <option value="__manual">Digitar nome...</option>
            </select>
          ) : (
            <input className="input" style={{ marginBottom: 10 }} placeholder="Nome do cliente (opcional)" value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} />
          )}

          <div className="g2" style={{ gap: 8, marginBottom: 10 }}>
            <div>
              <label className="label">Data</label>
              <input className="input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className="label">Pagamento</label>
              <select className="input" value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}>
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              <option value="pending">Pendente</option>
              <option value="paid">Pago</option>
            </select>
          </div>

          <label className="label">Observações</label>
          <input className="input" placeholder="Opcional" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
        </div>

        <div className="card">
          <div className="card-title">🛒 Itens da Venda</div>
          {items.map((it, idx) => (
            <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '12px', marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8' }}>Item {idx + 1}</span>
                {items.length > 1 && <button onClick={() => removeItem(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 14 }}>✕</button>}
              </div>
              {products.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <label className="label">Produto/Serviço</label>
                  <select className="input" value={it.product_id} onChange={e => handleItemChange(idx, 'product_id', e.target.value)}>
                    <option value="">Avulso / Digitar</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} — {R$(p.price)}</option>)}
                  </select>
                </div>
              )}
              {(!it.product_id) && (
                <div style={{ marginBottom: 8 }}>
                  <label className="label">Descrição</label>
                  <input className="input" placeholder="Descrição do item" value={it.product_name} onChange={e => handleItemChange(idx, 'product_name', e.target.value)} />
                </div>
              )}
              <div className="g2" style={{ gap: 8 }}>
                <div>
                  <label className="label">Qtd</label>
                  <input className="input" type="number" inputMode="decimal" value={it.quantity} onChange={e => handleItemChange(idx, 'quantity', e.target.value)} />
                </div>
                <div>
                  <label className="label">Preço Unit.</label>
                  <input className="input" type="number" inputMode="decimal" value={it.unit_price} onChange={e => handleItemChange(idx, 'unit_price', e.target.value)} />
                </div>
              </div>
              {it.total > 0 && <div style={{ textAlign: 'right', fontSize: 13, color: '#4ade80', fontWeight: 600, marginTop: 6 }}>Subtotal: {R$(it.total)}</div>}
            </div>
          ))}
          <button className="btn btn-ghost btn-sm" onClick={addItem}>+ Adicionar item</button>
        </div>

        <div className="card" style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>Total da Venda</span>
            <span style={{ fontWeight: 700, fontSize: 24, color: '#4ade80' }}>{R$(totalSale)}</span>
          </div>
          <button className="btn btn-dark btn-full" style={{ marginTop: 14 }} onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : '✓ Registrar Venda'}
          </button>
        </div>
      </div>
    )
  }

  const paidMonth = monthSales.filter(s => s.status === 'paid').reduce((s, x) => s + (parseFloat(x.total) || 0), 0)
  const totalMonth = monthSales.filter(s => s.status !== 'cancelled').reduce((s, x) => s + (parseFloat(x.total) || 0), 0)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <select className="input" style={{ width: 140 }} value={selMonth} onChange={e => setSelMonth(e.target.value)}>
          {monthOptions().map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
        </select>
        <button className="btn btn-dark btn-sm" onClick={() => setView('new')}>+ Nova Venda</button>
      </div>

      <div className="g2" style={{ gap: 8, marginBottom: 12 }}>
        <div style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' }}>Pago</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#4ade80' }}>{R$(paidMonth)}</div>
        </div>
        <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' }}>Total</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#f59e0b' }}>{R$(totalMonth)}</div>
        </div>
      </div>

      {monthSales.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
          <div style={{ fontSize: 40 }}>🛒</div>
          <div style={{ marginTop: 8, fontWeight: 600 }}>Sem vendas neste mês</div>
          <button className="btn btn-dark" style={{ marginTop: 12 }} onClick={() => setView('new')}>Registrar primeira venda</button>
        </div>
      ) : (
        monthSales.map(sale => {
          const st = SALE_STATUS[sale.status] || SALE_STATUS.pending
          return (
            <div key={sale.id} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', padding: '12px 14px', marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{sale.client_name || 'Cliente Avulso'}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{sale.date} · {sale.payment_method}</div>
                  {(sale.biz_sale_items || []).length > 0 && (
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                      {(sale.biz_sale_items || []).slice(0, 3).map(it => `${it.product_name} ×${it.quantity}`).join(', ')}
                    </div>
                  )}
                  {sale.notes && <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{sale.notes}</div>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontSize: 16, color: '#4ade80' }}>{R$(sale.total)}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: st.color, marginTop: 2 }}>{st.label}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {sale.status === 'pending' && (
                  <button onClick={() => handlePay(sale.id)} style={{ background: 'rgba(74,222,128,0.15)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 8, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>
                    ✓ Marcar pago
                  </button>
                )}
                {sale.status === 'pending' && (
                  <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => handleCancel(sale.id)}>Cancelar</button>
                )}
                <button onClick={() => handleDelete(sale.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 14, marginLeft: 'auto' }}>🗑</button>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

// ─── CAIXA TAB ───────────────────────────────────────────────
function CaixaTab({ biz }) {
  const { cashflow, userId, reload, addToast } = biz
  const [selMonth, setSelMonth] = useState(nowMonth())
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ type: 'entrada', description: '', category: 'Venda', value: '', date: todayStr(), payment_method: 'Pix', notes: '' })
  const [saving, setSaving] = useState(false)
  const [filterType, setFilterType] = useState('todos')

  const monthCf = useMemo(() => cashflow.filter(cf => cf.date?.startsWith(selMonth)), [cashflow, selMonth])
  const filtered = useMemo(() => filterType === 'todos' ? monthCf : monthCf.filter(cf => cf.type === filterType), [monthCf, filterType])

  const totalIn = monthCf.filter(cf => cf.type === 'entrada').reduce((s, x) => s + (parseFloat(x.value) || 0), 0)
  const totalOut = monthCf.filter(cf => cf.type === 'saida').reduce((s, x) => s + (parseFloat(x.value) || 0), 0)
  const balance = totalIn - totalOut

  const handleSave = async () => {
    if (!form.value || parseFloat(form.value) <= 0) { addToast('Digite o valor', 'error'); return }
    if (!form.description.trim()) { addToast('Digite a descrição', 'error'); return }
    setSaving(true)
    try {
      await bizAPI.addCashflow(userId, { ...form, value: parseFloat(form.value) })
      setForm({ type: 'entrada', description: '', category: 'Venda', value: '', date: todayStr(), payment_method: 'Pix', notes: '' })
      setShowForm(false)
      await reload()
      addToast('Lançamento registrado!')
    } catch { addToast('Erro ao salvar', 'error') }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    try { await bizAPI.deleteCashflow(id); await reload(); addToast('Lançamento excluído') }
    catch { addToast('Erro', 'error') }
  }

  const cats = form.type === 'entrada' ? CF_CATS_IN : CF_CATS_OUT

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <select className="input" style={{ width: 140 }} value={selMonth} onChange={e => setSelMonth(e.target.value)}>
          {monthOptions().map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
        </select>
        <button className="btn btn-dark btn-sm" onClick={() => setShowForm(!showForm)}>+ Lançar</button>
      </div>

      <div className="g2" style={{ gap: 8, marginBottom: 10 }}>
        <div style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' }}>Entradas</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#4ade80' }}>{R$(totalIn)}</div>
        </div>
        <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' }}>Saídas</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#f87171' }}>{R$(totalOut)}</div>
        </div>
      </div>
      <div style={{ background: balance >= 0 ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)', border: `1px solid ${balance >= 0 ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`, borderRadius: 12, padding: '12px 16px', textAlign: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' }}>Saldo do Mês</div>
        <div style={{ fontSize: 24, fontWeight: 700, color: balance >= 0 ? '#4ade80' : '#f87171' }}>{R$(balance)}</div>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 12, border: '1px solid rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.05)' }}>
          <div className="card-title">➕ Novo Lançamento</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {[['entrada', '📈 Entrada'], ['saida', '📉 Saída']].map(([v, l]) => (
              <button key={v} className={`btn btn-sm ${form.type === v ? 'btn-dark' : 'btn-ghost'}`}
                onClick={() => setForm(f => ({ ...f, type: v, category: v === 'entrada' ? 'Venda' : 'Fornecedor' }))}>
                {l}
              </button>
            ))}
          </div>
          <label className="label">Descrição *</label>
          <input className="input" style={{ marginBottom: 10 }} placeholder="Ex: Venda para cliente..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <div className="g2" style={{ gap: 8, marginBottom: 10 }}>
            <div>
              <label className="label">Categoria</label>
              <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {cats.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Valor (R$)</label>
              <input className="input" type="number" inputMode="decimal" placeholder="0,00" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} />
            </div>
          </div>
          <div className="g2" style={{ gap: 8, marginBottom: 12 }}>
            <div>
              <label className="label">Data</label>
              <input className="input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className="label">Forma</label>
              <select className="input" value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}>
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-dark btn-sm" onClick={handleSave} disabled={saving}>{saving ? '...' : '✓ Lançar'}</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>Cancelar</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {[['todos', 'Todos'], ['entrada', '📈 Entradas'], ['saida', '📉 Saídas']].map(([v, l]) => (
          <button key={v} className={`btn btn-sm ${filterType === v ? 'btn-dark' : 'btn-ghost'}`} onClick={() => setFilterType(v)}>{l}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
          <div style={{ fontSize: 40 }}>💰</div>
          <div style={{ marginTop: 8, fontWeight: 600 }}>Sem lançamentos neste período</div>
        </div>
      ) : (
        filtered.map(cf => (
          <div key={cf.id} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: `1px solid ${cf.type === 'entrada' ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)'}`, padding: '10px 14px', marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{cf.description}</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{cf.date} · {cf.category} · {cf.payment_method}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: cf.type === 'entrada' ? '#4ade80' : '#f87171' }}>
                {cf.type === 'entrada' ? '+' : '-'}{R$(cf.value)}
              </span>
              <button onClick={() => handleDelete(cf.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 14 }}>🗑</button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

// ─── CLIENTES TAB ────────────────────────────────────────────
function ClientesTab({ biz }) {
  const { clients, sales, userId, reload, addToast } = biz
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', email: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  const clientStats = useMemo(() => {
    const stats = {}
    sales.filter(s => s.status === 'paid' && s.client_name).forEach(sale => {
      if (!stats[sale.client_name]) stats[sale.client_name] = { count: 0, total: 0 }
      stats[sale.client_name].count++
      stats[sale.client_name].total += parseFloat(sale.total) || 0
    })
    return stats
  }, [sales])

  const filtered = useMemo(() =>
    clients.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase())), [clients, search])

  const handleAdd = async () => {
    if (!form.name.trim()) { addToast('Digite o nome', 'error'); return }
    setSaving(true)
    try {
      await bizAPI.addClient(userId, form)
      setForm({ name: '', phone: '', email: '', notes: '' })
      setShowForm(false)
      await reload()
      addToast('Cliente adicionado!')
    } catch { addToast('Erro ao salvar', 'error') }
    setSaving(false)
  }

  const handleDelete = async (id) => {
    try { await bizAPI.deleteClient(id); await reload(); addToast('Cliente removido') }
    catch { addToast('Erro', 'error') }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input className="input" style={{ flex: 1 }} placeholder="🔍 Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)} />
        <button className="btn btn-dark btn-sm" onClick={() => setShowForm(!showForm)}>+ Novo</button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 12, border: '1px solid rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.05)' }}>
          <div className="card-title">➕ Novo Cliente</div>
          <label className="label">Nome *</label>
          <input className="input" style={{ marginBottom: 10 }} placeholder="Nome completo" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handleAdd()} />
          <div className="g2" style={{ gap: 8, marginBottom: 10 }}>
            <div>
              <label className="label">Telefone</label>
              <input className="input" placeholder="(00) 00000-0000" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <label className="label">E-mail</label>
              <input className="input" type="email" placeholder="email@..." value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
          </div>
          <label className="label">Observações</label>
          <input className="input" style={{ marginBottom: 12 }} placeholder="Notas sobre o cliente" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-dark btn-sm" onClick={handleAdd} disabled={saving}>{saving ? '...' : '✓ Salvar'}</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
          <div style={{ fontSize: 40 }}>👥</div>
          <div style={{ marginTop: 8, fontWeight: 600 }}>{search ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}</div>
          {!search && <button className="btn btn-dark" style={{ marginTop: 12 }} onClick={() => setShowForm(true)}>Adicionar primeiro cliente</button>}
        </div>
      ) : (
        filtered.map(c => {
          const stats = clientStats[c.name]
          return (
            <div key={c.id} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', padding: '12px 14px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: 12, flex: 1 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                  {c.name[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{c.name}</div>
                  {c.phone && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>📱 {c.phone}</div>}
                  {c.email && <div style={{ fontSize: 12, color: '#94a3b8' }}>✉️ {c.email}</div>}
                  {c.notes && <div style={{ fontSize: 12, color: '#64748b' }}>{c.notes}</div>}
                  {stats && (
                    <div style={{ fontSize: 11, color: '#60a5fa', marginTop: 4 }}>
                      {stats.count} compra{stats.count > 1 ? 's' : ''} · {R$(stats.total)} total
                    </div>
                  )}
                </div>
              </div>
              <button onClick={() => handleDelete(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 16, padding: '4px' }}>🗑</button>
            </div>
          )
        })
      )}
    </div>
  )
}

// ─── LOT META (localStorage) ───────────────────────────────
const LOT_STATUS_OPTIONS = ['Em Produção', 'Aguardando', 'Pronto para Entregar', 'Entregue']

function useLotMeta(lotId) {
  const key = `lot_meta_${lotId}`
  const read = () => {
    try { return JSON.parse(localStorage.getItem(key) || '{}') } catch (e) { return {} }
  }
  const [meta, setMetaState] = useState(read)
  const save = (updates) => {
    const next = { ...meta, ...updates }
    try { localStorage.setItem(key, JSON.stringify(next)) } catch {}
    setMetaState(next)
  }
  return [meta, save]
}

function LotInfoCard({ lot, lotIdx }) {
  const { updateLot, deleteLot } = useApp()
  const [meta, saveMeta] = useLotMeta(lot.id)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})

  const startEdit = () => {
    setForm({
      name: lot.name || '',
      client: meta.client || '',
      qtd_pecas: meta.qtd_pecas || '',
      valor_unitario: meta.valor_unitario || '',
      status: meta.status || LOT_STATUS_OPTIONS[0],
      entry_date: meta.entry_date || '',
      delivery_date: meta.delivery_date || '',
      notes: meta.notes || '',
    })
    setEditing(true)
  }

  const saveEdit = () => {
    if (form.name.trim() && form.name !== lot.name) updateLot(lotIdx, { name: form.name.trim() })
    saveMeta({ client: form.client, qtd_pecas: form.qtd_pecas, valor_unitario: form.valor_unitario, status: form.status, entry_date: form.entry_date, delivery_date: form.delivery_date, notes: form.notes })
    setEditing(false)
  }

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  const STATUS_COLOR = {
    'Em Produção': '#38bdf8',
    'Aguardando': '#fb923c',
    'Pronto para Entregar': '#a78bfa',
    'Entregue': '#4ade80',
  }
  const statusColor = STATUS_COLOR[meta.status] || '#94a3b8'

  if (editing) return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div className="card-title" style={{ marginBottom: 12 }}>✏️ Editar Informações do Lote</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <label style={{ fontSize: 12, color: 'var(--cinza)', display: 'block', marginBottom: 4 }}>Nome do Lote *</label>
          <input className="input" value={form.name} onChange={f('name')} placeholder="Nome do lote" />
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--cinza)', display: 'block', marginBottom: 4 }}>Cliente / Empresa</label>
          <input className="input" value={form.client} onChange={f('client')} placeholder="Nome do cliente ou empresa" />
        </div>
        <div className="g2">
          <div>
            <label style={{ fontSize: 12, color: 'var(--cinza)', display: 'block', marginBottom: 4 }}>📦 Qtd de Peças</label>
            <input className="input" type="number" inputMode="numeric" value={form.qtd_pecas} onChange={f('qtd_pecas')} placeholder="0" />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--cinza)', display: 'block', marginBottom: 4 }}>💵 Valor por Peça</label>
            <input className="input" type="number" inputMode="decimal" value={form.valor_unitario} onChange={f('valor_unitario')} placeholder="0,00" />
          </div>
        </div>
        {form.qtd_pecas && form.valor_unitario && (
          <div style={{ background: 'rgba(74,222,128,0.1)', borderRadius: 8, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--cinza)' }}>💰 Valor Total do Lote</span>
            <span style={{ fontWeight: 700, color: '#4ade80', fontSize: 15 }}>{R$((parseFloat(form.qtd_pecas) || 0) * (parseFloat(form.valor_unitario) || 0))}</span>
          </div>
        )}
        <div>
          <label style={{ fontSize: 12, color: 'var(--cinza)', display: 'block', marginBottom: 4 }}>Status</label>
          <select className="input" value={form.status} onChange={f('status')}>
            {LOT_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="g2">
          <div>
            <label style={{ fontSize: 12, color: 'var(--cinza)', display: 'block', marginBottom: 4 }}>Data de Entrada</label>
            <input className="input" type="date" value={form.entry_date} onChange={f('entry_date')} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--cinza)', display: 'block', marginBottom: 4 }}>Data de Entrega</label>
            <input className="input" type="date" value={form.delivery_date} onChange={f('delivery_date')} />
          </div>
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--cinza)', display: 'block', marginBottom: 4 }}>Observações</label>
          <textarea className="input" value={form.notes} onChange={f('notes')} placeholder="Observações sobre o lote..." rows={2} style={{ resize: 'none' }} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-dark" style={{ flex: 1 }} onClick={saveEdit}>✓ Salvar</button>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setEditing(false)}>Cancelar</button>
        </div>
        {confirmDelete ? (
          <div style={{ marginTop: 8, background: 'rgba(239,68,68,0.1)', borderRadius: 8, padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 13, marginBottom: 10, color: '#f87171' }}>⚠️ Apagar o lote <strong>{lot.name}</strong> e todos os seus dados?</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-sm" style={{ flex: 1, background: '#dc2626', color: '#fff', border: 'none' }} onClick={() => { deleteLot(lotIdx); setConfirmDelete(false); setEditing(false) }}>Sim, apagar</button>
              <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => setConfirmDelete(false)}>Não</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)} style={{ background: 'none', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#f87171', fontSize: 13, padding: '8px 12px', cursor: 'pointer', width: '100%', marginTop: 4 }}>
            🗑 Apagar este lote
          </button>
        )}
      </div>
    </div>
  )

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>{lot.name}</span>
            <span style={{ fontSize: 11, fontWeight: 600, background: `${statusColor}22`, color: statusColor, padding: '2px 8px', borderRadius: 20 }}>
              {meta.status || 'Em Produção'}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', fontSize: 13 }}>
            {meta.client && (
              <div><div style={{ color: 'var(--cinza)', fontSize: 11 }}>👤 Cliente</div><div style={{ fontWeight: 600 }}>{meta.client}</div></div>
            )}
            {meta.qtd_pecas && (
              <div><div style={{ color: 'var(--cinza)', fontSize: 11 }}>📦 Qtd Peças</div><div style={{ fontWeight: 600 }}>{meta.qtd_pecas} un</div></div>
            )}
            {meta.valor_unitario && (
              <div><div style={{ color: 'var(--cinza)', fontSize: 11 }}>💵 Valor/Peça</div><div style={{ fontWeight: 600 }}>{R$(parseFloat(meta.valor_unitario))}</div></div>
            )}
            {meta.entry_date && (
              <div><div style={{ color: 'var(--cinza)', fontSize: 11 }}>📅 Entrada</div><div style={{ fontWeight: 600 }}>{new Date(meta.entry_date + 'T12:00:00').toLocaleDateString('pt-BR')}</div></div>
            )}
            {meta.delivery_date && (
              <div><div style={{ color: 'var(--cinza)', fontSize: 11 }}>🚚 Entrega</div><div style={{ fontWeight: 600 }}>{new Date(meta.delivery_date + 'T12:00:00').toLocaleDateString('pt-BR')}</div></div>
            )}
          </div>
          {meta.notes && (
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--cinza)', fontStyle: 'italic', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 8 }}>
              📝 {meta.notes}
            </div>
          )}
          {meta.qtd_pecas && meta.valor_unitario && (
            <div style={{ marginTop: 8, background: 'rgba(74,222,128,0.1)', borderRadius: 8, padding: '6px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--cinza)' }}>💰 Valor Total</span>
              <span style={{ fontWeight: 700, color: '#4ade80' }}>{R$((parseFloat(meta.qtd_pecas) || 0) * (parseFloat(meta.valor_unitario) || 0))}</span>
            </div>
          )}
          {!meta.client && !meta.entry_date && !meta.delivery_date && (
            <div style={{ fontSize: 12, color: 'var(--cinza)', marginTop: 4 }}>Toque em ✏️ para adicionar informações do lote</div>
          )}
        </div>
        <button onClick={startEdit} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, padding: '0 0 0 8px', flexShrink: 0 }}>✏️</button>
      </div>
    </div>
  )
}


// ─── FACÇÕES TAB ─────────────────────────────────────────────
function FaccoesTab({ lot, lotIdx }) {
  const { state: appState, updateLot, addLotItem, updateLotItem, deleteItem, addExpense, updateExpense, deleteExpense, addWorker, deleteWorker, addTx, deleteTx, addToast } = useApp()
  const [newWorkerName, setNewWorkerName] = useState('')
  const [expenseDrafts, setExpenseDrafts] = useState({})
  const [itemsView, setItemsView] = useState('lote')  // 'lote' | 'mes'
  const [meta, saveMeta] = useLotMeta(lot.id)

  const items = lot.lot_items || []
  const expenses = lot.lot_expenses || []
  const workers = lot.workers || []

  const lotTotal = (parseInt(meta.qtd_pecas) || 0) * (parseFloat(meta.valor_unitario) || 0)
  const totalProd = items.reduce((s, i) => s + (parseFloat(i.value) || 0) * (parseInt(i.quantity) || 0), 0)
  const totalExp = expenses.reduce((s, e) => s + (parseFloat(e.value) || 0), 0)
  const netResult = totalProd - totalExp
  const days = parseInt(lot.work_days) || 0
  const dailyRate = days > 0 ? netResult / days : 0

  // Worker % from lot meta
  const workerPcts = meta.worker_pcts || {}
  const setWorkerPct = (workerId, pct) => saveMeta({ worker_pcts: { ...workerPcts, [workerId]: pct } })

  const curMonth = nowMonth()

  // All lots for the current month
  const monthLots = useMemo(() => {
    return appState.lots.map(l => {
      try { return { lot: l, meta: JSON.parse(localStorage.getItem(`lot_meta_${l.id}`) || '{}') } }
      catch (e) { return { lot: l, meta: {} } }
    }).filter(({ meta: m }) => (m.entry_date || '').substring(0, 7) === curMonth)
  }, [appState.lots, curMonth])

  // Monthly earnings per worker across all lots
  const monthlyEarnings = useMemo(() => {
    const earnings = {}
    appState.lots.forEach(l => {
      try {
        const m = JSON.parse(localStorage.getItem(`lot_meta_${l.id}`) || '{}')
        if ((m.entry_date || '').substring(0, 7) !== curMonth) return
        const lt = (parseInt(m.qtd_pecas) || 0) * (parseFloat(m.valor_unitario) || 0)
        const pcts = m.worker_pcts || {}
        Object.entries(pcts).forEach(([wid, p]) => {
          earnings[wid] = (earnings[wid] || 0) + (parseFloat(p) / 100) * lt
        })
      } catch (e) {}
    })
    return earnings
  }, [appState.lots, curMonth])

  const setItemField = (item, key, val) => updateLotItem(lotIdx, item.id, { [key]: val })

  // Worker income toggle: só salva no meta, sem criar transação real
  const workerIncome = meta.worker_income || {}
  const workerTxIds = meta.worker_tx_ids || {}

  const calcWorkerValue = (workerId) => {
    const lotTotal = (parseInt(meta.qtd_pecas) || 0) * (parseFloat(meta.valor_unitario) || 0)
    const pct = parseFloat((meta.worker_pcts || {})[workerId]) || 0
    return Math.round(lotTotal * pct / 100 * 100) / 100
  }

  // Sincroniza participantes já marcados como receita mas sem tx_id
  const pendingSync = workers.filter(w =>
    (meta.worker_income || {})[w.id] === true && !(meta.worker_tx_ids || {})[w.id]
  )
  useEffect(() => {
    if (!pendingSync.length) return
    let cancelled = false
    ;(async () => {
      const updatedTxIds = { ...(meta.worker_tx_ids || {}) }
      for (const w of pendingSync) {
        if (cancelled) return
        const val = calcWorkerValue(w.id)
        const saved = await addTx({
          type: 'income',
          description: `Facção – ${w.name}${lot?.description ? ' (' + lot.description + ')' : ''}`,
          value: val > 0 ? val : 0,
          date: todayStr(),
          category: 'Negócio',
          account: 'Pix',
          paid: true,
          notes: 'Receita de facção',
        })
        if (saved?.id) updatedTxIds[w.id] = saved.id
      }
      if (!cancelled) {
        saveMeta({ worker_tx_ids: updatedTxIds })
        addToast(`Receita de ${pendingSync.length} participante(s) lançada`)
      }
    })()
    return () => { cancelled = true }
  }, [pendingSync.length]) // eslint-disable-line

  const toggleWorkerIncome = async (w, newState) => {
    if (newState) {
      const workerVal = calcWorkerValue(w.id)
      const lot = appState.lots[lotIdx]
      const saved = await addTx({
        type: 'income',
        description: `Facção – ${w.name}${lot?.description ? ' (' + lot.description + ')' : ''}`,
        value: workerVal > 0 ? workerVal : 0,
        date: todayStr(),
        category: 'Negócio',
        account: 'Pix',
        paid: true,
        notes: 'Receita de facção',
      })
      const txId = saved?.id
      saveMeta({
        worker_income: { ...workerIncome, [w.id]: true },
        worker_tx_ids: { ...workerTxIds, [w.id]: txId || null },
      })
      addToast(`${w.name} incluído na receita do mês`)
    } else {
      const txId = workerTxIds[w.id]
      if (txId) deleteTx(txId)
      const updatedTxIds = { ...workerTxIds }
      delete updatedTxIds[w.id]
      saveMeta({
        worker_income: { ...workerIncome, [w.id]: false },
        worker_tx_ids: updatedTxIds,
      })
      addToast(`${w.name} removido da receita do mês`)
    }
  }

  const handleAddWorker = async () => {
    if (!newWorkerName.trim()) return
    await addWorker(lotIdx, newWorkerName.trim())
    setNewWorkerName('')
  }

  const handleDeleteWorker = (w) => {
    // Remove a transação de receita associada antes de deletar
    const txId = (meta.worker_tx_ids || {})[w.id]
    if (txId) deleteTx(txId)
    // Limpa TODOS os dados do participante do meta
    const updatedIncome = { ...(meta.worker_income || {}) }
    const updatedTxIds = { ...(meta.worker_tx_ids || {}) }
    const updatedPcts = { ...(meta.worker_pcts || {}) }
    delete updatedIncome[w.id]
    delete updatedTxIds[w.id]
    delete updatedPcts[w.id]
    saveMeta({ worker_income: updatedIncome, worker_tx_ids: updatedTxIds, worker_pcts: updatedPcts })
    deleteWorker(lotIdx, w.id)
  }

  return (
    <div>
      <LotInfoCard lot={lot} lotIdx={lotIdx} />

      {/* ── ITENS DESTE LOTE (com toggle para ver o mês) ── */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div className="card-title" style={{ marginBottom: 0 }}>
            {itemsView === 'lote' ? '📦 Itens deste Lote' : '🧵 Produção Geral do Mês'}
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => setItemsView('lote')} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, border: 'none', cursor: 'pointer', background: itemsView === 'lote' ? '#3b82f6' : 'rgba(255,255,255,0.08)', color: itemsView === 'lote' ? '#fff' : '#94a3b8', fontWeight: itemsView === 'lote' ? 700 : 400 }}>Este Lote</button>
            <button onClick={() => setItemsView('mes')} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, border: 'none', cursor: 'pointer', background: itemsView === 'mes' ? '#3b82f6' : 'rgba(255,255,255,0.08)', color: itemsView === 'mes' ? '#fff' : '#94a3b8', fontWeight: itemsView === 'mes' ? 700 : 400 }}>Mês Completo</button>
          </div>
        </div>

        {itemsView === 'lote' ? (
          <>
            <div className="scroll-x">
              <table className="tbl">
                <thead><tr><th>REF</th><th>Descrição</th><th>Valor/pç</th><th>Qtd</th><th>Total</th><th></th></tr></thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id}>
                      <td><input className="tbl-input" style={{ width: 50 }} value={item.ref || ''} onChange={e => setItemField(item, 'ref', e.target.value)} /></td>
                      <td><input className="tbl-input" style={{ width: 100 }} value={item.description || ''} onChange={e => setItemField(item, 'description', e.target.value)} /></td>
                      <td><input className="tbl-input" style={{ width: 70 }} type="number" inputMode="decimal" value={item.value || ''} onChange={e => setItemField(item, 'value', parseFloat(e.target.value) || 0)} /></td>
                      <td><input className="tbl-input" style={{ width: 50 }} type="number" inputMode="numeric" value={item.quantity || ''} onChange={e => setItemField(item, 'quantity', parseInt(e.target.value) || 0)} /></td>
                      <td style={{ fontWeight: 600, color: '#4ade80' }}>{R$((parseFloat(item.value) || 0) * (parseInt(item.quantity) || 0))}</td>
                      <td><button onClick={() => deleteItem(lotIdx, item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>🗑</button></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'right', fontWeight: 600, fontSize: 12 }}>TOTAL DAS PRODUÇÕES</td>
                    <td style={{ fontWeight: 700, color: '#4ade80' }}>{R$(totalProd)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => addLotItem(lotIdx)}>+ Peça</button>
          </>
        ) : (
          <div className="scroll-x">
            <table className="tbl">
              <thead><tr><th>REF</th><th>Produção</th><th>Cliente</th><th>Qtd</th><th>Vl/Pç</th><th>Total</th></tr></thead>
              <tbody>
                {monthLots.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: '#94a3b8', padding: '10px 0', fontSize: 12 }}>Nenhum lote com data de entrada neste mês</td></tr>
                )}
                {monthLots.map(({ lot: l, meta: m }) => {
                  const ref = l.name.split(' - ')[0] || l.name
                  const prod = l.name.split(' - ').slice(1).join(' - ') || l.name
                  const qty = parseInt(m.qtd_pecas) || 0
                  const vup = parseFloat(m.valor_unitario) || 0
                  const total = qty * vup
                  return (
                    <tr key={l.id} style={{ opacity: l.id === lot.id ? 1 : 0.65 }}>
                      <td style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{ref}</td>
                      <td style={{ fontSize: 11 }}>{prod}</td>
                      <td style={{ fontSize: 11 }}>{m.client || '—'}</td>
                      <td style={{ fontSize: 11 }}>{qty || '—'}</td>
                      <td style={{ fontSize: 11 }}>{vup > 0 ? R$(vup) : '—'}</td>
                      <td style={{ fontWeight: 700, color: '#4ade80', fontSize: 12 }}>{total > 0 ? R$(total) : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5} style={{ textAlign: 'right', fontWeight: 600, fontSize: 12 }}>TOTAL DO MÊS</td>
                  <td style={{ fontWeight: 700, color: '#4ade80' }}>{R$(monthLots.reduce((s, { meta: m }) => s + (parseInt(m.qtd_pecas) || 0) * (parseFloat(m.valor_unitario) || 0), 0))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div className="card-title" style={{ marginBottom: 0 }}>💸 Gastos com as Facções</div>
          {totalExp > 0 && <span style={{ fontWeight: 700, color: '#f87171', fontSize: 15 }}>{R$(totalExp)}</span>}
        </div>

        {expenses.map(e => {
          const draft = expenseDrafts[e.id] || {}
          const val = (field) => field in draft ? draft[field] : (e[field] ?? '')
          const setDraft = (field, v) => setExpenseDrafts(prev => ({ ...prev, [e.id]: { ...(prev[e.id] || {}), [field]: v } }))
          const hasDraft = Object.keys(draft).length > 0
          const saveExpense = () => {
            if (hasDraft) {
              updateExpense(lotIdx, e.id, draft)
              setExpenseDrafts(prev => { const n = { ...prev }; delete n[e.id]; return n })
              addToast('Gasto salvo!')
            }
          }
          return (
            <div key={e.id} style={{ marginBottom: 10, padding: '12px', background: 'rgba(248,113,113,0.06)', borderRadius: 10, border: `1px solid ${hasDraft ? 'rgba(251,191,36,0.4)' : 'rgba(248,113,113,0.15)'}` }}>
              {/* linha 1: data + categoria + valor + lixo */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <input className="tbl-input" type="date" value={val('date')} style={{ width: 130, fontSize: 11 }} onChange={ev => setDraft('date', ev.target.value)} />
                <select className="tbl-input" value={val('categoria') || 'Outros'} style={{ flex: 1, fontSize: 11 }} onChange={ev => setDraft('categoria', ev.target.value)}>
                  {['Material','Serviço','Transporte','Aluguel','Alimentação','Energia','Manutenção','Outros'].map(c => <option key={c}>{c}</option>)}
                </select>
                <input className="tbl-input" type="number" inputMode="decimal" value={val('value')} placeholder="0,00" style={{ width: 90, fontWeight: 700, color: '#f87171', textAlign: 'right' }} onChange={ev => setDraft('value', parseFloat(ev.target.value) || 0)} />
                <button onClick={() => deleteExpense(lotIdx, e.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 16, flexShrink: 0 }}>🗑</button>
              </div>
              {/* linha 2: descrição */}
              <input className="tbl-input" value={val('description')} placeholder="Descrição do gasto" style={{ width: '100%', marginBottom: 8 }} onChange={ev => setDraft('description', ev.target.value)} />
              {/* linha 3: fornecedor + forma_pagamento + status */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <input className="tbl-input" value={val('fornecedor')} placeholder="Fornecedor" style={{ flex: 1, fontSize: 11 }} onChange={ev => setDraft('fornecedor', ev.target.value)} />
                <select className="tbl-input" value={val('forma_pagamento') || 'Pix'} style={{ width: 110, fontSize: 11 }} onChange={ev => setDraft('forma_pagamento', ev.target.value)}>
                  {['Dinheiro','Pix','Cartão','Boleto','Transferência','Outros'].map(f => <option key={f}>{f}</option>)}
                </select>
                <button
                  onClick={() => setDraft('status', val('status') === 'pago' ? 'pendente' : 'pago')}
                  style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, border: 'none', cursor: 'pointer', flexShrink: 0, background: val('status') === 'pago' ? 'rgba(74,222,128,0.2)' : 'rgba(251,191,36,0.2)', color: val('status') === 'pago' ? '#4ade80' : '#fbbf24' }}
                >
                  {val('status') === 'pago' ? '✅ Pago' : '⏳ Pendente'}
                </button>
              </div>
              {/* linha 4: observações */}
              <input className="tbl-input" value={val('observacoes')} placeholder="Observações (opcional)" style={{ width: '100%', fontSize: 11, color: '#94a3b8', marginBottom: hasDraft ? 8 : 0 }} onChange={ev => setDraft('observacoes', ev.target.value)} />
              {/* botão salvar — só aparece quando há alterações */}
              {hasDraft && (
                <button onClick={saveExpense} style={{ width: '100%', marginTop: 4, padding: '7px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(74,222,128,0.2)', color: '#4ade80', fontWeight: 700, fontSize: 13 }}>
                  ✓ Salvar Gasto
                </button>
              )}
            </div>
          )
        })}

        {expenses.length === 0 && (
          <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12, padding: '12px 0' }}>Nenhum gasto cadastrado</div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => addExpense(lotIdx)}>+ Gasto</button>
          {totalExp > 0 && <span style={{ fontSize: 12, color: '#94a3b8' }}>Total: <strong style={{ color: '#f87171' }}>{R$(totalExp)}</strong></span>}
        </div>
      </div>

      {/* ── PARTICIPANTES — após gastos ── */}
      <div className="card">
        <div className="card-title">👥 Participantes</div>
        {workers.map(w => {
          const pct = parseFloat(workerPcts[w.id] || 0)
          const earned = (pct / 100) * lotTotal
          const monthEarned = monthlyEarnings[w.id] || 0
          const isIncome = !!workerIncome[w.id]
          return (
            <div key={w.id} style={{ marginBottom: 10, padding: '10px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>👤 {w.name}</div>
                <button onClick={() => handleDeleteWorker(w)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 14 }}>🗑</button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>% do lote:</span>
                <input className="tbl-input" type="number" inputMode="decimal" value={pct || ''} placeholder="0" style={{ width: 60, textAlign: 'right' }} onChange={e => setWorkerPct(w.id, parseFloat(e.target.value) || 0)} />
                <span style={{ fontSize: 12, color: '#94a3b8' }}>%</span>
                <span style={{ marginLeft: 'auto', fontWeight: 700, fontSize: 15, color: '#4ade80' }}>{R$(earned)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>
                  Mês acumulado: <span style={{ color: '#60a5fa', fontWeight: 600 }}>{R$(monthEarned)}</span>
                </div>
                <button
                  onClick={() => toggleWorkerIncome(w, !isIncome)}
                  style={{ fontSize: 11, padding: '4px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', background: isIncome ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.08)', color: isIncome ? '#4ade80' : '#94a3b8', fontWeight: isIncome ? 700 : 400 }}
                >
                  {isIncome ? '💰 Receita ativa' : '➕ Receita mensal'}
                </button>
              </div>
            </div>
          )
        })}

        {/* Adicionar novo participante */}
        <div style={{ marginTop: 12, padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px dashed rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input className="input" placeholder="Nome da pessoa" value={newWorkerName} onChange={e => setNewWorkerName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddWorker()} style={{ marginBottom: 0, flex: 1 }} />
            <button className="btn btn-dark btn-sm" onClick={handleAddWorker} style={{ whiteSpace: 'nowrap' }}>+ Adicionar</button>
          </div>
        </div>
      </div>

      {(lotTotal > 0 || totalProd > 0) && (
        <div className="card">
          <div className="card-title">📊 Resumo do Lote</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: 13, color: '#94a3b8' }}>Valor Total (Qtd × Vl/Pç)</span>
            <span style={{ fontWeight: 700, color: '#4ade80' }}>{R$(lotTotal)}</span>
          </div>
          {totalExp > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: 13, color: '#94a3b8' }}>(-) Gastos</span>
              <span style={{ fontWeight: 600, color: '#f87171' }}>- {R$(totalExp)}</span>
            </div>
          )}
          {workers.length > 0 && (
            <div style={{ padding: '10px 0' }}>
              {workers.map(w => {
                const pct = parseFloat(workerPcts[w.id] || 0)
                const earned = (pct / 100) * lotTotal
                return earned > 0 ? (
                  <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: '#94a3b8' }}>↳ {w.name} ({pct}%)</span>
                    <span style={{ color: '#60a5fa' }}>{R$(earned)}</span>
                  </div>
                ) : null
              })}
            </div>
          )}
          <div style={{ marginTop: 10 }}>
            <div className="g2" style={{ gap: 8, alignItems: 'flex-end' }}>
              <div>
                <label className="label">Dias trabalhados</label>
                <input className="input" type="number" inputMode="numeric" value={lot.work_days || ''} placeholder="0" onChange={e => updateLot(lotIdx, { work_days: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="stat">
                <div className="stat-label">Valor/dia</div>
                <div style={{ fontWeight: 700, fontSize: 18, color: '#fbbf24' }}>{days > 0 ? R$(lotTotal / days) : '—'}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── DRE TAB ─────────────────────────────────────────────────
const DRE_STRUCTURE = [
  { key: 'rec_bruta', label: 'RECEITA BRUTA', type: 'input', rows: true },
  { key: 'deducoes', label: '(-) DEDUÇÕES', type: 'input', rows: true },
  { key: 'rec_liq', label: '(=) RECEITA LÍQUIDA', type: 'calc', color: 'rgba(74,222,128,0.15)' },
  { key: 'cmv', label: '(-) CMV (Facção)', type: 'auto', color: '#fef3c7' },
  { key: 'lucro_bruto', label: '(=) LUCRO BRUTO', type: 'calc', color: 'rgba(74,222,128,0.15)' },
  { key: 'desp_op', label: '(-) DESPESAS OPERACIONAIS', type: 'input', rows: true },
  { key: 'ebitda', label: '(=) EBITDA', type: 'calc', color: 'rgba(74,222,128,0.15)' },
  { key: 'desp_fin', label: '(-) DESPESAS FINANCEIRAS', type: 'input' },
  { key: 'rec_fin', label: '(+) RECEITAS FINANCEIRAS', type: 'input' },
  { key: 'lair', label: '(=) LAIR', type: 'calc', color: 'rgba(74,222,128,0.15)' },
  { key: 'ir', label: '(-) IR e CSLL', type: 'input' },
  { key: 'lucro_liq', label: '(=) LUCRO LÍQUIDO', type: 'calc', color: 'rgba(74,222,128,0.15)', big: true },
]

function DreTab({ lots, userId }) {
  const now = new Date()
  const [period, setPeriod] = useState(`${MONTHS[now.getMonth()]}/${now.getFullYear()}`)
  const [dre, setDre] = useState({ rec_bruta: [{ desc: 'Receita principal', val: 0 }], deducoes: [{ desc: 'Devoluções', val: 0 }], desp_op: [{ desc: 'Despesas gerais', val: 0 }], desp_fin: 0, rec_fin: 0, ir: 0 })
  const [saving, setSaving] = useState(false)
  const { addToast } = useApp()

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

  const setRow = (key, idx, field, val) => setDre(d => ({ ...d, [key]: d[key].map((r, i) => i === idx ? { ...r, [field]: val } : r) }))
  const addRow = (key) => setDre(d => ({ ...d, [key]: [...(d[key] || []), { desc: '', val: 0 }] }))

  const handleSave = async () => {
    setSaving(true)
    try { await dreAPI.upsert(userId, period, { ...dre, ...calc, cmv }); addToast('DRE salva!') }
    catch { addToast('Erro ao salvar', 'error') }
    setSaving(false)
  }

  const barData = [
    { name: 'Rec. Bruta', val: calc.rec_bruta },
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
                <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 6 }}>{row.label}</div>
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
                <span style={{ fontSize: 13, color: '#94a3b8' }}>{row.label}</span>
                <input className="input" style={{ width: 120 }} type="number" inputMode="decimal" value={dre[row.key] || ''} onChange={e => setDre(d => ({ ...d, [row.key]: e.target.value }))} />
              </div>
            )
          }
          if (row.type === 'auto') {
            return (
              <div key={row.key} style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 14px', background: row.color, borderRadius: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{row.label}</span>
                <span style={{ fontWeight: 700, color: '#dc2626' }}>{R$(cmv)}</span>
              </div>
            )
          }
          const val = calc[row.key]
          return (
            <div key={row.key} style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 14px', background: row.color, borderRadius: 8, marginBottom: 12 }}>
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

      <div className="card" style={{ marginTop: 12 }}>
        <div className="card-title">💼 Integrar ao Orçamento Pessoal</div>
        <div style={{ fontSize: 13, color: 'var(--text-sub)', marginBottom: 12, lineHeight: 1.6 }}>
          Adicione o Lucro Líquido ao seu orçamento pessoal.<br />
          <b style={{ color: 'var(--text)' }}>Lucro Líquido: {R$(calc.lucro_liq)}</b>
        </div>
        <button className="btn btn-green btn-full" onClick={() => {
          const val = calc.lucro_liq > 0 ? calc.lucro_liq : 0
          localStorage.setItem('businessMonthlyIncome', String(val))
          addToast(val > 0 ? `✓ Renda integrada: ${R$(val)}/mês` : 'Renda zerada (lucro negativo)', val > 0 ? 'success' : 'error')
        }}>
          💼 Integrar {R$(Math.max(0, calc.lucro_liq))}/mês ao Orçamento
        </button>
        {parseFloat(localStorage.getItem('businessMonthlyIncome') || '0') > 0 && (
          <button className="btn btn-ghost btn-full" style={{ marginTop: 8 }} onClick={() => { localStorage.removeItem('businessMonthlyIncome'); addToast('Renda removida do orçamento', 'info') }}>
            ✕ Remover integração
          </button>
        )}
      </div>
    </div>
  )
}

// ─── VPL TAB ─────────────────────────────────────────────────
function VplTab({ userId }) {
  const { state, upsertVPL, deleteVPL, addToast } = useApp()
  const { vplProjects } = state
  const [form, setForm] = useState({ name: 'Novo Projeto', investment: 50000, rate: 1.5, periods: 12 })
  const [flows, setFlows] = useState(Array.from({ length: 12 }, () => ({ receitas: 0, custos: 0 })))
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

  const replicateFirst = () => { const first = flows[0] || { receitas: 0, custos: 0 }; setFlows(flows.map(() => ({ ...first }))) }

  const handleSave = async () => { setSaving(true); await upsertVPL({ ...form, cash_flows: flows }); setSaving(false) }

  const chartData = flows.map((f, i) => {
    const fc = fcsLiq.slice(0, i + 1).reduce((s, x) => s + x, 0) - form.investment
    const r = parseFloat(form.rate) / 100
    const pv = fcsLiq[i] / Math.pow(1 + r, i + 1)
    return { mes: `M${i + 1}`, fc, pv }
  })

  return (
    <div>
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
                    <td style={{ color: '#94a3b8', fontSize: 11 }}>{R$(fcDesc)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="g2" style={{ marginBottom: 12 }}>
        <div className="stat"><div className="stat-label">VPL</div><div className="stat-value" style={{ fontSize: 16, color: vpl >= 0 ? '#15803d' : '#dc2626' }}>{R$(vpl)}</div></div>
        <div className="stat"><div className="stat-label">TIR</div><div className="stat-value" style={{ fontSize: 16 }}>{pct(tir, 2)}</div></div>
        <div className="stat"><div className="stat-label">Payback</div><div className="stat-value" style={{ fontSize: 16 }}>{payback ? `${payback}m` : '–'}</div></div>
        <div className="stat"><div className="stat-label">IL</div><div className="stat-value" style={{ fontSize: 16, color: il >= 1 ? '#15803d' : '#dc2626' }}>{il.toFixed(2)}</div></div>
      </div>

      <div className="card" style={{ textAlign: 'center', background: vpl >= 0 ? 'rgba(74,222,128,0.15)' : 'rgba(239,68,68,0.1)', borderColor: vpl >= 0 ? '#22c55e' : '#ef4444' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: vpl >= 0 ? '#15803d' : '#dc2626' }}>{vpl >= 0 ? '✅ PROJETO VIÁVEL' : '❌ PROJETO INVIÁVEL'}</div>
        <div style={{ fontSize: 12, marginTop: 4, color: '#94a3b8' }}>VPL {vpl >= 0 ? 'positivo' : 'negativo'} · TIR {pct(tir, 2)} · IL {il.toFixed(2)}</div>
      </div>

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

      <div className="card">
        <div className="card-title">Análise de Sensibilidade</div>
        {[['tma', 'TMA (%)', -5, 5], ['receitas', 'Receitas (%)', -20, 20], ['custos', 'Custos (%)', -20, 20]].map(([key, label, min, max]) => (
          <div key={key} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
              <span>{label}</span><span style={{ fontWeight: 600 }}>{sens[key] > 0 ? '+' : ''}{sens[key]}%</span>
            </div>
            <input type="range" min={min} max={max} step={0.5} value={sens[key]} onChange={e => setSens(s => ({ ...s, [key]: parseFloat(e.target.value) }))} style={{ width: '100%' }} />
          </div>
        ))}
        <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, color: vpl >= 0 ? '#15803d' : '#dc2626' }}>VPL ajustado: {R$(vpl)}</div>
      </div>

      <button className="btn btn-dark btn-full" onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : '💾 Salvar Projeto'}</button>

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
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>Inv: {R$(p.investment)} · VPL: <span style={{ color: v >= 0 ? '#15803d' : '#dc2626' }}>{R$(v)}</span></div>
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
  const [newLotClient, setNewLotClient] = useState('')
  const [newLotStatus, setNewLotStatus] = useState('Em Produção')
  const [newLotEntryDate, setNewLotEntryDate] = useState('')
  const [newLotDeliveryDate, setNewLotDeliveryDate] = useState('')
  const [newLotNotes, setNewLotNotes] = useState('')
  const [showNewLot, setShowNewLot] = useState(false)

  const [bizProfile, setBizProfile] = useState(null)
  const [products, setProducts] = useState([])
  const [sales, setSales] = useState([])
  const [clients, setClients] = useState([])
  const [cashflow, setCashflow] = useState([])

  const loadBizData = useCallback(async () => {
    if (!user?.id) return
    try {
      const [profile, prods, sls, cls, cf] = await Promise.all([
        bizAPI.getProfile(user.id).catch(() => null),
        bizAPI.getProducts(user.id).catch(() => []),
        bizAPI.getSales(user.id).catch(() => []),
        bizAPI.getClients(user.id).catch(() => []),
        bizAPI.getCashflow(user.id).catch(() => []),
      ])
      setBizProfile(profile)
      setProducts(prods || [])
      setSales(sls || [])
      setClients(cls || [])
      setCashflow(cf || [])
    } catch {
      // Tables may not exist yet — silent fail
    }
  }, [user?.id])

  useEffect(() => { loadBizData() }, [loadBizData])

  const biz = { profile: bizProfile, products, sales, clients, cashflow, userId: user?.id, reload: loadBizData, addToast }

  const lot = lots[activeLotIdx]

  const VALID_TABS = ['visao', 'negocio', 'catalogo', 'vendas', 'caixa', 'clientes', 'faccoes', 'dre', 'vpl']
  const currentTab = VALID_TABS.includes(activeNegTab) ? activeNegTab : 'visao'

  const NEG_TABS = [
    ['visao', '📊 Painel'],
    ['negocio', '⚙️ Negócio'],
    ['catalogo', '📦 Catálogo'],
    ['vendas', '🛒 Vendas'],
    ['caixa', '💰 Caixa'],
    ['clientes', '👥 Clientes'],
    ['faccoes', '🧵 Facções'],
    ['dre', 'DRE'],
    ['vpl', 'VPL/TIR'],
  ]

  return (
    <div>
      <div className="hdr hdr-slate">
        <h1>Módulo Negócio</h1>
        <p>{bizProfile?.name || 'Configure seu negócio'} · {bizProfile?.type || 'Gestão Empresarial'}</p>
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        <div style={{ overflowX: 'auto', marginTop: 12, paddingBottom: 2 }}>
          <div style={{ display: 'flex', gap: 4, minWidth: 'max-content' }}>
            {NEG_TABS.map(([id, label]) => (
              <button key={id} className={`tab${currentTab === id ? ' active' : ''}`}
                onClick={() => dispatch({ type: 'SET_NEG_TAB', tab: id })} style={{ whiteSpace: 'nowrap' }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          {currentTab === 'visao' && <VisaoGeralTab biz={biz} />}
          {currentTab === 'negocio' && <NegocioSetupTab biz={biz} />}
          {currentTab === 'catalogo' && <CatalogoTab biz={biz} />}
          {currentTab === 'vendas' && <VendasTab biz={biz} />}
          {currentTab === 'caixa' && <CaixaTab biz={biz} />}
          {currentTab === 'clientes' && <ClientesTab biz={biz} />}

          {currentTab === 'faccoes' && (
            <>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 12 }}>
                {lots.map((l, i) => (
                  <button key={l.id} onClick={() => dispatch({ type: 'SET_LOT_IDX', idx: i })}
                    className={`btn btn-sm ${i === activeLotIdx ? 'btn-dark' : 'btn-ghost'}`}
                    style={{ whiteSpace: 'nowrap', textAlign: 'left', lineHeight: 1.2, padding: '6px 12px' }}>
                    {(() => {
                      const parts = l.name.split(' - ')
                      return parts.length > 1
                        ? <><div style={{ fontWeight: 700 }}>{parts[0]}</div><div style={{ fontSize: 10, opacity: 0.75 }}>{parts.slice(1).join(' - ')}</div></>
                        : l.name
                    })()}
                  </button>
                ))}
                {!showNewLot && (
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowNewLot(true)} style={{ whiteSpace: 'nowrap' }}>+ Novo Lote</button>
                )}
              </div>
              {showNewLot && (
                <div className="card" style={{ marginBottom: 12 }}>
                  <div className="card-title" style={{ marginBottom: 12 }}>📦 Novo Lote</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 12, color: 'var(--cinza)', display: 'block', marginBottom: 4 }}>Nome do Lote *</label>
                      <input className="input" placeholder="Ex: V4422, Lote Janeiro..." value={newLotName} onChange={e => setNewLotName(e.target.value)} />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: 'var(--cinza)', display: 'block', marginBottom: 4 }}>Cliente / Empresa</label>
                      <input className="input" placeholder="Nome do cliente ou empresa" value={newLotClient} onChange={e => setNewLotClient(e.target.value)} />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: 'var(--cinza)', display: 'block', marginBottom: 4 }}>Status</label>
                      <select className="input" value={newLotStatus} onChange={e => setNewLotStatus(e.target.value)}>
                        {LOT_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="g2">
                      <div>
                        <label style={{ fontSize: 12, color: 'var(--cinza)', display: 'block', marginBottom: 4 }}>Data de Entrada</label>
                        <input className="input" type="date" value={newLotEntryDate} onChange={e => setNewLotEntryDate(e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, color: 'var(--cinza)', display: 'block', marginBottom: 4 }}>Data de Entrega</label>
                        <input className="input" type="date" value={newLotDeliveryDate} onChange={e => setNewLotDeliveryDate(e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: 'var(--cinza)', display: 'block', marginBottom: 4 }}>Observações</label>
                      <textarea className="input" value={newLotNotes} onChange={e => setNewLotNotes(e.target.value)} placeholder="Observações sobre este lote..." rows={2} style={{ resize: 'none' }} />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-dark" style={{ flex: 1 }} onClick={async () => {
                        if (!newLotName.trim()) return
                        const created = await addLot(newLotName.trim())
                        if (created?.id) {
                          const key = `lot_meta_${created.id}`
                          try { localStorage.setItem(key, JSON.stringify({ client: newLotClient, status: newLotStatus, entry_date: newLotEntryDate, delivery_date: newLotDeliveryDate, notes: newLotNotes })) } catch {}
                        }
                        setNewLotName(''); setNewLotClient(''); setNewLotStatus('Em Produção'); setNewLotEntryDate(''); setNewLotDeliveryDate(''); setNewLotNotes(''); setShowNewLot(false)
                      }}>✓ Criar Lote</button>
                      <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => { setShowNewLot(false); setNewLotName('') }}>Cancelar</button>
                    </div>
                  </div>
                </div>
              )}
              {lot && !showNewLot ? <FaccoesTab lot={lot} lotIdx={activeLotIdx} /> : (!showNewLot && (
                <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                  <div style={{ fontSize: 40 }}>🧵</div>
                  <div style={{ marginTop: 8 }}>Nenhum lote criado</div>
                  <button className="btn btn-dark" style={{ marginTop: 12 }} onClick={() => setShowNewLot(true)}>Criar primeiro lote</button>
                </div>
              ))}
            </>
          )}

          {currentTab === 'dre' && <DreTab lots={lots} userId={user?.id} />}
          {currentTab === 'vpl' && <VplTab userId={user?.id} />}
        </div>
      </div>
    </div>
  )
}
