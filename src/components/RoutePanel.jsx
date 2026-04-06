import React from 'react'
import { motion } from 'framer-motion'
import { useApp } from '../AppContext'
import { SectionHeader } from './AmbulancePanel'

const TRAFFIC_ICONS = { LOW: '🟢', MODERATE: '🟡', HIGH: '🟠', SEVERE: '🔴' }

function RouteCard({ route, isSelected, onSelect }) {
  const { color, label, distanceKm, etaMin, trafficDelayMin, traffic, suggestion, isOptimal, rank } = route
  const barPct = Math.max(15, 100 - rank * 28)

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.06 }}
      onClick={onSelect}
      style={{
        background: '#fff',
        border: `1.5px solid ${isSelected ? color : 'rgba(200,0,24,0.12)'}`,
        borderLeft: `4px solid ${color}`,
        borderRadius: 8, marginBottom: 8, overflow: 'hidden',
        boxShadow: isSelected ? `0 3px 14px ${color}30` : '0 1px 4px rgba(0,0,0,0.04)',
        cursor: 'pointer', transition: 'all 0.2s',
      }}
    >
      {/* Top bar */}
      <div style={{ height: 3, background: '#f0f0f0' }}>
        <div style={{ height: '100%', width: `${barPct}%`, background: `linear-gradient(90deg, ${color}, ${color}aa)`, transition: 'width 0.5s' }} />
      </div>

      <div style={{ padding: '10px 12px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
            <span style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: 11, color, letterSpacing: 1 }}>{label}</span>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {isOptimal && <span style={{ background: color, color: '#fff', fontSize: 8, padding: '2px 6px', borderRadius: 10, fontWeight: 700 }}>★ SUGGESTED</span>}
            {isSelected && <span style={{ background: '#f0f0f0', color: '#555', fontSize: 8, padding: '2px 6px', borderRadius: 10, fontWeight: 700 }}>ACTIVE</span>}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 14, marginBottom: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <Stat icon="📍" label={`${distanceKm} km`} />
          <Stat icon="⏱" label={`${etaMin} min`} bold color="#333" />
          {trafficDelayMin > 0 && <Stat icon="🚦" label={`+${trafficDelayMin} min`} color="#c46000" />}
          <span style={{
            fontSize: 9, padding: '2px 7px', borderRadius: 10, fontWeight: 700,
            background: traffic?.bg ?? '#f5f5f5', color: traffic?.color ?? '#555',
            border: `1px solid ${traffic?.color ?? '#ccc'}40`,
          }}>
            {TRAFFIC_ICONS[traffic?.level]} {traffic?.level}
          </span>
        </div>

        {/* Suggestion */}
        <div style={{ fontFamily: 'Rajdhani', fontSize: 10, color: '#666', lineHeight: 1.5, marginBottom: 6 }}>
          {suggestion}
        </div>

        {/* Select button */}
        {!isSelected && (
          <button style={{
            width: '100%', padding: '5px',background: `${color}12`,
            border: `1px solid ${color}40`, color, borderRadius: 5,
            fontFamily: 'Rajdhani', fontWeight: 700, fontSize: 10, letterSpacing: 1,
            cursor: 'pointer',
          }}>
            USE THIS ROUTE
          </button>
        )}
        {isSelected && (
          <div style={{
            width: '100%', padding: '5px', background: `${color}18`,
            border: `1px solid ${color}`, color, borderRadius: 5,
            fontFamily: 'Rajdhani', fontWeight: 700, fontSize: 10, letterSpacing: 1,
            textAlign: 'center',
          }}>
            ✓ CURRENTLY USING
          </div>
        )}
      </div>
    </motion.div>
  )
}

function Stat({ icon, label, bold, color = '#888' }) {
  return (
    <span style={{ fontFamily: 'Share Tech Mono', fontSize: 9.5, color, display: 'flex', alignItems: 'center', gap: 3, fontWeight: bold ? 700 : 400 }}>
      {icon} {label}
    </span>
  )
}

