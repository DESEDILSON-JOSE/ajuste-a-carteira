import { useContext, useState } from 'react'
import { AppContext } from '../context/AppContext.jsx'

export default function LoginScreen() {
  const { login: signIn, signup: signUp, resetPwd: resetPassword } = useContext(AppContext)
  const [mode, setMode] = useState('login') // 'login' | 'signup' | 'reset'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    try {
      if (mode === 'login') {
        await signIn(email, password)
      } else if (mode === 'signup') {
        await signUp(email, password, name)
        setMessage('Conta criada! Verifique seu e-mail.')
      } else if (mode === 'reset') {
        await resetPassword(email)
        setMessage('Link enviado! Verifique seu e-mail.')
      }
    } catch (err) {
      setError(err.message || 'Ocorreu um erro. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const styles = {
    page: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
      padding: '20px',
    },
    container: {
      width: '100%',
      maxWidth: '420px',
    },
    logo: {
      textAlign: 'center',
      marginBottom: '32px',
    },
    logoIcon: {
      fontSize: '48px',
      marginBottom: '12px',
      display: 'block',
    },
    logoTitle: {
      fontSize: '26px',
      fontWeight: '800',
      color: '#ffffff',
      letterSpacing: '2px',
      margin: '0 0 4px 0',
    },
    logoSub: {
      fontSize: '13px',
      color: '#94a3b8',
      margin: 0,
      letterSpacing: '1px',
    },
    card: {
      background: 'rgba(255,255,255,0.05)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '20px',
      padding: '36px 32px',
      boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
    },
    cardTitle: {
      fontSize: '20px',
      fontWeight: '700',
      color: '#f1f5f9',
      margin: '0 0 24px 0',
    },
    formGroup: {
      marginBottom: '16px',
    },
    label: {
      display: 'block',
      fontSize: '13px',
      fontWeight: '600',
      color: '#94a3b8',
      marginBottom: '8px',
      letterSpacing: '0.5px',
    },
    input: {
      width: '100%',
      padding: '12px 16px',
      background: 'rgba(255,255,255,0.08)',
      border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: '10px',
      fontSize: '15px',
      color: '#f1f5f9',
      outline: 'none',
      boxSizing: 'border-box',
      transition: 'border-color 0.2s',
    },
    button: {
      width: '100%',
      padding: '13px',
      background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
      border: 'none',
      borderRadius: '10px',
      fontSize: '15px',
      fontWeight: '700',
      color: '#ffffff',
      cursor: 'pointer',
      marginTop: '8px',
      letterSpacing: '0.5px',
      transition: 'opacity 0.2s',
      opacity: loading ? 0.7 : 1,
    },
    linkBtn: {
      background: 'none',
      border: 'none',
      color: '#60a5fa',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '600',
      padding: '0',
      textDecoration: 'underline',
    },
    footer: {
      marginTop: '20px',
      textAlign: 'center',
      fontSize: '14px',
      color: '#64748b',
    },
    error: {
      background: 'rgba(239,68,68,0.15)',
      border: '1px solid rgba(239,68,68,0.3)',
      borderRadius: '8px',
      padding: '10px 14px',
      color: '#fca5a5',
      fontSize: '13px',
      marginBottom: '16px',
    },
    success: {
      background: 'rgba(34,197,94,0.15)',
      border: '1px solid rgba(34,197,94,0.3)',
      borderRadius: '8px',
      padding: '10px 14px',
      color: '#86efac',
      fontSize: '13px',
      marginBottom: '16px',
    },
    divider: {
      height: '1px',
      background: 'rgba(255,255,255,0.08)',
      margin: '20px 0',
    },
  }

  const titles = { login: 'Entrar na sua conta', signup: 'Criar nova conta', reset: 'Recuperar senha' }
  const btnLabels = { login: loading ? 'Entrando...' : 'Entrar', signup: loading ? 'Criando...' : 'Criar conta', reset: loading ? 'Enviando...' : 'Enviar link' }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>💰</span>
          <h1 style={styles.logoTitle}>AJUSTE A CARTEIRA</h1>
          <p style={styles.logoSub}>Finanças pessoais + Negócio</p>
        </div>

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>{titles[mode]}</h2>

          {error && <div style={styles.error}>⚠️ {error}</div>}
          {message && <div style={styles.success}>✅ {message}</div>}

          <form onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <div style={styles.formGroup}>
                <label style={styles.label}>NOME COMPLETO</label>
                <input
                  style={styles.input}
                  type="text"
                  placeholder="Seu nome"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>
            )}

            <div style={styles.formGroup}>
              <label style={styles.label}>E-MAIL</label>
              <input
                style={styles.input}
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            {mode !== 'reset' && (
              <div style={styles.formGroup}>
                <label style={styles.label}>SENHA</label>
                <input
                  style={styles.input}
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
            )}

            {mode === 'login' && (
              <div style={{ textAlign: 'right', marginBottom: '4px' }}>
                <button type="button" style={styles.linkBtn} onClick={() => { setMode('reset'); setError(''); setMessage('') }}>
                  Esqueci minha senha
                </button>
              </div>
            )}

            <button type="submit" style={styles.button} disabled={loading}>
              {btnLabels[mode]}
            </button>
          </form>

          <div style={styles.divider} />

          <div style={styles.footer}>
            {mode === 'login' && (
              <>Não tem conta?{' '}<button style={styles.linkBtn} onClick={() => { setMode('signup'); setError(''); setMessage('') }}>Criar conta</button></>
            )}
            {mode === 'signup' && (
              <>Já tem conta?{' '}<button style={styles.linkBtn} onClick={() => { setMode('login'); setError(''); setMessage('') }}>Entrar</button></>
            )}
            {mode === 'reset' && (
              <button style={styles.linkBtn} onClick={() => { setMode('login'); setError(''); setMessage('') }}>← Voltar ao login</button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
