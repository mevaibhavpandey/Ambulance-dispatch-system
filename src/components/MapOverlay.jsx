import React from 'react'
import { useApp } from '../AppContext'

const DISPATCH_COLORS = ['#cc0018', '#0055cc', '#007a3d', '#c46000', '#6a00cc']
const PHASE_LABELS    = { enroute_patient: 'TO PATIENT', pickup: 'LOADING', enroute_hospital: 'TO HOSPITAL', delivered: 'DELIVERED' }

export default function MapOverlay() {
  const { state } = useApp()
  const { sosPhase, hospitals, activeDispatches, leg2AltRoutes, location } = state
  const isActive = activeDispatches.length > 0

  return (
    <>
      {/* ── Top-left: global status chip ──────────────────────────── */}
      <div style={{
        position: 'absolute', top: 12, left: 12, zIndex: 500,
        background: 'rgba(255,255,255,0.97)',
        border: `1.5px solid ${isActive ? '#cc0018' : 'rgba(200,0,24,0.2)'}`,
        borderRadius: 8, padding: '7px 13px',
        fontFamily: 'Share Tech Mono', fontSize: 10,
        color: isActive ? '#cc0018' : '#555',
        display: 'flex', alignItems: 'center', gap: 8,
        pointerEvents: 'none',
        boxShadow: '0 2px 10px rgba(200,0,24,0.1)',
      }}>
        <span style={{
          width: 7, height: 7, borderRadius: '50%', display: 'inline-block',
          background: isActive ? '#cc0018' : '#007a3d',
          boxShadow: isActive ? '0 0 6px #cc0018' : '0 0 6px #007a3d',
        }} className="pulse-dot" />
        {isActive
          ? `${activeDispatches.length} ACTIVE DISPATCH${activeDispatches.length > 1 ? 'ES' : ''}`
          : 'STANDBY · BENGALURU GRID'}
      </div>

      {/* ── Top-right: active dispatch cards ──────────────────────── */}
      {activeDispatches.length > 0 && (
        <div style={{
          position: 'absolute', top: 12, right: 12, zIndex: 500,
          display: 'flex', flexDirection: 'column', gap: 5,
          maxWidth: 230, pointerEvents: 'none',
        }}>
          {activeDispatches.map((d, i) => {
            const color = DISPATCH_COLORS[i % DISPATCH_COLORS.length]
            const routes = (i === activeDispatches.length - 1 ? leg2AltRoutes : d.leg2AltRoutes) ?? []
            const best   = routes[0]
            return (
              <div key={d.id} style={{
                background: 'rgba(255,255,255,0.97)',
                border: `1.5px solid ${color}`,
                borderLeft: `4px solid ${color}`,
                borderRadius: 8, padding: '6px 10px',
                boxShadow: `0 2px 8px ${color}25`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: 11, color }}>
                    🚑 {d.ambulance?.vehicleId}
                  </span>
                  <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 8, background: `${color}15`, color, fontWeight: 700 }}>
                    {PHASE_LABELS[d.ambPhase] ?? 'EN ROUTE'}
                  </span>
                </div>
                <div style={{ fontFamily: 'Share Tech Mono', fontSize: 9, color: '#555', marginBottom: 1 }}>
                  → {d.hospital?.name?.slice(0, 24)}
                </div>
                {best && d.ambPhase !== 'delivered' && (
                  <div style={{ fontFamily: 'Share Tech Mono', fontSize: 8.5, color }}>
                    {best.distanceKm} km · ~{best.etaMin} min
                    {best.trafficDelayMin > 0 && ` · +${best.trafficDelayMin}m delay`}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Bottom centre: route legend ────────────────────────────── */}
      {isActive && leg2AltRoutes?.length > 0 && (
        <div style={{
          position: 'absolute', bottom: 36, left: '50%', transform: 'translateX(-50%)',
          zIndex: 500,
          background: 'rgba(255,255,255,0.97)',
          border: '1.5px solid rgba(200,0,24,0.2)',
          borderRadius: 20, padding: '6px 16px',
          fontFamily: 'Share Tech Mono', fontSize: 9.5,
          display: 'flex', gap: 14, alignItems: 'center',
          pointerEvents: 'none',
          boxShadow: '0 2px 10px rgba(200,0,24,0.1)',
        }}>
          {leg2AltRoutes.map((r, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ display: 'inline-block', width: 18, height: i === 0 ? 3.5 : 2, background: r.color, borderRadius: 2, opacity: i === 0 ? 1 : 0.6 }} />
              <span style={{ color: r.color, fontWeight: 700 }}>{r.label}</span>
            </span>
          ))}
        </div>
      )}

      {/* ── Bottom-right: hospital + click hint ───────────────────── */}
      <div style={{
        position: 'absolute', bottom: 36, right: 12, zIndex: 500,
        display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-end',
        pointerEvents: 'none',
      }}>
        {hospitals.length > 0 && (
          <div style={{
            background: 'rgba(255,255,255,0.97)', border: '1px solid rgba(200,0,24,0.25)',
            borderRadius: 6, padding: '5px 10px',
            fontFamily: 'Share Tech Mono', fontSize: 9,
            display: 'flex', alignItems: 'center', gap: 5,
            boxShadow: '0 1px 6px rgba(200,0,24,0.08)',
          }}>
            <div style={{ width: 12, height: 12, background: '#cc0018', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontWeight: 900, fontSize: 8 }}>H</span>
            </div>
            <span style={{ color: '#cc0018', fontWeight: 700 }}>{hospitals.length} hospitals</span>
          </div>
        )}
        <div style={{
          background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(200,0,24,0.12)',
          borderRadius: 6, padding: '4px 10px',
          fontFamily: 'Share Tech Mono', fontSize: 8.5, color: '#8a6068',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}>
          📍 Click map to set patient location
        </div>
      </div>
    </>
  )
}
