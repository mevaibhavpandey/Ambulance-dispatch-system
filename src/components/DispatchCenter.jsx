import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../AppContext'

const PHASE_ICONS = {
  enroute_patient: '🚑', pickup: '⟳', enroute_hospital: '⚡', delivered: '✅',
}
const DISPATCH_COLORS = ['#cc0018', '#0055cc', '#007a3d', '#c46000', '#6a00cc']

export default function DispatchCenter() {
  const { state, set, executeDispatch, cancelDispatch, resetAll } = useApp()
  const { activeDispatches, canCancel, cancelCountdown, dispatchMode } = state

  const isActive   = activeDispatches.length > 0
  const allDone    = isActive && activeDispatches.every(d => d.ambPhase === 'delivered')

  const triggerSOS = () => executeDispatch({ mode: 'sos' })
  const triggerDirect = () => executeDispatch({ mode: 'direct' })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

      {/* SOS + Direct dispatch — always visible */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
        {/* SOS ring button */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <div className="sos-ring-1" style={{ width: 88, height: 88, position: 'absolute', top: -6, left: -6 }} />
          <button onClick={triggerSOS} style={{
            width: 76, height: 76, borderRadius: '50%',
            border: '2.5px solid #cc0018',
            background: isActive
              ? 'radial-gradient(circle, rgba(204,0,24,0.10), rgba(204,0,24,0.03))'
              : 'radial-gradient(circle, rgba(204,0,24,0.18), rgba(204,0,24,0.04))',
            boxShadow: '0 0 24px rgba(204,0,24,0.18), inset 0 0 16px rgba(204,0,24,0.06)',
            color: '#cc0018', fontFamily: 'Rajdhani', fontWeight: 800,
            fontSize: 22, letterSpacing: 3, cursor: 'pointer', transition: 'all 0.15s',
            position: 'relative', zIndex: 1,
          }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.06)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >SOS</button>
        </div>

        {/* Right-side buttons */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button onClick={triggerDirect} style={{
            flex: 1, padding: '9px 8px',
            background: 'linear-gradient(135deg, #cc0018, #990012)',
            border: 'none', color: '#fff', borderRadius: 8,
            fontFamily: 'Rajdhani', fontWeight: 700, fontSize: 11, letterSpacing: 1.5,
            cursor: 'pointer', transition: 'all 0.15s',
            boxShadow: '0 3px 10px rgba(204,0,24,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 5px 16px rgba(204,0,24,0.5)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 3px 10px rgba(204,0,24,0.35)' }}
          >
            🚑 DIRECT DISPATCH
          </button>

          {isActive && (
            <button onClick={resetAll} style={{
              flex: 1, padding: '6px 8px',
              background: 'transparent', border: '1px solid rgba(204,0,24,0.3)',
              color: '#8a6068', borderRadius: 6,
              fontFamily: 'Rajdhani', fontWeight: 600, fontSize: 10, letterSpacing: 1,
              cursor: 'pointer',
            }}>
              ✕ CLEAR ALL DISPATCHES
            </button>
          )}
        </div>
      </div>

      {/* Hints */}
      <div style={{ display: 'flex', gap: 6, fontFamily: 'Share Tech Mono', fontSize: 8, color: '#aaa', justifyContent: 'center' }}>
        <span>SOS = 60s cancel window</span>
        <span>·</span>
        <span>DIRECT = instant · no cancel</span>
      </div>

      {/* Active dispatches list */}
      {activeDispatches.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 2 }}>
          {activeDispatches.map((d, i) => {
            const color = DISPATCH_COLORS[i % DISPATCH_COLORS.length]
            const isDone = d.ambPhase === 'delivered'
            const latestRoutes = i === activeDispatches.length - 1 ? state.leg2AltRoutes : d.leg2AltRoutes
            const bestRoute = latestRoutes?.[0]

            return (
              <motion.div key={d.id}
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                style={{
                  background: '#fff',
                  border: `1px solid ${isDone ? 'rgba(0,122,61,0.25)' : color + '30'}`,
                  borderLeft: `4px solid ${isDone ? '#007a3d' : color}`,
                  borderRadius: 8, padding: '8px 10px',
                  boxShadow: `0 2px 8px ${color}10`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                      <span style={{ fontSize: 13 }}>{PHASE_ICONS[d.ambPhase] ?? '🚑'}</span>
                      <span style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: 11, color }}>
                        {d.ambulance?.vehicleId} · {d.ambulance?.type}
                      </span>
                    </div>
                    <div style={{ fontFamily: 'Share Tech Mono', fontSize: 9, color: '#888' }}>
                      {isDone ? '✓ Delivered to ' : '→ '}{d.hospital?.name?.slice(0, 28)}
                    </div>
                    {bestRoute && !isDone && (
                      <div style={{ fontFamily: 'Share Tech Mono', fontSize: 8.5, color, marginTop: 2 }}>
                        {bestRoute.distanceKm} km · ~{bestRoute.etaMin} min
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {d.ambPhase === 'enroute_patient'  && <span style={{ fontFamily: 'Rajdhani', fontSize: 9, color, fontWeight: 700 }}>EN ROUTE</span>}
                    {d.ambPhase === 'enroute_hospital' && <span style={{ fontFamily: 'Rajdhani', fontSize: 9, color: '#007a3d', fontWeight: 700 }}>TRANSPORTING</span>}
                    {isDone && <span style={{ fontFamily: 'Rajdhani', fontSize: 9, color: '#007a3d', fontWeight: 700 }}>DONE</span>}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Cancel window for latest SOS */}
      <AnimatePresence>
        {canCancel && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              background: 'rgba(196,96,0,0.06)', border: '1px solid rgba(196,96,0,0.3)',
              borderRadius: 8, padding: '8px 12px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: 10, color: '#c46000' }}>CANCEL WINDOW</div>
              <div style={{ fontFamily: 'Share Tech Mono', fontSize: 9, color: '#888' }}>{cancelCountdown}s remaining</div>
            </div>
            <button onClick={cancelDispatch} style={{
              background: '#fff', border: '1.5px solid #c46000', color: '#c46000',
              padding: '5px 12px', borderRadius: 6,
              fontFamily: 'Rajdhani', fontWeight: 700, fontSize: 10, cursor: 'pointer',
            }}>CANCEL</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hint when active */}
      {isActive && !allDone && (
        <div style={{ fontFamily: 'Share Tech Mono', fontSize: 8.5, color: '#8a6068', textAlign: 'center' }}>
          {activeDispatches.length} ambulance{activeDispatches.length > 1 ? 's' : ''} dispatched · Tap DISPATCH to send another
        </div>
      )}
    </div>
  )
}
