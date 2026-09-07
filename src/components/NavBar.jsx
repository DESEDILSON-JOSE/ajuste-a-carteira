import { useApp } from '../context/AppContext'

const NAV = [
  { id: 'dashboard', icon: '🏠', label: 'Principal' },
  { id: 'txs', icon: '💳', label: 'Transações' },
  { id: '__fab__', icon: '+', label: '' },
  { id: 'planejamento', icon: '🎯', label: 'Planejar' },
  { id: 'negocio', icon: '💼', label: 'Negócio' },
]

export default function NavBar() {
  const { state, dispatch } = useApp()
  const { activeTab } = state

  const handleNav = (id) => {
    if (id === '__fab__') {
      dispatch({ type: 'SET_MODAL', modal: 'add-tx' })
    } else {
      dispatch({ type: 'SET_TAB', tab: id })
    }
  }

  return (
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
      {NAV.map(item =>
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
              background: activeTab === item.id ? 'rgba(59,130,246,0.18)' : 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '6px 14px',
              borderRadius: 16,
              color: activeTab === item.id ? '#60a5fa' : '#475569',
              fontFamily: 'inherit',
              transition: 'all 0.2s',
              minWidth: 56,
            }}
          >
            <span style={{ fontSize: 19 }}>{item.icon}</span>
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.2 }}>{item.label}</span>
          </button>
        )
      )}
    </nav>
  )
}
