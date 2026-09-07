import { useContext } from 'react'
import { AppContext } from '../context/AppContext'

export default function WaitingApprovalScreen({ rejected = false }) {
  const { logout } = useContext(AppContext)

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      padding: 24,
    }}>
      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        <div style={{ fontSize: 72, marginBottom: 20 }}>{rejected ? '🚫' : '⏳'}</div>

        <h2 style={{ color: '#f1f5f9', fontSize: 22, fontWeight: 800, margin: '0 0 12px 0' }}>
          {rejected ? 'Acesso Negado' : 'Aguardando Aprovação'}
        </h2>

        <p style={{ color: '#94a3b8', fontSize: 15, lineHeight: 1.7, margin: '0 0 28px 0' }}>
          {rejected
            ? 'Seu acesso foi negado pelo administrador. Entre em contato para mais informações.'
            : 'Sua conta foi criada! O administrador irá revisar e liberar seu acesso em breve.'}
        </p>

        <div style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16,
          padding: '16px 20px',
          marginBottom: 28,
        }}>
          <p style={{ color: '#64748b', fontSize: 13, margin: 0, lineHeight: 1.6 }}>
            📧 Contato do administrador:<br />
            <span style={{ color: '#60a5fa', fontWeight: 600 }}>desedilson@hotmail.com</span>
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: 'rgba(59,130,246,0.15)',
              border: '1px solid rgba(59,130,246,0.3)',
              borderRadius: 10,
              color: '#60a5fa',
              fontSize: 14,
              fontWeight: 600,
              padding: '10px 20px',
              cursor: 'pointer',
            }}
          >
            🔄 Verificar status
          </button>
          <button
            onClick={logout}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10,
              color: '#64748b',
              fontSize: 14,
              fontWeight: 600,
              padding: '10px 20px',
              cursor: 'pointer',
            }}
          >
            Sair
          </button>
        </div>
      </div>
    </div>
  )
}
