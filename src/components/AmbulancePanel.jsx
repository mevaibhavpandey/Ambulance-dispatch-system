import React from 'react'
import { useApp } from '../AppContext'
import { haversine } from '../utils/geo'

const TYPE_COLORS = { ICU: '#cc0018', BASIC: '#0055cc', NEONATAL: '#6a00cc' }
const PHASE_DOT   = { enroute_patient: '#cc0018', enroute_hospital: '#cc0018', delivered: '#007a3d', pickup: '#c46000' }

export default function AmbulancePanel() {
  const { state, executeDispatch } = useApp()
  const { ambulanceFleet, selectedAmbulance, location, sosPhase, ambPhase } = state

  const sorted = [...ambulanceFleet].map(a => {
    const dist = location ? haversine(location.lat, location.lng, a.lat, a.lng) : null
    const eta  = dist ? Math.ceil((dist / 7) * 60) : null // ~40km/h avg
    return { ...a, dist, eta }
  }).sort((a, b) => (a.dist ?? 999) - (b.dist ?? 999))

  if (sorted.length === 0) return (
    <div style={{ textAlign: 'center', padding: 24, color: '#8a6068', fontFamily: 'Rajdhani', fontSize: 12 }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>🚑</div>
      Set your location to see nearby ambulances
    </div>
  )

  return (
    <div>
      <SectionHeader icon="🚑" count={sorted.length} label="NEARBY AMBULANCES" />
      {sorted.map((amb, i) => {
        const isActive   = selectedAmbulance?.id === amb.id && sosPhase === 'dispatched'
        const typeColor  = TYPE_COLORS[amb.type] ?? '#cc0018'
        return (
          <div key={amb.id} style={{
            background: '#fff',
            border: `1px solid ${isActive ? '#cc0018' : 'rgba(200,0,24,0.12)'}`,
            borderLeft: `4px solid ${isActive ? '#cc0018' : typeColor}`,
            borderRadius: 8, padding: '10px 12px', marginBottom: 8,
            transition: 'all 0.2s',
            boxShadow: isActive ? '0 3px 12px rgba(204,0,24,0.18)' : '0 1px 4px rgba(0,0,0,0.04)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 14 }}>🚑</span>
                  <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: 13, color: '#1a1a1a' }}>
                    {amb.vehicleId}
                  </div>
                  <span style={{
                    fontSize: 9, padding: '2px 6px', borderRadius: 10, fontWeight: 700,
                    background: typeColor + '18', color: typeColor, border: `1px solid ${typeColor}40`,
                  }}>{amb.type}</span>
                  {isActive && (
                    <span style={{
                      fontSize: 9, padding: '2px 6px', borderRadius: 10, fontWeight: 700,
                      background: 'rgba(204,0,24,0.1)', color: '#cc0018', border: '1px solid rgba(204,0,24,0.25)',
                    }}>ACTIVE</span>
                  )}
                </div>

                {/* Stats */}
                <div style={{ display: 'flex', gap: 12, fontFamily: 'Share Tech Mono', fontSize: 9, color: '#888' }}>
                  {amb.dist != null && <span>📍 {amb.dist.toFixed(1)} km</span>}
                  {amb.eta  != null && <span>⏱ ~{amb.eta} min</span>}
                  <span style={{ color: '#007a3d' }}>● AVAILABLE</span>
                </div>

                {/* Active phase */}
                {isActive && (
                  <div style={{ marginTop: 4, fontFamily: 'Rajdhani', fontSize: 10, color: '#cc0018', fontWeight: 600 }}>
                    {ambPhase === 'enroute_patient'  && '→ En route to patient'}
                    {ambPhase === 'pickup'           && '⟳ Loading patient'}
                    {ambPhase === 'enroute_hospital' && '→ Heading to hospital'}
                    {ambPhase === 'delivered'        && '✓ Patient delivered'}
                  </div>
                )}
              </div>

              {/* Dispatch button — available if this ambulance is not already active */}
              {!isActive && (
                <button
                  onClick={() => executeDispatch({ mode: 'direct', ambulance: amb })}
                  style={{
                    background: 'linear-gradient(135deg, #cc0018, #990012)',
                    border: 'none', color: '#fff',
                    padding: '6px 10px', borderRadius: 6,
                    fontFamily: 'Rajdhani', fontWeight: 700, fontSize: 10, letterSpacing: 1,
                    cursor: 'pointer', flexShrink: 0, marginLeft: 8,
                    boxShadow: '0 2px 6px rgba(204,0,24,0.3)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  DISPATCH
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function SectionHeader({ icon, count, label }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      paddingBottom: 8, marginBottom: 10,
      borderBottom: '1.5px solid rgba(204,0,24,0.12)',
    }}>
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: 10, color: '#cc0018', letterSpacing: 2, flex: 1 }}>
        {label}
      </span>
      {count != null && (
        <span style={{
          background: '#cc0018', color: '#fff', fontSize: 9, fontWeight: 700,
          padding: '2px 7px', borderRadius: 10,
        }}>{count}</span>
      )}
    </div>
  )
}
