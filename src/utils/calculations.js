export const monthsToGoal = (target, current, monthly, rate) => {
  if (current >= target) return 0
  const need = target - current
  const r = (rate || 0) / 100
  if (r <= 0 || monthly <= 0) return Math.ceil(need / (monthly || 1))
  return Math.ceil(Math.log(1 + (need * r) / monthly) / Math.log(1 + r))
}

export const projectFIRE = (current, monthly, rate, totalMonths) => {
  const r = (rate || 0) / 100
  let pat = current
  const pts = []
  for (let m = 0; m <= totalMonths; m += 12) {
    pts.push({ ano: `Ano ${Math.floor(m / 12)}`, patrimônio: Math.round(pat / 1000) })
    for (let i = 0; i < 12; i++) pat = pat * (1 + r) + monthly
  }
  return pts
}

export const calcScore = (goals, transactions, income) => {
  const emerg = goals.find(g => g.position === 0)
  const emergScore = emerg
    ? Math.min(200, (emerg.current_val / emerg.target) * 200) : 0
  const totalAporte = goals.reduce((s, g) => s + (g.monthly || 0), 0)
  const savingRate = income > 0 ? (totalAporte / income) * 100 : 0
  const savingScore = Math.min(200, savingRate * 10)
  const goalScore = Math.min(100, goals.filter(g => g.current_val > 0).length * 20)
  const noOverdue = transactions.filter(t =>
    t.type === 'expense' && !t.paid && t.date < new Date().toISOString().split('T')[0]
  ).length === 0
  const diversScore = Math.min(150, goals.length * 30)
  return Math.round(Math.min(1000,
    emergScore + savingScore + goalScore + (noOverdue ? 150 : 0) + diversScore + 50))
}

export const calcVPL = (inv, fluxos, taxa) => {
  const r = taxa / 100
  return fluxos.reduce((v, fc, i) => v + fc / Math.pow(1 + r, i + 1), 0) - inv
}

export const calcTIR = (inv, fluxos) => {
  let tir = 0.1
  for (let it = 0; it < 1000; it++) {
    const v = fluxos.reduce((s, fc, i) => s + fc / Math.pow(1 + tir, i + 1), 0) - inv
    const dv = fluxos.reduce((s, fc, i) => s - (i + 1) * fc / Math.pow(1 + tir, i + 2), 0)
    if (Math.abs(dv) < 1e-10) break
    const t2 = tir - v / dv
    if (Math.abs(t2 - tir) < 1e-8) { tir = t2; break }
    tir = t2
  }
  return tir * 100
}

export const calcPayback = (inv, fluxos) => {
  let ac = -inv
  for (let i = 0; i < fluxos.length; i++) {
    ac += fluxos[i]
    if (ac >= 0) return i + 1
  }
  return null
}

export const calcIL = (inv, fluxos, taxa) => {
  const r = taxa / 100
  const pvSum = fluxos.reduce((s, fc, i) => s + fc / Math.pow(1 + r, i + 1), 0)
  return inv > 0 ? pvSum / inv : 0
}