export default function RoutePanel() {
  const { state, selectLeg2Route } = useApp()
  const { leg2AltRoutes, leg1AltRoutes, sosPhase, selectedLeg2RouteIdx, rerouteAvailable, ambPhase } = state

  if (sosPhase === 'idle') return (
    <div>
      <SectionHeader icon="🗺️" label="ROUTE INTELLIGENCE" />
      <div style={{
        padding: 20, borderRadius: 8, border: '1px dashed rgba(204,0,24,0.2)',
        background: '#fff5f5', textAlign: 'center',
      }}>
        <div style={{ fontSize: 30, marginBottom: 8 }}>🗺️</div>
        <div style={{ fontFamily: 'Rajdhani', fontSize: 12, color: '#8a6068', lineHeight: 1.6 }}>
          Trigger <strong style={{ color: '#cc0018' }}>SOS</strong> or click<br />
          <strong style={{ color: '#cc0018' }}>DIRECT DISPATCH</strong> to see<br />
          real-time TomTom routes & traffic
        </div>
      </div>
      <div style={{ marginTop: 14 }}>
        <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: 10, color: '#cc0018', letterSpacing: 2, marginBottom: 8 }}>◈ TRAFFIC MAP LEGEND</div>
        {[['🔴','Severe jam (>10 min delay)'],['🟠','Heavy traffic (5-10 min)'],['🟡','Moderate slowdown (1-5 min)'],['🟢','Free flow']].map(([ic,lb]) => (
          <div key={lb} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, fontFamily: 'Rajdhani', fontSize: 11, color: '#555' }}>
            <span>{ic}</span><span>{lb}</span>
          </div>
        ))}
      </div>
    </div>
  )

  const loading = leg2AltRoutes.length === 0

  return (
    <div>
      {/* Reroute alert */}
      {rerouteAvailable && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} style={{
          padding: '10px 12px', marginBottom: 10, borderRadius: 8,
          background: 'rgba(0,122,61,0.08)', border: '1.5px solid #007a3d',
        }}>
          <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: 11, color: '#007a3d', marginBottom: 3 }}>
            ⚡ Better Route Found!
          </div>
          <div style={{ fontFamily: 'Rajdhani', fontSize: 10, color: '#555' }}>
            Route updated below — select the new OPTIMAL route to reroute.
          </div>
        </motion.div>
      )}

      {/* Phase indicator */}
      <div style={{ padding: '8px 12px', marginBottom: 10, borderRadius: 8, background: '#fff', border: '1px solid rgba(204,0,24,0.15)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 16 }}>{ambPhase === 'delivered' ? '✅' : ambPhase === 'enroute_hospital' ? '⚡' : '🚑'}</span>
        <div>
          <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: 11, color: '#cc0018' }}>
            {ambPhase === 'enroute_patient'  && 'AMBULANCE → PATIENT'}
            {ambPhase === 'pickup'           && 'LOADING PATIENT'}
            {ambPhase === 'enroute_hospital' && 'PATIENT → HOSPITAL'}
            {ambPhase === 'delivered'        && 'PATIENT DELIVERED'}
          </div>
          {leg2AltRoutes[selectedLeg2RouteIdx] && ambPhase !== 'delivered' && (
            <div style={{ fontFamily: 'Share Tech Mono', fontSize: 9, color: '#888' }}>
              {leg2AltRoutes[selectedLeg2RouteIdx].distanceKm} km · ~{leg2AltRoutes[selectedLeg2RouteIdx].etaMin} min remaining
            </div>
          )}
        </div>
      </div>

      {/* Patient → Hospital routes */}
      <SectionHeader icon="🏥" label="PATIENT → HOSPITAL ROUTES" />

      {loading ? (
        <div style={{ textAlign: 'center', padding: 20, fontFamily: 'Share Tech Mono', fontSize: 10, color: '#8a6068' }}>
          Fetching TomTom real-time routes…
        </div>
      ) : (
        <>
          {leg2AltRoutes.map((r, i) => (
            <RouteCard
              key={i} route={r}
              isSelected={selectedLeg2RouteIdx === i}
              onSelect={() => selectLeg2Route(i)}
            />
          ))}

          {/* AI Recommendation */}
          {leg2AltRoutes[0] && (
            <div style={{ padding: '10px 12px', borderRadius: 8, background: 'linear-gradient(135deg, rgba(204,0,24,0.06), rgba(204,0,24,0.02))', border: '1px solid rgba(204,0,24,0.18)', marginTop: 4 }}>
              <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: 10, color: '#cc0018', marginBottom: 4 }}>💡 AI RECOMMENDATION</div>
              <div style={{ fontFamily: 'Rajdhani', fontSize: 11, color: '#333', lineHeight: 1.6 }}>
                {leg2AltRoutes[0].traffic?.level === 'SEVERE'
                  ? `Alert traffic control along ${leg2AltRoutes[0].label}. Consider ${leg2AltRoutes[1]?.label ?? 'alternative'} if worsens.`
                  : leg2AltRoutes[0].trafficDelayMin > 0
                  ? `OPTIMAL route has ${leg2AltRoutes[0].trafficDelayMin} min delay. Using fastest available path.`
                  : `${leg2AltRoutes[0].label} is completely clear. Maintain current route.`}
              </div>
            </div>
          )}
        </>
      )}

      {/* Ambulance → Patient routes (secondary) */}
      {leg1AltRoutes.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <SectionHeader icon="🚑" label="AMBULANCE → PATIENT ROUTES" />
          {leg1AltRoutes.slice(0, 2).map((r, i) => (
            <RouteCard key={i} route={r} isSelected={i === 0} onSelect={() => {}} />
          ))}
        </div>
      )}
    </div>
  )
}
