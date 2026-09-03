import { useContext, useEffect } from 'react'
import { AppContext } from './context/AppContext'
import LoadingScreen from './components/LoadingScreen'
import Toast from './components/Toast'
import LoginScreen from './screens/LoginScreen'
import DashboardScreen from './screens/DashboardScreen'
import TransacoesScreen from './screens/TransacoesScreen'
import PlanejamentoScreen from './screens/PlanejamentoScreen'
import NegocioScreen from './screens/NegocioScreen'
import RelatoriosScreen from './screens/RelatoriosScreen'
import NavBar from './components/NavBar'
import AddTransactionModal from './components/modals/AddTransactionModal'
import EditGoalModal from './components/modals/EditGoalModal'

export default function App() {
  const { state } = useContext(AppContext)
  const { authLoading, user, activeTab, modal, offline } = state

  useEffect(() => {
    if (window.location.hash.includes('type=recovery')) {
      // Redirect handled by Supabase auth; session update triggers context
    }
  }, [])

  if (authLoading) return <LoadingScreen />

  return (
    <div className="app">
      {offline && <div className="offline-badge">📡 Sem conexão — modo offline</div>}
      <Toast />
      {!user ? (
        <LoginScreen />
      ) : (
        <>
          <div className="content">
            {activeTab === 'dashboard'    && <DashboardScreen />}
            {activeTab === 'txs'          && <TransacoesScreen />}
            {activeTab === 'planejamento' && <PlanejamentoScreen />}
            {activeTab === 'negocio'      && <NegocioScreen />}
            {activeTab === 'mais'         && <RelatoriosScreen />}
          </div>
          <NavBar />
          <div className="app-bar">AJUSTE A CARTEIRA</div>
          {modal === 'add-tx'    && <AddTransactionModal />}
          {modal === 'edit-goal' && <EditGoalModal />}
        </>
      )}
    </div>
  )
}
