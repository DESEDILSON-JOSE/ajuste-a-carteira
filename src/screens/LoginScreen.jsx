import { useState } from 'react'
import { useApp } from '../context/AppContext'
import Spinner from '../components/Spinner'

export default function LoginScreen() {
  const { login, signup, resetPwd, addToast } = useApp()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ email: '', password: '', confirmPwd: '', name: '' })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [resetSent, setResetSent] = useState(false)

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })) }

  const validate = () => {
    const e = {}
    if (!form.email) e.email = 'Email obrigatório'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email inválido'
    if (mode !== 'forgot') {
      if (!form.password) e.password = 'Senha obrigatória'
      else if (form.password.length < 8) e.password = 'Mínimo 8 caracteres'
    }
    if (mode === 'signup') {
      if (!form.name) e.name = 'Nome obrigatório'
      if (form.confirmPwd !== form.password) e.confirmPwd = 'Senhas não coincidem'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(form.email, form.password)
      } else if (mode === 'signup') {
        await signup(form.email, form.password, form.name)
        addToast('Conta criada! Verifique seu email se necessário.', 'info')
      } else {
        await resetPwd(form.email)
        setResetSent(true)
      }
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = (field) => ({ marginBottom: 4, borderColor: errors[field] ? '#ef4444' : undefined })

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0f172a,#1e3a5f)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>💰</div>
        <div style={{ color: '#fff', fontSize: 22, fontWeight: 700, letterSpacing: 2 }}>AJUSTE A CARTEIRA</div>
        <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 13, marginTop: 4 }}>Finanças pessoais + Negócio</div>
      </div>

      {/* Card */}
      <div style={{ background: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 360 }}>
        {mode === 'forgot' ? (
          resetSent ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📧</div>
              <p style={{ fontWeight: 700, marginBottom: 8 }}>Email enviado!</p>
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>Verifique sua caixa de entrada e siga o link para redefinir sua senha.</p>
              <button className="btn btn-dark btn-full" onClick={() => { setMode('login'); setResetSent(false) }}>Voltar ao login</button>
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Esqueci a senha</h2>
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>Enviaremos um link para redefinir sua senha.</p>
              <label className="label">Email</label>
              <input className="input" type="email" placeholder="seu@email.com" value={form.email} onChange={e => set('email', e.target.value)} style={{ marginBottom: errors.email ? 4 : 16, ...inputStyle('email') }} />
              {errors.email && <p className="field-error">{errors.email}</p>}
              <button className="btn btn-dark btn-full" onClick={handleSubmit} disabled={loading} style={{ marginBottom: 12 }}>
                {loading ? <Spinner size={18} color="#fff" /> : 'Enviar Link'}
              </button>
              <button className="btn btn-ghost btn-full" onClick={() => setMode('login')}>Voltar ao login</button>
            </>
          )
        ) : (
          <>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>
              {mode === 'login' ? 'Entrar' : 'Criar Conta'}
            </h2>

            {mode === 'signup' && (
              <>
                <label className="label">Nome</label>
                <input className="input" placeholder="Seu nome" value={form.name} onChange={e => set('name', e.target.value)} style={{ marginBottom: errors.name ? 4 : 12, ...inputStyle('name') }} />
                {errors.name && <p className="field-error" style={{ marginBottom: 8 }}>{errors.name}</p>}
              </>
            )}

            <label className="label">Email</label>
            <input className="input" type="email" placeholder="seu@email.com" value={form.email} onChange={e => set('email', e.target.value)} style={{ marginBottom: errors.email ? 4 : 12, ...inputStyle('email') }} />
            {errors.email && <p className="field-error" style={{ marginBottom: 8 }}>{errors.email}</p>}

            <label className="label">Senha</label>
            <input className="input" type="password" placeholder="••••••••" value={form.password} onChange={e => set('password', e.target.value)} style={{ marginBottom: errors.password ? 4 : 12, ...inputStyle('password') }} />
            {errors.password && <p className="field-error" style={{ marginBottom: 8 }}>{errors.password}</p>}

            {mode === 'signup' && (
              <>
                <label className="label">Confirmar Senha</label>
                <input className="input" type="password" placeholder="••••••••" value={form.confirmPwd} onChange={e => set('confirmPwd', e.target.value)} style={{ marginBottom: errors.confirmPwd ? 4 : 12, ...inputStyle('confirmPwd') }} />
                {errors.confirmPwd && <p className="field-error" style={{ marginBottom: 8 }}>{errors.confirmPwd}</p>}
              </>
            )}

            {mode === 'login' && (
              <div style={{ textAlign: 'right', marginBottom: 16 }}>
                <button style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: 13, cursor: 'pointer' }} onClick={() => setMode('forgot')}>
                  Esqueci minha senha
                </button>
              </div>
            )}

            <button className="btn btn-dark btn-full" onClick={handleSubmit} disabled={loading} style={{ marginBottom: 12 }}>
              {loading ? <Spinner size={18} color="#fff" /> : mode === 'login' ? 'ENTRAR' : 'CRIAR CONTA'}
            </button>

            <div style={{ textAlign: 'center', fontSize: 13, color: '#64748b' }}>
              {mode === 'login' ? (
                <>Não tem conta?{' '}
                  <button style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontWeight: 600 }} onClick={() => setMode('signup')}>Criar conta</button>
                </>
              ) : (
                <>Já tem conta?{' '}
                  <button style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontWeight: 600 }} onClick={() => setMode('login')}>Entrar</button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
