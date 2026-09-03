import { useApp } from '../context/AppContext'

export default function Toast() {
  const { state } = useApp()
  const { toasts } = state

  return (
    <div className="toast-wrap">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          {t.type === 'success' ? '✓ ' : t.type === 'error' ? '✗ ' : 'ℹ '}{t.message}
        </div>
      ))}
    </div>
  )
}
