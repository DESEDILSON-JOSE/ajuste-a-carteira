export const R$ = v =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

export const pct = (v, d = 1) => `${Number(v || 0).toFixed(d)}%`

export const todayStr = () => new Date().toISOString().split('T')[0]

export const fmtDate = d =>
  d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : ''

export const fmtDateFull = d =>
  d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: 'short',
  }) : ''

export const parseTimeSecs = t => {
  const [h, m, s] = (t || '0:0:0').split(':').map(Number)
  return h * 3600 + m * 60 + (s || 0)
}

export const fmtHours = s => `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}min`

export const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export const CAT_COLOR = {
  'Alimentação': '#22c55e',
  'Habitação': '#3b82f6',
  'Transporte e Comunicação': '#f97316',
  'Saúde e Cuidados': '#ec4899',
  'Vestuário': '#a855f7',
  'Lazer': '#06b6d4',
  'Investimentos': '#f59e0b',
  'Despesas Pessoais': '#8b5cf6',
  'Educação': '#6366f1',
  'Trabalho': '#22c55e',
  'Trabalho Extra': '#4ade80',
  'Freelance': '#86efac',
  'Aluguel Recebido': '#34d399',
  'Outros': '#94a3b8',
}

export const CAT_ICON = {
  'Alimentação': '🍽️',
  'Habitação': '🏠',
  'Transporte e Comunicação': '🚗',
  'Saúde e Cuidados': '💊',
  'Vestuário': '👕',
  'Lazer': '🎬',
  'Investimentos': '📈',
  'Despesas Pessoais': '🧴',
  'Educação': '📚',
  'Trabalho': '💼',
  'Trabalho Extra': '⚡',
  'Freelance': '💻',
  'Aluguel Recebido': '🏘️',
  'Outros': '📌',
}

export const CATS_EXPENSE = [
  'Alimentação', 'Habitação', 'Transporte e Comunicação',
  'Saúde e Cuidados', 'Vestuário', 'Lazer', 'Investimentos',
  'Despesas Pessoais', 'Educação', 'Outros',
]

export const CATS_INCOME = [
  'Trabalho', 'Trabalho Extra', 'Freelance',
  'Aluguel Recebido', 'Investimentos', 'Outros',
]

export const ACCOUNTS = [
  'Dinheiro', 'Conta Corrente', 'Poupança',
  'Cartão de Crédito', 'Cartão de Débito',
]

export const translateError = err => {
  const map = {
    'Invalid login credentials': 'Email ou senha incorretos',
    'User already registered': 'Este email já está cadastrado',
    'Password should be at least 8': 'Senha deve ter no mínimo 8 caracteres',
    'Email not confirmed': 'Confirme seu email antes de entrar',
    'signup_disabled': 'Cadastros desativados temporariamente',
  }
  for (const [k, v] of Object.entries(map))
    if ((err?.message || '').includes(k)) return v
  return err?.message || 'Erro ao processar. Tente novamente.'
}
