import { useState } from 'react'
import { useApp } from '../context/AppContext'

const ADMIN_EMAIL = 'desedilson@gmail.com'

export default function NavBar() {
  const { state, dispatch } = useApp()
  const { activeTab, user } = state
  const isAdmin = user?.email === ADMIN_EMAIL
  const [maisOpen, setMaisOpen] = useState(false)

  const mainTabs = [
    { id: 'dashboard',    icon: '🏠', label: 'Principal' },
    { id: 'txs',          icon: '💳', label: 'Transações' },
    { id: '__fab__',      icon: '+',  label: '' },
    { id: 'planejamento', icon: '🎯', label: 'Planejar' },
    { id: '__mais__',     icon: '···', label: 'Mais' },
  ]

  const maisOptions = isAdmin
    ? [
        { id: 'admin',    icon: '🛡️', label: 'Admin' },
        { id: 'gastos',   icon: '📊', label: 'Rastreio' },
        { id: 'negocio',  icon: '💼', label: 'Negócio' },
        { id: 'mais',     icon: '📈', label: 'Relatórios' },
      ]
    : [
        { id: 'gastos',   icon: '📊', label: 'Rastreio' },
        { id: 'negocio',  icon: '💼', label: 'Negócio' },
        { id: 'mais',     icon: '📈', label: 'Relatórios' },
      ]

  const maisActiveIds = maisOptions.map(o => o.id)
  const maisIsActive = maisActiveIds.includes(activeTab)

  const handleNav = (id) => {
    if (id === '__fab__') {
      setMaisOpen(false)
      dispatch({ type: 'SET_MODAL', modal: 'add-tx' })
    } else if (id === '__mais__') {
      setMaisOpen(prev => !prev)
    } else {
      setMaisOpen(false)
      dispatch({ type: 'SET_TAB', tab: id })
    }
  }

  return (
    <>
      {/* Overlay to close popup */}
      {maisOpen && (
        <div
          onClick={() => setMaisOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 99,
          }}
        />
      )}

      {/* Mais popup menu */}
      {maisOpen && (
        <div style={{
          position: 'fixed',
          bottom: '90px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(15,23,42,0.98)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: '20px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.1)',
          padding: '8px',
          zIndex: 101,
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          minWidth: '160px',
        }}>
          {maisOptions.map(opt => (
            <button
              key={opt.id}
              onClick={() => handleNav(opt.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: activeTab === opt.id ? 'rgba(59,130,246,0.25)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '12px 16px',
                borderRadius: '12px',
                color: activeTab === opt.id ? '#60a5fa' : '#94a3b8',
                fontFamily: 'inherit',
                fontSize: '14px',
                fontWeight: 600,
                width: '100%',
                textAlign: 'left',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 20 }}>{opt.icon}</span>
              {opt.label}
            </button>
          ))}
        </div>
      )}

      <nav style={{
        position: 'fixed',
        bottom: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 24px)',
        maxWidth: '406px',
        background: 'rgba(15,23,42,0.96)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRadius: '30px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '10px 8px',
        zIndex: 100,
        border: '1px solid rgba(255,255,255,0.08)',
        overflow: 'visible',
      }}>
        {mainTabs.map(item =>
          item.id === '__fab__' ? (
            <button
              key="fab"
              onClick={() => handleNav('__fab__')}
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                color: '#fff',
                fontSize: 30,
                border: '3px solid rgba(15,23,42,0.96)',
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(59,130,246,0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: '-26px',
                lineHeight: 1,
                flexShrink: 0,
              }}
            >+</button>
          ) : (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                background: (item.id === '__mais__' ? (maisOpen || maisIsActive) : activeTab === item.id)
                  ? 'rgba(59,130,246,0.18)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '6px 14px',
                borderRadius: 16,
                color: (item.id === '__mais__' ? (maisOpen || maisIsActive) : activeTab === item.id)
                  ? '#60a5fa' : '#475569',
                fontFamily: 'inherit',
                transition: 'all 0.2s',
                minWidth: 56,
              }}
            >
              <span style={{ fontSize: item.id === '__mais__' ? 14 : 19, fontWeight: item.id === '__mais__' ? 700 : 400 }}>
                {item.icon}
              </span>
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.2 }}>{item.label}</span>
            </button>
          )
        )}
      </nav>
    </>
  )
}
