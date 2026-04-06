import React from 'react'
import { useApp } from '../AppContext'
import { rankHospitals } from '../services/hospitalService'

const emTypes = [
  { id: 'cardiac', label: 'Cardiac', critical: true, icon: '🫀' },
  { id: 'neurological', label: 'Neurological', critical: true, icon: '🧠' },
  { id: 'trauma', label: 'Trauma', critical: true, icon: '🩹' },
  { id: 'toxicological', label: 'Toxicological', critical: false, icon: '☠️' },
  { id: 'respiratory', label: 'Respiratory', critical: false, icon: '🫁' },
  { id: 'general', label: 'General', critical: false, icon: '🏥' },
]

export default function EmergencyTypePanel() {
  const { state, set, log } = useApp()
  const { emType, hospitals, location } = state

  const select = (type) => {
    set({ emType: type })
    log(`Emergency type: ${type.toUpperCase()}`, 'warn')
    if (location && hospitals.length > 0) {
      const ranked = rankHospitals(hospitals, type, location.lat, location.lng, 999)
      set({ rankedHospitals: ranked, selectedHospital: ranked[0] || null })
    }
  }

  return (
    <div>
      <div className="panel-title">◈ EMERGENCY TYPE</div>
      <div className="grid grid-cols-2 gap-1.5">
        {emTypes.map(t => (
          <button
            key={t.id}
            onClick={() => select(t.id)}
            className={`em-btn ${t.critical ? 'critical' : ''} ${emType === t.id ? 'selected' : ''}`}
          >
            <span style={{ fontSize: 13 }}>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>
      {emType && (
        <div className="font-mono mt-2" style={{ fontSize: 10, color: 'var(--text-dim)' }}>
          {'>'} {emType.toUpperCase()} SELECTED
        </div>
      )}
    </div>
  )
}
