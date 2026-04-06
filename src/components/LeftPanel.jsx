import React, { useState, useEffect } from 'react'
import { useApp } from '../AppContext'
import DispatchCenter from './DispatchCenter'
import LocationPanel from './LocationPanel'
import EmergencyTypePanel from './EmergencyTypePanel'
import SpeedControl from './SpeedControl'
import AmbulancePanel from './AmbulancePanel'
import HospitalPanel from './HospitalPanel'
import RoutePanel from './RoutePanel'

const TABS = [
  { id: 'dispatch',   label: 'DISPATCH', icon: '⚡' },
  { id: 'fleet',      label: 'FLEET',    icon: '🚑' },
  { id: 'hospitals',  label: 'HOSPITALS',icon: '🏥' },
  { id: 'routes',     label: 'ROUTES',   icon: '🗺️' },
]

export default function LeftPanel() {
  const { state, set } = useApp()
  const { bystander, sosPhase, leg2AltRoutes, rerouteAvailable, ambulanceFleet, rankedHospitals } = state
  const [tab, setTab] = useState('dispatch')

  // Auto-switch to ROUTES when dispatched and routes ready
  useEffect(() => {
    if (leg2AltRoutes?.length > 0 && sosPhase === 'dispatched') setTab('routes')
  }, [leg2AltRoutes?.length, sosPhase])

  const hasRouteBadge = (leg2AltRoutes?.length > 0 || rerouteAvailable) && tab !== 'routes'
  const fleetCount    = ambulanceFleet.length
  const hospCount     = rankedHospitals.length

  return (
    <div style={{
      width: 370, minWidth: 340, maxWidth: 400,
      height: '100vh',
      background: '#fafafa',
      borderRight: '1px solid rgba(204,0,24,0.1)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden', flexShrink: 0,
      boxShadow: '2px 0 20px rgba(204,0,24,0.07)',
    }}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div style={{
        padding: '12px 16px',
        background: '#fff',
        borderBottom: '1px solid rgba(204,0,24,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0, boxShadow: '0 1px 6px rgba(204,0,24,0.06)',
      }}>
        <div>
          <div style={{
            fontFamily: 'Rajdhani', fontWeight: 800, fontSize: 18,
            color: '#cc0018', letterSpacing: 3,
            background: 'linear-gradient(135deg, #cc0018, #880010)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            AMBUAI
          </div>
          <div style={{ fontFamily: 'Share Tech Mono', fontSize: 9, color: '#8a6068', marginTop: 1, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#007a3d', display: 'inline-block' }} className="pulse-dot" />
            BENGALURU EMERGENCY GRID · ONLINE
          </div>
        </div>
        <button
          onClick={() => set({ bystander: !bystander })}
          style={{
            border: `1px solid ${bystander ? '#d96000' : 'rgba(204,0,24,0.2)'}`,
            background: bystander ? 'rgba(217,96,0,0.08)' : 'transparent',
            color: bystander ? '#d96000' : '#8a6068',
            fontFamily: 'Rajdhani', fontSize: 9, fontWeight: 700,
            letterSpacing: 1, padding: '5px 10px', borderRadius: 6, cursor: 'pointer',
          }}
        >
          {bystander ? '◉ BYSTANDER' : '○ BYSTANDER'}
        </button>
      </div>

      {/* ── Dispatch area (always visible) ─────────────────────────── */}
      <div style={{
        padding: '14px 16px',
        borderBottom: '1px solid rgba(204,0,24,0.1)',
        background: sosPhase !== 'idle' ? 'rgba(204,0,24,0.025)' : '#fff',
        flexShrink: 0,
      }}>
        <DispatchCenter />
      </div>

      {/* ── Speed control ──────────────────────────────────────────── */}
      <div style={{
        padding: '10px 16px',
        borderBottom: '1px solid rgba(204,0,24,0.08)',
        background: '#fff', flexShrink: 0,
      }}>
        <SpeedControl />
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        background: '#fff',
        borderBottom: '1px solid rgba(204,0,24,0.1)',
        flexShrink: 0,
      }}>
        {TABS.map(t => {
          const badge =
            t.id === 'routes' ? hasRouteBadge :
            t.id === 'fleet'  ? fleetCount > 0 && tab !== 'fleet' :
            false
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: '9px 2px',
              fontFamily: 'Rajdhani', fontSize: 9, fontWeight: 700, letterSpacing: 1.2,
              border: 'none',
              borderBottom: tab === t.id ? '2.5px solid #cc0018' : '2.5px solid transparent',
              background: 'transparent',
              color: tab === t.id ? '#cc0018' : '#8a6068',
              cursor: 'pointer', transition: 'all 0.15s',
              position: 'relative',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            }}>
              <span style={{ fontSize: 12 }}>{t.icon}</span>
              {t.label}
              {badge && (
                <span style={{
                  position: 'absolute', top: 4, right: 6,
                  width: 7, height: 7, borderRadius: '50%', background: '#cc0018',
                }} className="pulse-dot" />
              )}
            </button>
          )
        })}
      </div>

      {/* ── Scrollable content ─────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {tab === 'dispatch' && (
          <>
            <LocationPanel />
            {!bystander && <EmergencyTypePanel />}
            {bystander && (
              <div style={{
                padding: '10px 12px', border: '1px solid rgba(217,96,0,0.3)',
                borderRadius: 8, background: 'rgba(217,96,0,0.05)',
              }}>
                <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: 11, color: '#d96000', marginBottom: 4 }}>
                  BYSTANDER MODE
                </div>
                <div style={{ fontSize: 11, color: '#555', lineHeight: 1.6, fontFamily: 'Rajdhani' }}>
                  Press <strong style={{ color: '#cc0018' }}>SOS</strong> or <strong style={{ color: '#cc0018' }}>DIRECT DISPATCH</strong> to get help immediately.
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'fleet'     && <AmbulancePanel />}
        {tab === 'hospitals' && <HospitalPanel />}
        {tab === 'routes'    && <RoutePanel />}
      </div>
    </div>
  )
}
