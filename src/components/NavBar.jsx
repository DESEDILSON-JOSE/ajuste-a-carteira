import { useApp } from '../context/AppContext'

const NAV = [
  { id: 'dashboard', icon: '🏠', label: 'Principal' },
  { id: 'txs', icon: '💳', label: 'Transações' },
  { id: '__fab__', icon: '+', label: '' },
  { id: 'planejamento', icon: '🎯', label: 'Planejar' },
  { id: 'mais', icon: '···', label: 'Mais' },
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
    <nav className="nav">
      {NAV.map(item =>
        item.id === '__fab__' ? (
          <button key="fab" className="nav-fab" onClick={() => handleNav('__fab__')}>
            +
          </button>
        ) : (
          <button
            key={item.id}
            className={`nav-btn${activeTab === item.id ? ' active' : ''}`}
            onClick={() => handleNav(item.id)}
          >
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        )
      )}
    </nav>
  )
}
