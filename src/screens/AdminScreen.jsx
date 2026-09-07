import { useState, useEffect, useContext } from 'react'
import { AppContext } from '../context/AppContext'
import { adminAPI } from '../utils/api'

const STATUS_LABEL = { pending: 'Pendente', approved: 'Aprovado', rejected: 'Rejeitado' }
const STATUS_COLOR = { pending: '#f59e0b', approved: '#22c55e', rejected: '#ef4444' }

function UserCard({ user, onApprove, onReject }) {
  const [loading, setLoading] = useState(false)

  const act = async (fn) => {
    setLoading(true)
    await fn()
    setLoading(false)
  }

  const date = user.created_at
    ? new Date(user.created_at).toLocaleDateString('pt-BR')
    : '—'

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 14,
      padding: '16px 18px',
      marginBottom: 10,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 15, margin: '0 0 3px 0' }}>
            {user.name || '(sem nome)'}
          </p>
          <p style={{ color: '#64748b', fontSize: 12, margin: '0 0 6px 0', wordBreak: 'break-all' }}>
            {user.email || user.id?.slice(0, 16) + '…'}
          </p>
          <span style={{
            display: 'inline-block',
            background: `${STATUS_COLOR[user.status] || '#64748b'}22`,
            border: `1px solid ${STATUS_COLOR[user.status] || '#64748b'}55`,
            color: STATUS_COLOR[user.status] || '#94a3b8',
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 700,
            padding: '2px 8px',
          }}>
            {STATUS_LABEL[user.status] || user.status}
          </span>
          <span style={{ color: '#475569', fontSize: 11, marginLeft: 8 }}>
            {date}
          </span>
        </div>

        {user.status !== 'approved' && (
          <button
            disabled={loading}
            onClick={() => act(onApprove)}
            style={{
              background: 'rgba(34,197,94,0.15)',
              border: '1px solid rgba(34,197,94,0.3)',
              borderRadius: 8,
              color: '#22c55e',
              fontSize: 13,
              fontWeight: 700,
              padding: '7px 14px',
              cursor: loading ? 'default' : 'pointer',
              opacity: loading ? 0.6 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            ✓ Aprovar
          </button>
        )}
        {user.status !== 'rejected' && (
          <button
            disabled={loading}
            onClick={() => act(onReject)}
            style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 8,
              color: '#ef4444',
              fontSize: 13,
              fontWeight: 700,
              padding: '7px 14px',
              cursor: loading ? 'default' : 'pointer',
              opacity: loading ? 0.6 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            ✗ Negar
          </button>
        )}
      </div>
    </div>
  )
}

export default function AdminScreen() {
  const { addToast } = useContext(AppContext)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')

  const loadUsers = async () => {
    try {
      setLoading(true)
      const data = await adminAPI.getAllProfiles()
      setUsers(data || [])
    } catch (err) {
      addToast('Erro ao carregar usuários', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadUsers() }, [])

  const handleStatus = async (userId, status) => {
    try {
      await adminAPI.updateStatus(userId, status)
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status } : u))
      addToast(status === 'approved' ? '✅ Usuário aprovado!' : '❌ Acesso negado')
    } catch (err) {
      addToast('Erro ao atualizar: ' + err.message, 'error')
    }
  }

  const counts = {
    pending: users.filter(u => u.status === 'pending').length,
    approved: users.filter(u => u.status === 'approved').length,
    rejected: users.filter(u => u.status === 'rejected').length,
  }

  const filtered = filter === 'all' ? users : users.filter(u => u.status === filter)

  const FILTERS = [
    { id: 'pending', label: `⏳ Pendentes (${counts.pending})` },
    { id: 'approved', label: `✅ Aprovados (${counts.approved})` },
    { id: 'rejected', label: `🚫 Negados (${counts.rejected})` },
    { id: 'all', label: `👥 Todos (${users.length})` },
  ]

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      padding: '24px 16px 100px',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: '#f1f5f9', fontSize: 22, fontWeight: 800, margin: '0 0 4px 0' }}>
          🛡️ Painel Admin
        </h1>
        <p style={{ color: '#475569', fontSize: 13, margin: 0 }}>
          Gerencie o acesso dos usuários ao app
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Pendentes', value: counts.pending, color: '#f59e0b' },
          { label: 'Aprovados', value: counts.approved, color: '#22c55e' },
          { label: 'Negados', value: counts.rejected, color: '#ef4444' },
        ].map(s => (
          <div key={s.label} style={{
            flex: 1,
            background: `${s.color}11`,
            border: `1px solid ${s.color}33`,
            borderRadius: 12,
            padding: '12px 8px',
            textAlign: 'center',
          }}>
            <div style={{ color: s.color, fontSize: 24, fontWeight: 800 }}>{s.value}</div>
            <div style={{ color: '#64748b', fontSize: 11, fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            style={{
              background: filter === f.id ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.04)',
              border: filter === f.id ? '1px solid rgba(59,130,246,0.4)' : '1px solid rgba(255,255,255,0.08)',
              borderRadius: 20,
              color: filter === f.id ? '#60a5fa' : '#64748b',
              fontSize: 12,
              fontWeight: 600,
              padding: '6px 14px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Refresh */}
      <button
        onClick={loadUsers}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#3b82f6',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          padding: '0 0 12px 0',
          display: 'block',
        }}
      >
        🔄 Atualizar lista
      </button>

      {/* Users list */}
      {loading ? (
        <p style={{ color: '#475569', textAlign: 'center', marginTop: 40 }}>Carregando...</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: '#475569', textAlign: 'center', marginTop: 40 }}>
          Nenhum usuário {filter !== 'all' ? STATUS_LABEL[filter]?.toLowerCase() : ''} encontrado.
        </p>
      ) : (
        filtered.map(user => (
          <UserCard
            key={user.id}
            user={user}
            onApprove={() => handleStatus(user.id, 'approved')}
            onReject={() => handleStatus(user.id, 'rejected')}
          />
        ))
      )}
    </div>
  )
}
