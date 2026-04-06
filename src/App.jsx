import React, { useEffect } from 'react'
import { AppProvider, useApp } from './AppContext'
import LeftPanel from './components/LeftPanel'
import MapView from './components/MapView'
import MapOverlay from './components/MapOverlay'

function AppInner() {
  const { log } = useApp()

  useEffect(() => {
    log('AMBUAI Dispatch System v1.0 initialized', 'success')
    log('Bengaluru hospital grid loading...', 'info')
  }, [])

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', position: 'relative' }}>
      <div className="grid-bg" />
      <div className="scan-line" />
      <LeftPanel />
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <MapView />
        <MapOverlay />
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  )
}
