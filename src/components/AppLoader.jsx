import { useSyncExternalStore } from 'react'
import { getLoadingSnapshot, subscribeToLoading } from '../api/loadingStore'

function AppLoader() {
  const isLoading = useSyncExternalStore(
    subscribeToLoading,
    getLoadingSnapshot,
    getLoadingSnapshot,
  )

  if (!isLoading) {
    return null
  }

  return (
    <div className="app-loader-backdrop" role="status" aria-live="polite" aria-label="Loading">
      <div className="app-loader">
        <span className="app-loader-spinner" aria-hidden="true"></span>
        <strong>Loading</strong>
      </div>
    </div>
  )
}

export default AppLoader
