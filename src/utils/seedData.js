export const SEED_GOALS_TEMPLATE = [
  {
    name: 'Reserva de Emergência', icon: '🛡️', color: '#1d4ed8',
    target: 13254, current_val: 0, monthly: 400, rate: 0.8,
    invest: 'Tesouro Selic', description: '6× gastos mensais — prioridade!',
    position: 0, monthly_desired: 0,
  },
  {
    name: 'Viagem / Carro', icon: '✈️', color: '#15803d',
    target: 8000, current_val: 0, monthly: 200, rate: 1.0,
    invest: 'CDB liquidez diária', description: '1-2 anos',
    position: 1, monthly_desired: 0,
  },
  {
    name: 'Projeto 3-4 anos', icon: '🔨', color: '#c2410c',
    target: 15000, current_val: 0, monthly: 200, rate: 0.9,
    invest: 'Tesouro Prefixado', description: '3-4 anos',
    position: 2, monthly_desired: 0,
  },
  {
    name: 'Entrada da Casa', icon: '🔑', color: '#7c3aed',
    target: 50000, current_val: 0, monthly: 300, rate: 0.8,
    invest: 'Fundos imobiliários', description: '5-6 anos',
    position: 3, monthly_desired: 0,
  },
  {
    name: 'Independência Financeira', icon: '💎', color: '#b45309',
    target: 1200000, current_val: 0, monthly: 500, rate: 0.8,
    invest: 'Renda variável diversificada',
    description: '20 anos • FIRE', position: 4, monthly_desired: 4000,
  },
]

export const SEED_LOT_TEMPLATE = {
  name: 'Lote Exemplo', period: '',
  team_size: 5, hours_per_day: 8, work_days: 22,
}

export const SEED_LOT_ITEMS_TEMPLATE = [
  { ref: 'V001', description: 'Peça modelo A', value: 0, time_per_piece: '01:00:00', quantity: 10, position: 0 },
  { ref: 'V002', description: 'Peça modelo B', value: 0, time_per_piece: '00:45:00', quantity: 15, position: 1 },
]
