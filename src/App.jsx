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
import AdminScreen from './screens/AdminScreen'
import WaitingApprovalScreen from './screens/WaitingApprovalScreen'
import NavBar from './components/NavBar'
import AddTransactionModal from './components/modals/AddTransactionModal'
import EditGoalModal from './components/modals/EditGoalModal'

const ADMIN_EMAIL = 'desedilson@hotmail.com'

export default function App() {
  const { state } = useContext(AppContext)
  const { authLoading, user, profile, activeTab, modal, offline } = state

  useEffect(() => {
    if (window.location.hash.includes('type=recovery')) {}
  }, [])

  if (authLoading) return <LoadingScreen />
  if (!user) return <LoginScreen />
  if (!profile) return <LoadingScreen />

  const isAdmin = user.email === ADMIN_EMAIL

  if (!isAdmin && profile.status !== 'approved') {
    return <WaitingApprovalScreen rejected={profile.status === 'rejected'} />
  }

  return (
    <div className="app">
      {offline && <div className="offline-badge">📡 Sem conexão — modo offline</div>}
      <Toast />
      <div className="content">
        {activeTab === 'dashboard'    && <DashboardScreen />}
        {activeTab === 'txs'          && <TransacoesScreen />}
        {activeTab === 'planejamento' && <PlanejamentoScreen />}
        {activeTab === 'negocio'      && <NegocioScreen />}
        {activeTab === 'mais'         && <RelatoriosScreen />}
        {activeTab === 'admin'        && isAdmin && <AdminScreen />}
      </div>
      <NavBar />
      <div className="app-bar">AJUSTE A CARTEIRA</div>
      {modal === 'add-tx'    && <AddTransactionModal />}
      {modal === 'edit-goal' && <EditGoalModal />}
    </div>
  )
}
